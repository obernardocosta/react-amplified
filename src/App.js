/* src/App.js */
import React, { useEffect, useState } from 'react'
import { withAuthenticator } from '@aws-amplify/ui-react'
import Amplify, { API, graphqlOperation, input } from 'aws-amplify'
import { createTodo } from './graphql/mutations'
import { listTodos } from './graphql/queries'

import { Storage } from 'aws-amplify';
import awsconfig from './aws-exports';

import awsExports from "./aws-exports";

Amplify.configure(awsconfig);
Amplify.configure(awsExports);

const initialState = { name: '', description: '' }

const App = () => {
  const [formState, setFormState] = useState(initialState)
  const [todos, setTodos] = useState([])

  useEffect(() => {
    fetchTodos()
  }, [])

  async function onChange(e) {
    const file = e.target.files[0];
    try {
      await Storage.put(file.name, 'Private Content', {
        level: 'private',
        contentType: 'text/plain'
    });
    } catch (error) {
      console.log('Error uploading file: ', error);
    }  
  }
  
  function setInput(key, value) {
    setFormState({ ...formState, [key]: value })
  }

  function listFiles(){
    Storage.list('', { level: 'private' })
      .then(result => processStorageList(result))
      .catch(err => console.log(err));
  }

  function processStorageList(results) {
    const filesystem = {}
    // https://stackoverflow.com/questions/44759750/how-can-i-create-a-nested-object-representation-of-a-folder-structure
    const add = (source, target, item) => {
      const elements = source.split("/");
      const element = elements.shift();
      if (!element) return // blank
      target[element] = target[element] || {__data: item}// element;
      if (elements.length) {
        target[element] = typeof target[element] === "object" ? target[element] : {};
        add(elements.join("/"), target[element], item);
      }
    };
    results.forEach(item => add(item.key, filesystem, item));
    return console.log(filesystem);
  }

  async function fetchTodos() {
    try {
      const todoData = await API.graphql(graphqlOperation(listTodos))
      const todos = todoData.data.listTodos.items
      setTodos(todos)
    } catch (err) { console.log('error fetching todos') }
  }

  
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'download';
    const clickHandler = () => {
      setTimeout(() => {
        URL.revokeObjectURL(url);
        a.removeEventListener('click', clickHandler);
      }, 150);
    };
    a.addEventListener('click', clickHandler, false);
    a.click();
    return a;
  }
  
  // usage
  async function download() {
    const result = await Storage.get('glue.jpeg', { download: true });
    downloadBlob(result.Body, 'testando-download');
  }

  async function addTodo() {
    try {
      if (!formState.name || !formState.description) return
      const todo = { ...formState }
      setTodos([...todos, todo])
      setFormState(initialState)
      await API.graphql(graphqlOperation(createTodo, {input: todo}))
    } catch (err) {
      console.log('error creating todo:', err)
    }
  }

  return (
    <div style={styles.container}>
      <h2>Amplify Todos</h2>
      <input
        onChange={event => setInput('name', event.target.value)}
        style={styles.input}
        value={formState.name}
        placeholder="Name"
      />
      <input
        onChange={event => setInput('description', event.target.value)}
        style={styles.input}
        value={formState.description}
        placeholder="Description"
      />
      <button style={styles.button} onClick={addTodo}>Create Todo</button>
      {
        todos.map((todo, index) => (
          <div key={todo.id ? todo.id : index} style={styles.todo}>
            <p style={styles.todoName}>{todo.name}</p>
            <p style={styles.todoDescription}>{todo.description}</p>
          </div>
        ))
      }
      <input
        type="file"
        onChange={onChange}
      />
      <input
        type="submit"
        value="list"
        onClick={listFiles}
      />
      <input
        type="submit"
        value="download"
        onClick={download}
      />
    </div>
  )
}

const styles = {
  container: { width: 400, margin: '0 auto', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 20 },
  todo: {  marginBottom: 15 },
  input: { border: 'none', backgroundColor: '#ddd', marginBottom: 10, padding: 8, fontSize: 18 },
  todoName: { fontSize: 20, fontWeight: 'bold' },
  todoDescription: { marginBottom: 0 },
  button: { backgroundColor: 'black', color: 'white', outline: 'none', fontSize: 18, padding: '12px 0px' }
}

export default withAuthenticator(App)
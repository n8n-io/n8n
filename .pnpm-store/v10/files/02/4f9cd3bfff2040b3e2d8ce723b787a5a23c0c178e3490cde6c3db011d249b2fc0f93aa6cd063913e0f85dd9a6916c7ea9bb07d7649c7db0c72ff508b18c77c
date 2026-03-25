// Copyright 2024 Roy T. Hashimoto. All Rights Reserved.

// This is the path to the Monaco editor distribution. For development
// this loads from the local server (uses Yarn 2 path).
const MONACO_VS = location.hostname.endsWith('localhost') ?
  '/.yarn/unplugged/monaco-editor-npm-0.34.1-03d887d213/node_modules/monaco-editor/dev/vs' :
  'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.34.1/min/vs';

const SQL_KEY = 'wa-sqlite demo sql';
const DEFAULT_SQL = `
-- Optionally select statements to execute.

CREATE TABLE IF NOT EXISTS t(x PRIMARY KEY, y);
INSERT OR REPLACE INTO t VALUES ('good', 'bad'), ('hot', 'cold'), ('up', 'down');
SELECT * FROM t;
`.trim();

window.addEventListener('DOMContentLoaded', async function() {
  // Load the Monaco editor
  const button = /** @type {HTMLButtonElement} */(document.getElementById('execute'));
  const editorReady = createMonacoEditor().then(editor => {
    // Change the button text with selection.
    editor.onDidChangeCursorSelection(({selection}) => {
      button.textContent = selection.isEmpty() ?
        'Execute' :
        'Execute selection';
    });

    // Persist editor content across page loads.
    let change;
    editor.onDidChangeModelContent(function() {
      clearTimeout(change);
      change = setTimeout(function() {
        localStorage.setItem(SQL_KEY, editor.getValue());
      }, 1000);
    });
    editor.setValue(localStorage.getItem(SQL_KEY) ?? DEFAULT_SQL);

    return editor;
  });

  // Start the Worker.
  // Propagate the main page search parameters to the Worker URL.
  const workerURL = new URL('./demo-worker.js', import.meta.url);
  workerURL.search = location.search;
  const worker = new Worker(workerURL, { type: 'module' });
  worker.addEventListener('message', function(event) {
    // The Worker will response with null on successful start, or with
    // an error message on failure.
    if (event.data) {
      document.getElementById('output').innerHTML = `<pre>${event.data.error.stack}</pre>`;
    } else {
      document.getElementById('output').innerHTML =
        JSON.stringify([...new URLSearchParams(location.search).entries()]);
      button.disabled = false;
    }
  }, { once: true });

  // Execute SQL on button click.
  button.addEventListener('click', async function() {
    button.disabled = true;

    // Get SQL from editor.
    const editor = await editorReady;
    const selection = editor.getSelection();
    const queries = selection.isEmpty() ?
      editor.getValue() :
      editor.getModel().getValueInRange(selection);

    // Clear any previous output on the page.
    const output = document.getElementById('output');
    while (output.firstChild) output.removeChild(output.lastChild);

    const timestamp = document.getElementById('timestamp');
    timestamp.textContent = new Date().toLocaleTimeString();

    let time = performance.now();
    worker.postMessage(queries);
    worker.addEventListener('message', async function(event) {
      timestamp.textContent += ` ${(performance.now() - time).toFixed(1)} milliseconds`;
      if (event.data.results) {
        // Format the results as tables.
        event.data.results
          .map(formatTable)
          .forEach(table => output.append(table));        
      } else {
        output.innerHTML = `<pre>${event.data.error.message}</pre>`;
      }
      button.disabled = false;
    }, { once: true });
  });
});

async function createMonacoEditor() {
  // Insert a script element to bootstrap the monaco loader.
  await new Promise(resolve => {
    const loader = document.createElement('script');
    loader.src = `${MONACO_VS}/loader.js`;
    loader.async = true;
    loader.addEventListener('load', resolve, { once: true });
    document.head.appendChild(loader);
  });

  // Load monaco itself.
  /** @type {any} */ const require = globalThis.require;
  require.config({ paths: { vs: MONACO_VS } });
  const monaco = await new Promise(resolve => {
    require(['vs/editor/editor.main'], resolve);
  });

  // Create editor.
  // https://microsoft.github.io/monaco-editor/api/modules/monaco.editor.html#create
  return monaco.editor.create(document.getElementById('editor-container'), {
    language: 'sql',
    minimap: { enabled: false },
    automaticLayout: true
  });
}

function formatTable({ columns, rows }) {
  const table = document.createElement('table');

  const thead = table.appendChild(document.createElement('thead'));
  thead.appendChild(formatRow(columns, 'th'));

  const tbody = table.appendChild(document.createElement('tbody'));
  for (const row of rows) {
    tbody.appendChild(formatRow(row));
  }

  return table;
}

function formatRow(data, tag = 'td') {
  const row = document.createElement('tr');
  for (const value of data) {
    const cell = row.appendChild(document.createElement(tag));
    cell.textContent = value !== null ? value.toString() : 'null';
  }
  return row;
}
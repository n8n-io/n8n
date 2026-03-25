const WORKER_URL = 'contention-worker.js';
const BROADCAST_CHANNEL_NAME = 'contention';

const searchParams = new URLSearchParams(globalThis.location.search);

const queries = JSON.parse(localStorage.getItem('contention') ?? 'null') || {
  global: `
    BEGIN IMMEDIATE;
    CREATE TABLE kv(key PRIMARY KEY, value);
    REPLACE INTO kv VALUES ('counter', 0);
    COMMIT;
  `.split('\n').map(line => line.replace(/^[ ]{4}/, '')).join('\n').trim(),

  connection: `
    PRAGMA synchronous = NORMAL;
  `.split('\n').map(line => line.replace(/^[ ]{4}/, '')).join('\n').trim(),

  writer: `
    BEGIN IMMEDIATE;
    UPDATE kv SET value = value + 1 WHERE key='counter';
    COMMIT;
  `.split('\n').map(line => line.replace(/^[ ]{4}/, '')).join('\n').trim(),

  reader: `
    SELECT max(rowid) FROM kv;
  `.split('\n').map(line => line.replace(/^[ ]{4}/, '')).join('\n').trim(),
};

for (const name of Object.keys(queries)) {
  const element = /** @type {HTMLTextAreaElement} */ (document.getElementById(name));
  element.value = queries[name]; 
  element.addEventListener('keyup', event => {
    // @ts-ignore
    queries[name] = event.target.value;
    localStorage.setItem('contention', JSON.stringify(queries));
  });
}

const build = searchParams.get('build') ?? 'default';
const config = searchParams.get('config') ?? 'default';
const nWriters = Number(searchParams.get('nWriters') ?? 1);
const nReaders = Number(searchParams.get('nReaders') ?? 1);
const nSeconds = Number(searchParams.get('nSeconds') ?? 10);
log(`build: ${build}`);
log(`config: ${config}`);
log(`nWriters: ${nWriters}`);
log(`nReaders: ${nReaders}`);
log(`nSeconds: ${nSeconds}`);

function log(item) {
  const element = document.createElement('pre');

  let text;
  if (typeof item === 'string') {
    text = item;
  } else if (item.error) {
    element.style.color = 'red';
    text = item.error.message;
  } else if (item) {
    element.style.color = 'green';
    text = JSON.stringify(item);
  } else {
    return;
  }

  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  const milliseconds = now.getMilliseconds().toString().padStart(3, '0');
  const timestamp = `${hours}:${minutes}:${seconds}.${milliseconds}`;

  element.textContent = `[${timestamp}] ${text}`;
  document.getElementById('output').appendChild(element);
}

document.getElementById('start').addEventListener('click', async event => {
  try {
    // @ts-ignore
    event.target.disabled = true;

    const broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);

    log('launch workers');
    const workers = Array.from({ length: nWriters + nReaders }, (_, i) => {
      const url = new URL(WORKER_URL, import.meta.url);
      url.searchParams.set('index', i.toString());
      url.searchParams.set('type', i < nWriters ? 'writer' : 'reader');

      const worker = new Worker(url, { type: 'module' });
      worker.addEventListener('message', event => {
        if (event.data) {
          log(event.data);
        }
      });
      return worker;
    });
    await syncWorkers(workers);

    broadcastChannel.postMessage({
      build,
      config,
      queries
    });
    await syncWorkers(workers);

    log('start')
    broadcastChannel.postMessage({ endTime: Date.now() + nSeconds * 1000 });
    await syncWorkers(workers);

    log('complete');
    workers.forEach(worker => worker.terminate());

    const demo = document.getElementById('demo');
    demo.innerHTML = `
      <a href="../index.html?build=${build}&config=${config}" target="_blank">
        Open SQL demo
      </a>
      (close demo before rerunning contention test)
    `;
  } catch (e) {
    console.error(e);
    log({ error: e });
  } finally {
    // @ts-ignore
    event.target.disabled = false;
  }
});

document.getElementById('reset').addEventListener('click', async event => {
  localStorage.removeItem('contention');
  window.location.reload();
});

function syncWorkers(workers) {
  return Promise.all(workers.map(worker => new Promise(resolve => {
    const abortController = new AbortController();
    worker.addEventListener('message', event => {
      if (event.data === null) {
        resolve();
        abortController.abort();
      }
    }, { signal: abortController.signal });
  })));
}
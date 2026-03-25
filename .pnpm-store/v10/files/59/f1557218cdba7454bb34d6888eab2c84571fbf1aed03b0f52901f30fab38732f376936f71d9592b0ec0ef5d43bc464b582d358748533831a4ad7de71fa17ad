document.getElementById('run').addEventListener('click', async function(event) {
  const button = /** @type {HTMLButtonElement} */(event.target);
  button.disabled = true;

  // @ts-ignore
  const nWorkers = parseInt(document.getElementById('nWorkers').value);
  // @ts-ignore
  const writeHint = document.getElementById('writeHint').checked;
  // @ts-ignore
  const preamble = document.getElementById('preamble').value;
  // @ts-ignore
  const transaction = document.getElementById('transaction').value;

  let startTime = 0;
  const workers = [];
  try {
    await new Promise(resolve => {
      navigator.locks.request('reset', () => {
        resolve();
        return new Promise(() => {});
      }).catch(() => {});
    });
    for (let i = 0; i < nWorkers; i++) {
      const worker = new Worker('worker.js', { type: 'module' });
      workers.push(worker);
    }
    await Promise.all(workers.map((worker, index) => {
      return new Promise(resolve => {
        worker.postMessage({ index, writeHint, preamble, transaction });
        worker.addEventListener('message', resolve, { once: true });
      });
    }));

    log(`start ${JSON.stringify({ nWorkers, writeHint })}`);
    startTime = performance.now();
    new BroadcastChannel('write_hint').postMessage('start');
    const results = await Promise.all(workers.map((worker, index) => {
      return new Promise(resolve => {
        worker.addEventListener('message', event => {
          log(JSON.stringify(event.data));
          resolve(event.data);
        }, { once: true });
      });
    }));
  } finally {
    log(`complete ${Math.round(performance.now() - startTime)} ms`);
    for (const worker of workers) {
      worker.terminate();
    }
    button.disabled = false;
  }
});

function log(text) {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  const milliseconds = now.getMilliseconds().toString().padStart(3, '0');
  const timestamp = `${hours}:${minutes}:${seconds}.${milliseconds}`;

  const element = document.createElement('pre');
  element.textContent = `[${timestamp}] ${text}`;

  const output = document.getElementById('output');
  output.appendChild(element);
}
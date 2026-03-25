// Copyright 2024 Roy T. Hashimoto. All Rights Reserved.

const searchParams = new URLSearchParams(location.search);

// Load benchmark SQL from files.
const benchmarksReady = Promise.all(Array.from(new Array(16), (_, i) => {
  const filename = `./benchmark${i + 1}.sql`;
  return fetch(filename).then(response => response.text());
}));

// Parse configurations from the URL and add table columns.
const CONFIGURATIONS = (searchParams.get('config') ?? 'default,')
  .split(';')
  .map(config => config.split(','));
const headers = document.querySelector('thead').firstElementChild;
for (const config of CONFIGURATIONS) {
  addEntry(headers, config.join(' '));
}

document.getElementById('start').addEventListener('click', async event => {
  // @ts-ignore
  event.target.disabled = true;

  // Clear timings from the table.
  Array.from(document.getElementsByTagName('tr'), element => {
    if (element.parentElement.tagName === 'TBODY') {
      // Keep only the first child.
      while (element.firstElementChild.nextElementSibling) {
        element.firstElementChild.nextElementSibling.remove();
      }
    }
  });

  const benchmarks = await benchmarksReady;
  try {
    // @ts-ignore
    const preamble = document.getElementById('preamble').value;
    document.getElementById('error').textContent = '';
    for (const config of CONFIGURATIONS) {
      const workerURL = new URL('../demo-worker.js', import.meta.url);
      workerURL.searchParams.set('reset', 'true');
      workerURL.searchParams.set('build', config[0]);
      workerURL.searchParams.set('config', config[1]);
      const worker = new Worker(workerURL, { type: 'module' });
      try {
        await Promise.race([
          new Promise((resolve, reject) => {
            worker.addEventListener('message', event => {
              if (event.data?.error) {
                reject(cvtCloneableToError(event.data.error));
              } else {
                resolve();
              }
            }, { once: true });
          }),
          new Promise((_, reject) => setTimeout(() => {
            reject(new Error(`Worker initialization timeout`));
          }, 1000_5000))
        ]);


        // Execute the preamble.
        await query(worker, preamble);

        // Loop over the benchmarks.
        let tr = document.querySelector('tbody').firstElementChild;
        for (const benchmark of benchmarks) {
          const results = await query(worker, benchmark);
          if (results.error) {
            throw cvtCloneableToError(results.error);
          }

          addEntry(tr, results.elapsed.toString());
          tr = tr.nextElementSibling;
        }
      } finally {
        worker.terminate();
      }
    }
  } catch (e) {
    document.getElementById('error').textContent = e.stack.includes(e.message) ? e.stack : `${e.message}\n${e.stack}`;
  } finally {
    // @ts-ignore
    event.target.disabled = false;
  }
});

function addEntry(parent, text) {
  const tag = parent.parentElement.tagName === 'TBODY' ? 'td' : 'th';
  const child = document.createElement(tag);
  child.textContent = text;
  parent.appendChild(child);
}

async function query(worker, sql) {
  worker.postMessage(sql);
  return new Promise((resolve, reject) => {
    worker.addEventListener('message', event => {
      if (event.data?.error) {
        reject(cvtCloneableToError(event.data.error));
      } else {
        resolve(event.data);
      }
    }, { once: true });
  });
}

function cvtCloneableToError(e) {
  if (Object.hasOwn(e, 'message')) {
    const error = new Error(e.message);
    for (const [k, v] of Object.entries(e)) {
      try {
        error[k] = v;
      } catch (e) {
        // Ignore any properties that can't be set.
      }
    }
    return error;
  }
  return e;
}
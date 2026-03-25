'use strict';

const assert = require('assert');
const cp = require('child_process');

// Clocks the time taken to execute a test per cycle (secs).
function clock(count, fn) {
  const start = process.hrtime.bigint();
  for (let i = 0; i < count; ++i) {
    fn();
  }
  return Number(process.hrtime.bigint() - start);
}

async function clockAsync(count, fn) {
  const start = process.hrtime.bigint();
  for (let i = 0; i < count; ++i) {
    await fn();
  }
  return Number(process.hrtime.bigint() - start);
}

if (require.main === module) {
  const modulePath = process.env.BENCHMARK_MODULE_PATH;
  assert(typeof modulePath === 'string');
  assert(process.send);
  const module = require(modulePath);

  if (module.setupAsync) {
    await module.setupAsync();
  }

  if (module.measureAsync) {
    async function run() {
      await clockAsync(7, module.measureAsync); // warm up
      global.gc();
      process.nextTick(async () => {
        const memBaseline = process.memoryUsage().heapUsed;
        const clocked = await clockAsync(module.count, module.measureAsync);
        process.send({
          name: module.name,
          clocked: clocked / module.count,
          memUsed: (process.memoryUsage().heapUsed - memBaseline) / module.count,
        });
      });
    }
    run();
  } else {
    clock(7, module.measure); // warm up
    global.gc();
    process.nextTick(() => {
      const memBaseline = process.memoryUsage().heapUsed;
      const clocked = clock(module.count, module.measure);
      process.send({
        name: module.name,
        clocked: clocked / module.count,
        memUsed: (process.memoryUsage().heapUsed - memBaseline) / module.count,
      });
    });
  }
}

function sampleModule(modulePath) {
  return new Promise((resolve, reject) => {
    const env = {
      NODE_ENV: 'production',
      BENCHMARK_MODULE_PATH: modulePath,
    };
    const child = cp.fork(__filename, { env });
    let message;
    let error;

    child.on('message', (msg) => (message = msg));
    child.on('error', (e) => (error = e));
    child.on('close', () => {
      if (message) {
        return resolve(message);
      }
      reject(error || new Error('Forked process closed without error'));
    });
  }).then((result) => {
    global.gc();
    return result;
  });
}

module.exports = { sampleModule };

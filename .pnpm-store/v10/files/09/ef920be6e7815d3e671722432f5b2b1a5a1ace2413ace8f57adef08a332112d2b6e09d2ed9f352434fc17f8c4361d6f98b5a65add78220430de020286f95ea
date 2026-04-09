// Test for thread-safety issues caused by subsequent imports of the module
// in worker threads: https://github.com/mscdex/ssh2/issues/1393.
// Each subsequent worker increases probability of abnormal termination.
// The probability of a false pass due to zero response becomes negligible
// for 4 consecutive workers.
'use strict';

let Worker, isMainThread;
try {
  ({ Worker, isMainThread } = require('worker_threads'));
} catch (e) {
  if (e.code !== 'MODULE_NOT_FOUND') throw e;
  process.exit(0);
}
require('../lib/index.js');

if (isMainThread) {
  async function runWorker() {
    return new Promise((r) => new Worker(__filename).on('exit', r));
  }
  runWorker()
    .then(runWorker)
    .then(runWorker)
    .then(runWorker);
}

'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = void 0;
function _mergeStream() {
  const data = _interopRequireDefault(require('merge-stream'));
  _mergeStream = function () {
    return data;
  };
  return data;
}
var _types = require('../types');
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {default: obj};
}
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// How long to wait for the child process to terminate
// after CHILD_MESSAGE_END before sending force exiting.
const FORCE_EXIT_DELAY = 500;

/* istanbul ignore next */
// eslint-disable-next-line @typescript-eslint/no-empty-function
const emptyMethod = () => {};
class BaseWorkerPool {
  _stderr;
  _stdout;
  _options;
  _workers;
  _workerPath;
  constructor(workerPath, options) {
    this._options = options;
    this._workerPath = workerPath;
    this._workers = new Array(options.numWorkers);
    const stdout = (0, _mergeStream().default)();
    const stderr = (0, _mergeStream().default)();
    const {forkOptions, maxRetries, resourceLimits, setupArgs} = options;
    for (let i = 0; i < options.numWorkers; i++) {
      const workerOptions = {
        forkOptions,
        idleMemoryLimit: this._options.idleMemoryLimit,
        maxRetries,
        resourceLimits,
        setupArgs,
        workerId: i,
        workerPath
      };
      const worker = this.createWorker(workerOptions);
      const workerStdout = worker.getStdout();
      const workerStderr = worker.getStderr();
      if (workerStdout) {
        stdout.add(workerStdout);
      }
      if (workerStderr) {
        stderr.add(workerStderr);
      }
      this._workers[i] = worker;
    }
    this._stdout = stdout;
    this._stderr = stderr;
  }
  getStderr() {
    return this._stderr;
  }
  getStdout() {
    return this._stdout;
  }
  getWorkers() {
    return this._workers;
  }
  getWorkerById(workerId) {
    return this._workers[workerId];
  }
  restartWorkerIfShutDown(workerId) {
    if (this._workers[workerId].state === _types.WorkerStates.SHUT_DOWN) {
      const {forkOptions, maxRetries, resourceLimits, setupArgs} =
        this._options;
      const workerOptions = {
        forkOptions,
        idleMemoryLimit: this._options.idleMemoryLimit,
        maxRetries,
        resourceLimits,
        setupArgs,
        workerId,
        workerPath: this._workerPath
      };
      const worker = this.createWorker(workerOptions);
      this._workers[workerId] = worker;
    }
  }
  createWorker(_workerOptions) {
    throw Error('Missing method createWorker in WorkerPool');
  }
  async start() {
    await Promise.all(
      this._workers.map(async worker => {
        await worker.waitForWorkerReady();
        await new Promise((resolve, reject) => {
          worker.send(
            [_types.CHILD_MESSAGE_CALL_SETUP],
            emptyMethod,
            error => {
              if (error) {
                reject(error);
              } else {
                resolve();
              }
            },
            emptyMethod
          );
        });
      })
    );
  }
  async end() {
    // We do not cache the request object here. If so, it would only be only
    // processed by one of the workers, and we want them all to close.
    const workerExitPromises = this._workers.map(async worker => {
      worker.send(
        [_types.CHILD_MESSAGE_END, false],
        emptyMethod,
        emptyMethod,
        emptyMethod
      );

      // Schedule a force exit in case worker fails to exit gracefully so
      // await worker.waitForExit() never takes longer than FORCE_EXIT_DELAY
      let forceExited = false;
      const forceExitTimeout = setTimeout(() => {
        worker.forceExit();
        forceExited = true;
      }, FORCE_EXIT_DELAY);
      await worker.waitForExit();
      // Worker ideally exited gracefully, don't send force exit then
      clearTimeout(forceExitTimeout);
      return forceExited;
    });
    const workerExits = await Promise.all(workerExitPromises);
    return workerExits.reduce(
      (result, forceExited) => ({
        forceExited: result.forceExited || forceExited
      }),
      {
        forceExited: false
      }
    );
  }
}
exports.default = BaseWorkerPool;

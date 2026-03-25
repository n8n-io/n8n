'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = void 0;
function _os() {
  const data = require('os');
  _os = function () {
    return data;
  };
  return data;
}
function _worker_threads() {
  const data = require('worker_threads');
  _worker_threads = function () {
    return data;
  };
  return data;
}
function _mergeStream() {
  const data = _interopRequireDefault(require('merge-stream'));
  _mergeStream = function () {
    return data;
  };
  return data;
}
var _types = require('../types');
var _WorkerAbstract = _interopRequireDefault(require('./WorkerAbstract'));
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {default: obj};
}
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

class ExperimentalWorker extends _WorkerAbstract.default {
  _worker;
  _options;
  _request;
  _retries;
  _onProcessEnd;
  _onCustomMessage;
  _stdout;
  _stderr;
  _memoryUsagePromise;
  _resolveMemoryUsage;
  _childWorkerPath;
  _childIdleMemoryUsage;
  _childIdleMemoryUsageLimit;
  _memoryUsageCheck = false;
  constructor(options) {
    super(options);
    this._options = options;
    this._request = null;
    this._stdout = null;
    this._stderr = null;
    this._childWorkerPath =
      options.childWorkerPath || require.resolve('./threadChild');
    this._childIdleMemoryUsage = null;
    this._childIdleMemoryUsageLimit = options.idleMemoryLimit || null;
    this.initialize();
  }
  initialize() {
    if (
      this.state === _types.WorkerStates.OUT_OF_MEMORY ||
      this.state === _types.WorkerStates.SHUTTING_DOWN ||
      this.state === _types.WorkerStates.SHUT_DOWN
    ) {
      return;
    }
    if (this._worker) {
      this._worker.terminate();
    }
    this.state = _types.WorkerStates.STARTING;
    this._worker = new (_worker_threads().Worker)(this._childWorkerPath, {
      eval: false,
      resourceLimits: this._options.resourceLimits,
      stderr: true,
      stdout: true,
      workerData: this._options.workerData,
      ...this._options.forkOptions
    });
    if (this._worker.stdout) {
      if (!this._stdout) {
        // We need to add a permanent stream to the merged stream to prevent it
        // from ending when the subprocess stream ends
        this._stdout = (0, _mergeStream().default)(this._getFakeStream());
      }
      this._stdout.add(this._worker.stdout);
    }
    if (this._worker.stderr) {
      if (!this._stderr) {
        // We need to add a permanent stream to the merged stream to prevent it
        // from ending when the subprocess stream ends
        this._stderr = (0, _mergeStream().default)(this._getFakeStream());
      }
      this._stderr.add(this._worker.stderr);
    }

    // This can be useful for debugging.
    if (!(this._options.silent ?? true)) {
      this._worker.stdout.setEncoding('utf8');
      // eslint-disable-next-line no-console
      this._worker.stdout.on('data', console.log);
      this._worker.stderr.setEncoding('utf8');
      this._worker.stderr.on('data', console.error);
    }
    this._worker.on('message', this._onMessage.bind(this));
    this._worker.on('exit', this._onExit.bind(this));
    this._worker.on('error', this._onError.bind(this));
    this._worker.postMessage([
      _types.CHILD_MESSAGE_INITIALIZE,
      false,
      this._options.workerPath,
      this._options.setupArgs,
      String(this._options.workerId + 1) // 0-indexed workerId, 1-indexed JEST_WORKER_ID
    ]);

    this._retries++;

    // If we exceeded the amount of retries, we will emulate an error reply
    // coming from the child. This avoids code duplication related with cleaning
    // the queue, and scheduling the next call.
    if (this._retries > this._options.maxRetries) {
      const error = new Error('Call retries were exceeded');
      this._onMessage([
        _types.PARENT_MESSAGE_CLIENT_ERROR,
        error.name,
        error.message,
        error.stack,
        {
          type: 'WorkerError'
        }
      ]);
    }
    this.state = _types.WorkerStates.OK;
    if (this._resolveWorkerReady) {
      this._resolveWorkerReady();
    }
  }
  _onError(error) {
    if (error.message.includes('heap out of memory')) {
      this.state = _types.WorkerStates.OUT_OF_MEMORY;

      // Threads don't behave like processes, they don't crash when they run out of
      // memory. But for consistency we want them to behave like processes so we call
      // terminate to simulate a crash happening that was not planned
      this._worker.terminate();
    }
  }
  _onMessage(response) {
    // Ignore messages not intended for us
    if (!Array.isArray(response)) return;
    let error;
    switch (response[0]) {
      case _types.PARENT_MESSAGE_OK:
        this._onProcessEnd(null, response[1]);
        break;
      case _types.PARENT_MESSAGE_CLIENT_ERROR:
        error = response[4];
        if (error != null && typeof error === 'object') {
          const extra = error;
          // @ts-expect-error: no index
          const NativeCtor = globalThis[response[1]];
          const Ctor = typeof NativeCtor === 'function' ? NativeCtor : Error;
          error = new Ctor(response[2]);
          error.type = response[1];
          error.stack = response[3];
          for (const key in extra) {
            // @ts-expect-error: no index
            error[key] = extra[key];
          }
        }
        this._onProcessEnd(error, null);
        break;
      case _types.PARENT_MESSAGE_SETUP_ERROR:
        error = new Error(`Error when calling setup: ${response[2]}`);

        // @ts-expect-error: adding custom properties to errors.
        error.type = response[1];
        error.stack = response[3];
        this._onProcessEnd(error, null);
        break;
      case _types.PARENT_MESSAGE_CUSTOM:
        this._onCustomMessage(response[1]);
        break;
      case _types.PARENT_MESSAGE_MEM_USAGE:
        this._childIdleMemoryUsage = response[1];
        if (this._resolveMemoryUsage) {
          this._resolveMemoryUsage(response[1]);
          this._resolveMemoryUsage = undefined;
          this._memoryUsagePromise = undefined;
        }
        this._performRestartIfRequired();
        break;
      default:
        // Ignore messages not intended for us
        break;
    }
  }
  _onExit(exitCode) {
    this._workerReadyPromise = undefined;
    this._resolveWorkerReady = undefined;
    if (exitCode !== 0 && this.state === _types.WorkerStates.OUT_OF_MEMORY) {
      this._onProcessEnd(
        new Error('Jest worker ran out of memory and crashed'),
        null
      );
      this._shutdown();
    } else if (
      (exitCode !== 0 &&
        this.state !== _types.WorkerStates.SHUTTING_DOWN &&
        this.state !== _types.WorkerStates.SHUT_DOWN) ||
      this.state === _types.WorkerStates.RESTARTING
    ) {
      this.initialize();
      if (this._request) {
        this._worker.postMessage(this._request);
      }
    } else {
      // If the worker thread exits while a request is still pending, throw an
      // error. This is unexpected and tests may not have run to completion.
      const isRequestStillPending = !!this._request;
      if (isRequestStillPending) {
        this._onProcessEnd(
          new Error(
            'A Jest worker thread exited unexpectedly before finishing tests for an unknown reason. One of the ways this can happen is if process.exit() was called in testing code.'
          ),
          null
        );
      }
      this._shutdown();
    }
  }
  waitForExit() {
    return this._exitPromise;
  }
  forceExit() {
    this.state = _types.WorkerStates.SHUTTING_DOWN;
    this._worker.terminate();
  }
  send(request, onProcessStart, onProcessEnd, onCustomMessage) {
    onProcessStart(this);
    this._onProcessEnd = (...args) => {
      const hasRequest = !!this._request;

      // Clean the request to avoid sending past requests to workers that fail
      // while waiting for a new request (timers, unhandled rejections...)
      this._request = null;
      if (this._childIdleMemoryUsageLimit && hasRequest) {
        this.checkMemoryUsage();
      }
      const res = onProcessEnd?.(...args);

      // Clean up the reference so related closures can be garbage collected.
      onProcessEnd = null;
      return res;
    };
    this._onCustomMessage = (...arg) => onCustomMessage(...arg);
    this._request = request;
    this._retries = 0;
    this._worker.postMessage(request);
  }
  getWorkerId() {
    return this._options.workerId;
  }
  getStdout() {
    return this._stdout;
  }
  getStderr() {
    return this._stderr;
  }
  _performRestartIfRequired() {
    if (this._memoryUsageCheck) {
      this._memoryUsageCheck = false;
      let limit = this._childIdleMemoryUsageLimit;

      // TODO: At some point it would make sense to make use of
      // stringToBytes found in jest-config, however as this
      // package does not have any dependencies on an other jest
      // packages that can wait until some other time.
      if (limit && limit > 0 && limit <= 1) {
        limit = Math.floor((0, _os().totalmem)() * limit);
      } else if (limit) {
        limit = Math.floor(limit);
      }
      if (
        limit &&
        this._childIdleMemoryUsage &&
        this._childIdleMemoryUsage > limit
      ) {
        this.state = _types.WorkerStates.RESTARTING;
        this._worker.terminate();
      }
    }
  }

  /**
   * Gets the last reported memory usage.
   *
   * @returns Memory usage in bytes.
   */
  getMemoryUsage() {
    if (!this._memoryUsagePromise) {
      let rejectCallback;
      const promise = new Promise((resolve, reject) => {
        this._resolveMemoryUsage = resolve;
        rejectCallback = reject;
      });
      this._memoryUsagePromise = promise;
      if (!this._worker.threadId) {
        rejectCallback(new Error('Child process is not running.'));
        this._memoryUsagePromise = undefined;
        this._resolveMemoryUsage = undefined;
        return promise;
      }
      try {
        this._worker.postMessage([_types.CHILD_MESSAGE_MEM_USAGE]);
      } catch (err) {
        this._memoryUsagePromise = undefined;
        this._resolveMemoryUsage = undefined;
        rejectCallback(err);
      }
      return promise;
    }
    return this._memoryUsagePromise;
  }

  /**
   * Gets updated memory usage and restarts if required
   */
  checkMemoryUsage() {
    if (this._childIdleMemoryUsageLimit) {
      this._memoryUsageCheck = true;
      this._worker.postMessage([_types.CHILD_MESSAGE_MEM_USAGE]);
    } else {
      console.warn(
        'Memory usage of workers can only be checked if a limit is set'
      );
    }
  }

  /**
   * Gets the thread id of the worker.
   *
   * @returns Thread id.
   */
  getWorkerSystemId() {
    return this._worker.threadId;
  }
  isWorkerRunning() {
    return this._worker.threadId >= 0;
  }
}
exports.default = ExperimentalWorker;

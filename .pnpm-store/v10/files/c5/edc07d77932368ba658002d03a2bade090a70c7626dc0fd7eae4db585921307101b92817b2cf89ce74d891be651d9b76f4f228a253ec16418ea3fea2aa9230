'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
Object.defineProperty(exports, 'FifoQueue', {
  enumerable: true,
  get: function () {
    return _FifoQueue.default;
  }
});
Object.defineProperty(exports, 'PriorityQueue', {
  enumerable: true,
  get: function () {
    return _PriorityQueue.default;
  }
});
exports.Worker = void 0;
Object.defineProperty(exports, 'messageParent', {
  enumerable: true,
  get: function () {
    return _messageParent.default;
  }
});
function _os() {
  const data = require('os');
  _os = function () {
    return data;
  };
  return data;
}
function _path() {
  const data = require('path');
  _path = function () {
    return data;
  };
  return data;
}
function _url() {
  const data = require('url');
  _url = function () {
    return data;
  };
  return data;
}
var _Farm = _interopRequireDefault(require('./Farm'));
var _WorkerPool = _interopRequireDefault(require('./WorkerPool'));
var _PriorityQueue = _interopRequireDefault(require('./PriorityQueue'));
var _FifoQueue = _interopRequireDefault(require('./FifoQueue'));
var _messageParent = _interopRequireDefault(require('./workers/messageParent'));
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {default: obj};
}
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

function getExposedMethods(workerPath, options) {
  let exposedMethods = options.exposedMethods;

  // If no methods list is given, try getting it by auto-requiring the module.
  if (!exposedMethods) {
    const module = require(workerPath);
    exposedMethods = Object.keys(module).filter(
      name => typeof module[name] === 'function'
    );
    if (typeof module === 'function') {
      exposedMethods = [...exposedMethods, 'default'];
    }
  }
  return exposedMethods;
}
function getNumberOfCpus() {
  return typeof _os().availableParallelism === 'function'
    ? (0, _os().availableParallelism)()
    : (0, _os().cpus)().length;
}

/**
 * The Jest farm (publicly called "Worker") is a class that allows you to queue
 * methods across multiple child processes, in order to parallelize work. This
 * is done by providing an absolute path to a module that will be loaded on each
 * of the child processes, and bridged to the main process.
 *
 * Bridged methods are specified by using the "exposedMethods" property of the
 * "options" object. This is an array of strings, where each of them corresponds
 * to the exported name in the loaded module.
 *
 * You can also control the amount of workers by using the "numWorkers" property
 * of the "options" object, and the settings passed to fork the process through
 * the "forkOptions" property. The amount of workers defaults to the amount of
 * CPUS minus one.
 *
 * Queueing calls can be done in two ways:
 *   - Standard method: calls will be redirected to the first available worker,
 *     so they will get executed as soon as they can.
 *
 *   - Sticky method: if a "computeWorkerKey" method is provided within the
 *     config, the resulting string of this method will be used as a key.
 *     Every time this key is returned, it is guaranteed that your job will be
 *     processed by the same worker. This is specially useful if your workers
 *     are caching results.
 */
class Worker {
  _ending;
  _farm;
  _options;
  _workerPool;
  constructor(workerPath, options) {
    this._options = {
      ...options
    };
    this._ending = false;
    if (typeof workerPath !== 'string') {
      workerPath = workerPath.href;
    }
    if (workerPath.startsWith('file:')) {
      workerPath = (0, _url().fileURLToPath)(workerPath);
    } else if (!(0, _path().isAbsolute)(workerPath)) {
      throw new Error(`'workerPath' must be absolute, got '${workerPath}'`);
    }
    const workerPoolOptions = {
      enableWorkerThreads: this._options.enableWorkerThreads ?? false,
      forkOptions: this._options.forkOptions ?? {},
      idleMemoryLimit: this._options.idleMemoryLimit,
      maxRetries: this._options.maxRetries ?? 3,
      numWorkers:
        this._options.numWorkers ?? Math.max(getNumberOfCpus() - 1, 1),
      resourceLimits: this._options.resourceLimits ?? {},
      setupArgs: this._options.setupArgs ?? []
    };
    if (this._options.WorkerPool) {
      this._workerPool = new this._options.WorkerPool(
        workerPath,
        workerPoolOptions
      );
    } else {
      this._workerPool = new _WorkerPool.default(workerPath, workerPoolOptions);
    }
    this._farm = new _Farm.default(
      workerPoolOptions.numWorkers,
      this._workerPool.send.bind(this._workerPool),
      {
        computeWorkerKey: this._options.computeWorkerKey,
        taskQueue: this._options.taskQueue,
        workerSchedulingPolicy: this._options.workerSchedulingPolicy
      }
    );
    this._bindExposedWorkerMethods(workerPath, this._options);
  }
  _bindExposedWorkerMethods(workerPath, options) {
    getExposedMethods(workerPath, options).forEach(name => {
      if (name.startsWith('_')) {
        return;
      }

      // eslint-disable-next-line no-prototype-builtins
      if (this.constructor.prototype.hasOwnProperty(name)) {
        throw new TypeError(`Cannot define a method called ${name}`);
      }

      // @ts-expect-error: dynamic extension of the class instance is expected.
      this[name] = this._callFunctionWithArgs.bind(this, name);
    });
  }
  _callFunctionWithArgs(method, ...args) {
    if (this._ending) {
      throw new Error('Farm is ended, no more calls can be done to it');
    }
    return this._farm.doWork(method, ...args);
  }
  getStderr() {
    return this._workerPool.getStderr();
  }
  getStdout() {
    return this._workerPool.getStdout();
  }
  async start() {
    await this._workerPool.start();
  }
  async end() {
    if (this._ending) {
      throw new Error('Farm is ended, no more calls can be done to it');
    }
    this._ending = true;
    return this._workerPool.end();
  }
}
exports.Worker = Worker;

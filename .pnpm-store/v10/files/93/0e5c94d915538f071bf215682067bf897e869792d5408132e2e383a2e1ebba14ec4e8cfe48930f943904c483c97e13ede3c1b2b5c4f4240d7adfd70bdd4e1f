'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
Object.defineProperty(exports, 'CallbackTestRunner', {
  enumerable: true,
  get: function () {
    return _types.CallbackTestRunner;
  }
});
Object.defineProperty(exports, 'EmittingTestRunner', {
  enumerable: true,
  get: function () {
    return _types.EmittingTestRunner;
  }
});
exports.default = void 0;
function _chalk() {
  const data = _interopRequireDefault(require('chalk'));
  _chalk = function () {
    return data;
  };
  return data;
}
function _emittery() {
  const data = _interopRequireDefault(require('emittery'));
  _emittery = function () {
    return data;
  };
  return data;
}
function _pLimit() {
  const data = _interopRequireDefault(require('p-limit'));
  _pLimit = function () {
    return data;
  };
  return data;
}
function _jestUtil() {
  const data = require('jest-util');
  _jestUtil = function () {
    return data;
  };
  return data;
}
function _jestWorker() {
  const data = require('jest-worker');
  _jestWorker = function () {
    return data;
  };
  return data;
}
var _runTest = _interopRequireDefault(require('./runTest'));
var _types = require('./types');
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {default: obj};
}
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

class TestRunner extends _types.EmittingTestRunner {
  #eventEmitter = new (_emittery().default)();
  async runTests(tests, watcher, options) {
    return options.serial
      ? this.#createInBandTestRun(tests, watcher)
      : this.#createParallelTestRun(tests, watcher);
  }
  async #createInBandTestRun(tests, watcher) {
    process.env.JEST_WORKER_ID = '1';
    const mutex = (0, _pLimit().default)(1);
    return tests.reduce(
      (promise, test) =>
        mutex(() =>
          promise
            .then(async () => {
              if (watcher.isInterrupted()) {
                throw new CancelRun();
              }

              // `deepCyclicCopy` used here to avoid mem-leak
              const sendMessageToJest = (eventName, args) =>
                this.#eventEmitter.emit(
                  eventName,
                  (0, _jestUtil().deepCyclicCopy)(args, {
                    keepPrototype: false
                  })
                );
              await this.#eventEmitter.emit('test-file-start', [test]);
              return (0, _runTest.default)(
                test.path,
                this._globalConfig,
                test.context.config,
                test.context.resolver,
                this._context,
                sendMessageToJest
              );
            })
            .then(
              result =>
                this.#eventEmitter.emit('test-file-success', [test, result]),
              error =>
                this.#eventEmitter.emit('test-file-failure', [test, error])
            )
        ),
      Promise.resolve()
    );
  }
  async #createParallelTestRun(tests, watcher) {
    const resolvers = new Map();
    for (const test of tests) {
      if (!resolvers.has(test.context.config.id)) {
        resolvers.set(test.context.config.id, {
          config: test.context.config,
          serializableModuleMap: test.context.moduleMap.toJSON()
        });
      }
    }
    const worker = new (_jestWorker().Worker)(require.resolve('./testWorker'), {
      enableWorkerThreads: this._globalConfig.workerThreads,
      exposedMethods: ['worker'],
      forkOptions: {
        serialization: 'json',
        stdio: 'pipe'
      },
      // The workerIdleMemoryLimit should've been converted to a number during
      // the normalization phase.
      idleMemoryLimit:
        typeof this._globalConfig.workerIdleMemoryLimit === 'number'
          ? this._globalConfig.workerIdleMemoryLimit
          : undefined,
      maxRetries: 3,
      numWorkers: this._globalConfig.maxWorkers,
      setupArgs: [
        {
          serializableResolvers: Array.from(resolvers.values())
        }
      ]
    });
    if (worker.getStdout()) worker.getStdout().pipe(process.stdout);
    if (worker.getStderr()) worker.getStderr().pipe(process.stderr);
    const mutex = (0, _pLimit().default)(this._globalConfig.maxWorkers);

    // Send test suites to workers continuously instead of all at once to track
    // the start time of individual tests.
    const runTestInWorker = test =>
      mutex(async () => {
        if (watcher.isInterrupted()) {
          return Promise.reject();
        }
        await this.#eventEmitter.emit('test-file-start', [test]);
        const promise = worker.worker({
          config: test.context.config,
          context: {
            ...this._context,
            changedFiles:
              this._context.changedFiles &&
              Array.from(this._context.changedFiles),
            sourcesRelatedToTestsInChangedFiles:
              this._context.sourcesRelatedToTestsInChangedFiles &&
              Array.from(this._context.sourcesRelatedToTestsInChangedFiles)
          },
          globalConfig: this._globalConfig,
          path: test.path
        });
        if (promise.UNSTABLE_onCustomMessage) {
          // TODO: Get appropriate type for `onCustomMessage`
          promise.UNSTABLE_onCustomMessage(([event, payload]) =>
            this.#eventEmitter.emit(event, payload)
          );
        }
        return promise;
      });
    const onInterrupt = new Promise((_, reject) => {
      watcher.on('change', state => {
        if (state.interrupted) {
          reject(new CancelRun());
        }
      });
    });
    const runAllTests = Promise.all(
      tests.map(test =>
        runTestInWorker(test).then(
          result =>
            this.#eventEmitter.emit('test-file-success', [test, result]),
          error => this.#eventEmitter.emit('test-file-failure', [test, error])
        )
      )
    );
    const cleanup = async () => {
      const {forceExited} = await worker.end();
      if (forceExited) {
        console.error(
          _chalk().default.yellow(
            'A worker process has failed to exit gracefully and has been force exited. ' +
              'This is likely caused by tests leaking due to improper teardown. ' +
              'Try running with --detectOpenHandles to find leaks. ' +
              'Active timers can also cause this, ensure that .unref() was called on them.'
          )
        );
      }
    };
    return Promise.race([runAllTests, onInterrupt]).then(cleanup, cleanup);
  }
  on(eventName, listener) {
    return this.#eventEmitter.on(eventName, listener);
  }
}
exports.default = TestRunner;
class CancelRun extends Error {
  constructor(message) {
    super(message);
    this.name = 'CancelRun';
  }
}

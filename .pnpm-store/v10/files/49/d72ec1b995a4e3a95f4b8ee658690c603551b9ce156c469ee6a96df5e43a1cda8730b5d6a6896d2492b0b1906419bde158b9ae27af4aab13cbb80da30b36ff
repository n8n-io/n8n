'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = void 0;
function _stream() {
  const data = require('stream');
  _stream = function () {
    return data;
  };
  return data;
}
var _types = require('../types');
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

class WorkerAbstract extends _stream().EventEmitter {
  /**
   * DO NOT WRITE TO THIS DIRECTLY.
   * Use this.state getter/setters so events are emitted correctly.
   */
  #state = _types.WorkerStates.STARTING;
  _fakeStream = null;
  _exitPromise;
  _resolveExitPromise;
  _workerReadyPromise;
  _resolveWorkerReady;
  get state() {
    return this.#state;
  }
  set state(value) {
    if (this.#state !== value) {
      const oldState = this.#state;
      this.#state = value;
      this.emit(_types.WorkerEvents.STATE_CHANGE, value, oldState);
    }
  }
  constructor(options) {
    super();
    if (typeof options.on === 'object') {
      for (const [event, handlers] of Object.entries(options.on)) {
        // Can't do Array.isArray on a ReadonlyArray<T>.
        // https://github.com/microsoft/TypeScript/issues/17002
        if (typeof handlers === 'function') {
          super.on(event, handlers);
        } else {
          for (const handler of handlers) {
            super.on(event, handler);
          }
        }
      }
    }
    this._exitPromise = new Promise(resolve => {
      this._resolveExitPromise = resolve;
    });
    this._exitPromise.then(() => {
      this.state = _types.WorkerStates.SHUT_DOWN;
    });
  }

  /**
   * Wait for the worker child process to be ready to handle requests.
   *
   * @returns Promise which resolves when ready.
   */
  waitForWorkerReady() {
    if (!this._workerReadyPromise) {
      this._workerReadyPromise = new Promise((resolve, reject) => {
        let settled = false;
        let to;
        switch (this.state) {
          case _types.WorkerStates.OUT_OF_MEMORY:
          case _types.WorkerStates.SHUTTING_DOWN:
          case _types.WorkerStates.SHUT_DOWN:
            settled = true;
            reject(
              new Error(
                `Worker state means it will never be ready: ${this.state}`
              )
            );
            break;
          case _types.WorkerStates.STARTING:
          case _types.WorkerStates.RESTARTING:
            this._resolveWorkerReady = () => {
              settled = true;
              resolve();
              if (to) {
                clearTimeout(to);
              }
            };
            break;
          case _types.WorkerStates.OK:
            settled = true;
            resolve();
            break;
        }
        if (!settled) {
          to = setTimeout(() => {
            if (!settled) {
              reject(new Error('Timeout starting worker'));
            }
          }, 500);
        }
      });
    }
    return this._workerReadyPromise;
  }

  /**
   * Used to shut down the current working instance once the children have been
   * killed off.
   */
  _shutdown() {
    this.state === _types.WorkerStates.SHUT_DOWN;

    // End the permanent stream so the merged stream end too
    if (this._fakeStream) {
      this._fakeStream.end();
      this._fakeStream = null;
    }
    this._resolveExitPromise();
  }
  _getFakeStream() {
    if (!this._fakeStream) {
      this._fakeStream = new (_stream().PassThrough)();
    }
    return this._fakeStream;
  }
}
exports.default = WorkerAbstract;

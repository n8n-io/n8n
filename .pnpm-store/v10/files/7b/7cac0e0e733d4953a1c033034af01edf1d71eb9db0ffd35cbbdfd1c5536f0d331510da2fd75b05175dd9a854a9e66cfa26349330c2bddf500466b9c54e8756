'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = void 0;
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

class JestHooks {
  _listeners;
  _subscriber;
  _emitter;
  constructor() {
    this._listeners = {
      onFileChange: [],
      onTestRunComplete: [],
      shouldRunTestSuite: []
    };
    this._subscriber = {
      onFileChange: fn => {
        this._listeners.onFileChange.push(fn);
      },
      onTestRunComplete: fn => {
        this._listeners.onTestRunComplete.push(fn);
      },
      shouldRunTestSuite: fn => {
        this._listeners.shouldRunTestSuite.push(fn);
      }
    };
    this._emitter = {
      onFileChange: fs =>
        this._listeners.onFileChange.forEach(listener => listener(fs)),
      onTestRunComplete: results =>
        this._listeners.onTestRunComplete.forEach(listener =>
          listener(results)
        ),
      shouldRunTestSuite: async testSuiteInfo => {
        const result = await Promise.all(
          this._listeners.shouldRunTestSuite.map(listener =>
            listener(testSuiteInfo)
          )
        );
        return result.every(Boolean);
      }
    };
  }
  isUsed(hook) {
    return this._listeners[hook]?.length > 0;
  }
  getSubscriber() {
    return this._subscriber;
  }
  getEmitter() {
    return this._emitter;
  }
}
var _default = JestHooks;
exports.default = _default;

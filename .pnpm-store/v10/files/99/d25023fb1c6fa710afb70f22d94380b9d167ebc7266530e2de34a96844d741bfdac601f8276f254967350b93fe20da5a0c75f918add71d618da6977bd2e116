'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = void 0;
function _jestWatcher() {
  const data = require('jest-watcher');
  _jestWatcher = function () {
    return data;
  };
  return data;
}
var _FailedTestsInteractiveMode = _interopRequireDefault(
  require('../FailedTestsInteractiveMode')
);
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {default: obj};
}
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

class FailedTestsInteractivePlugin extends _jestWatcher().BaseWatchPlugin {
  _failedTestAssertions;
  _manager = new _FailedTestsInteractiveMode.default(this._stdout);
  apply(hooks) {
    hooks.onTestRunComplete(results => {
      this._failedTestAssertions = this.getFailedTestAssertions(results);
      if (this._manager.isActive()) this._manager.updateWithResults(results);
    });
  }
  getUsageInfo() {
    if (this._failedTestAssertions?.length) {
      return {
        key: 'i',
        prompt: 'run failing tests interactively'
      };
    }
    return null;
  }
  onKey(key) {
    if (this._manager.isActive()) {
      this._manager.put(key);
    }
  }
  run(_, updateConfigAndRun) {
    return new Promise(resolve => {
      if (
        !this._failedTestAssertions ||
        this._failedTestAssertions.length === 0
      ) {
        resolve();
        return;
      }
      this._manager.run(this._failedTestAssertions, failure => {
        updateConfigAndRun({
          mode: 'watch',
          testNamePattern: failure ? `^${failure.fullName}$` : '',
          testPathPattern: failure?.path || ''
        });
        if (!this._manager.isActive()) {
          resolve();
        }
      });
    });
  }
  getFailedTestAssertions(results) {
    const failedTestPaths = [];
    if (
      // skip if no failed tests
      results.numFailedTests === 0 ||
      // skip if missing test results
      !results.testResults ||
      // skip if unmatched snapshots are present
      results.snapshot.unmatched
    ) {
      return failedTestPaths;
    }
    results.testResults.forEach(testResult => {
      testResult.testResults.forEach(result => {
        if (result.status === 'failed') {
          failedTestPaths.push({
            fullName: result.fullName,
            path: testResult.testFilePath
          });
        }
      });
    });
    return failedTestPaths;
  }
}
exports.default = FailedTestsInteractivePlugin;

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
var _SnapshotInteractiveMode = _interopRequireDefault(
  require('../SnapshotInteractiveMode')
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

/* eslint-disable local/ban-types-eventually */

class UpdateSnapshotInteractivePlugin extends _jestWatcher().BaseWatchPlugin {
  _snapshotInteractiveMode = new _SnapshotInteractiveMode.default(this._stdout);
  _failedSnapshotTestAssertions = [];
  isInternal = true;
  getFailedSnapshotTestAssertions(testResults) {
    const failedTestPaths = [];
    if (testResults.numFailedTests === 0 || !testResults.testResults) {
      return failedTestPaths;
    }
    testResults.testResults.forEach(testResult => {
      if (testResult.snapshot && testResult.snapshot.unmatched) {
        testResult.testResults.forEach(result => {
          if (result.status === 'failed') {
            failedTestPaths.push({
              fullName: result.fullName,
              path: testResult.testFilePath
            });
          }
        });
      }
    });
    return failedTestPaths;
  }
  apply(hooks) {
    hooks.onTestRunComplete(results => {
      this._failedSnapshotTestAssertions =
        this.getFailedSnapshotTestAssertions(results);
      if (this._snapshotInteractiveMode.isActive()) {
        this._snapshotInteractiveMode.updateWithResults(results);
      }
    });
  }
  onKey(key) {
    if (this._snapshotInteractiveMode.isActive()) {
      this._snapshotInteractiveMode.put(key);
    }
  }
  run(_globalConfig, updateConfigAndRun) {
    if (this._failedSnapshotTestAssertions.length) {
      return new Promise(res => {
        this._snapshotInteractiveMode.run(
          this._failedSnapshotTestAssertions,
          (assertion, shouldUpdateSnapshot) => {
            updateConfigAndRun({
              mode: 'watch',
              testNamePattern: assertion ? `^${assertion.fullName}$` : '',
              testPathPattern: assertion ? assertion.path : '',
              updateSnapshot: shouldUpdateSnapshot ? 'all' : 'none'
            });
            if (!this._snapshotInteractiveMode.isActive()) {
              res();
            }
          }
        );
      });
    } else {
      return Promise.resolve();
    }
  }
  getUsageInfo() {
    if (this._failedSnapshotTestAssertions?.length > 0) {
      return {
        key: 'i',
        prompt: 'update failing snapshots interactively'
      };
    }
    return null;
  }
}
var _default = UpdateSnapshotInteractivePlugin;
exports.default = _default;

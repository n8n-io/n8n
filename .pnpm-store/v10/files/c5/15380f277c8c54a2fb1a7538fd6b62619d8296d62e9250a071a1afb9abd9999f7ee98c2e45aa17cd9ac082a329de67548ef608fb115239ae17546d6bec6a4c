'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = void 0;
function _jestUtil() {
  const data = require('jest-util');
  _jestUtil = function () {
    return data;
  };
  return data;
}
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const {remove: preRunMessageRemove} = _jestUtil().preRunMessage;
class BaseReporter {
  _error;
  log(message) {
    process.stderr.write(`${message}\n`);
  }
  onRunStart(_results, _options) {
    preRunMessageRemove(process.stderr);
  }

  /* eslint-disable @typescript-eslint/no-empty-function */
  onTestCaseResult(_test, _testCaseResult) {}
  onTestResult(_test, _testResult, _results) {}
  onTestStart(_test) {}
  onRunComplete(_testContexts, _aggregatedResults) {}
  /* eslint-enable */

  _setError(error) {
    this._error = error;
  }

  // Return an error that occurred during reporting. This error will
  // define whether the test run was successful or failed.
  getLastError() {
    return this._error;
  }
}
exports.default = BaseReporter;

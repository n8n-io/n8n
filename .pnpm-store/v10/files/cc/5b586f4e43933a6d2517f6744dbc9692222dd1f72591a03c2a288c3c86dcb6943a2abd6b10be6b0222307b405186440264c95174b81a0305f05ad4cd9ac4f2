'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = void 0;
var _utils = require('./utils');
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const testCaseReportHandler = (testPath, sendMessageToJest) => event => {
  switch (event.name) {
    case 'test_started': {
      const testCaseStartInfo = (0, _utils.createTestCaseStartInfo)(event.test);
      sendMessageToJest('test-case-start', [testPath, testCaseStartInfo]);
      break;
    }
    case 'test_todo':
    case 'test_done': {
      const testResult = (0, _utils.makeSingleTestResult)(event.test);
      const testCaseResult = (0, _utils.parseSingleTestResult)(testResult);
      sendMessageToJest('test-case-result', [testPath, testCaseResult]);
      break;
    }
  }
};
var _default = testCaseReportHandler;
exports.default = _default;

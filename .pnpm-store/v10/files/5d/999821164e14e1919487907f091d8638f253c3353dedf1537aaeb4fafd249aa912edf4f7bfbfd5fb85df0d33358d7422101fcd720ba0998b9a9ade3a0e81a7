'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = getResultHeader;
function _chalk() {
  const data = _interopRequireDefault(require('chalk'));
  _chalk = function () {
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
var _formatTestPath = _interopRequireDefault(require('./formatTestPath'));
var _printDisplayName = _interopRequireDefault(require('./printDisplayName'));
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {default: obj};
}
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const LONG_TEST_COLOR = _chalk().default.reset.bold.bgRed;
// Explicitly reset for these messages since they can get written out in the
// middle of error logging
const FAIL_TEXT = 'FAIL';
const PASS_TEXT = 'PASS';
const FAIL = _chalk().default.supportsColor
  ? _chalk().default.reset.inverse.bold.red(` ${FAIL_TEXT} `)
  : FAIL_TEXT;
const PASS = _chalk().default.supportsColor
  ? _chalk().default.reset.inverse.bold.green(` ${PASS_TEXT} `)
  : PASS_TEXT;
function getResultHeader(result, globalConfig, projectConfig) {
  const testPath = result.testFilePath;
  const status =
    result.numFailingTests > 0 || result.testExecError ? FAIL : PASS;
  const testDetail = [];
  if (result.perfStats?.slow) {
    const runTime = result.perfStats.runtime / 1000;
    testDetail.push(LONG_TEST_COLOR((0, _jestUtil().formatTime)(runTime, 0)));
  }
  if (result.memoryUsage) {
    const toMB = bytes => Math.floor(bytes / 1024 / 1024);
    testDetail.push(`${toMB(result.memoryUsage)} MB heap size`);
  }
  const projectDisplayName =
    projectConfig && projectConfig.displayName
      ? `${(0, _printDisplayName.default)(projectConfig)} `
      : '';
  return `${status} ${projectDisplayName}${(0, _formatTestPath.default)(
    projectConfig ?? globalConfig,
    testPath
  )}${testDetail.length ? ` (${testDetail.join(', ')})` : ''}`;
}

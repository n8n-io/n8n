'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = getNoTestFound;
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
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {default: obj};
}
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

function getNoTestFound(testRunData, globalConfig, willExitWith0) {
  const testFiles = testRunData.reduce(
    (current, testRun) => current + (testRun.matches.total || 0),
    0
  );
  let dataMessage;
  if (globalConfig.runTestsByPath) {
    dataMessage = `Files: ${globalConfig.nonFlagArgs
      .map(p => `"${p}"`)
      .join(', ')}`;
  } else {
    dataMessage = `Pattern: ${_chalk().default.yellow(
      globalConfig.testPathPattern
    )} - 0 matches`;
  }
  if (willExitWith0) {
    return (
      `${_chalk().default.bold('No tests found, exiting with code 0')}\n` +
      `In ${_chalk().default.bold(globalConfig.rootDir)}` +
      '\n' +
      `  ${(0, _jestUtil().pluralize)(
        'file',
        testFiles,
        's'
      )} checked across ${(0, _jestUtil().pluralize)(
        'project',
        testRunData.length,
        's'
      )}. Run with \`--verbose\` for more details.` +
      `\n${dataMessage}`
    );
  }
  return (
    `${_chalk().default.bold('No tests found, exiting with code 1')}\n` +
    'Run with `--passWithNoTests` to exit with code 0' +
    '\n' +
    `In ${_chalk().default.bold(globalConfig.rootDir)}` +
    '\n' +
    `  ${(0, _jestUtil().pluralize)(
      'file',
      testFiles,
      's'
    )} checked across ${(0, _jestUtil().pluralize)(
      'project',
      testRunData.length,
      's'
    )}. Run with \`--verbose\` for more details.` +
    `\n${dataMessage}`
  );
}

'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = getNoTestsFoundMessage;
var _getNoTestFound = _interopRequireDefault(require('./getNoTestFound'));
var _getNoTestFoundFailed = _interopRequireDefault(
  require('./getNoTestFoundFailed')
);
var _getNoTestFoundPassWithNoTests = _interopRequireDefault(
  require('./getNoTestFoundPassWithNoTests')
);
var _getNoTestFoundRelatedToChangedFiles = _interopRequireDefault(
  require('./getNoTestFoundRelatedToChangedFiles')
);
var _getNoTestFoundVerbose = _interopRequireDefault(
  require('./getNoTestFoundVerbose')
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

function getNoTestsFoundMessage(testRunData, globalConfig) {
  const exitWith0 =
    globalConfig.passWithNoTests ||
    globalConfig.lastCommit ||
    globalConfig.onlyChanged;
  if (globalConfig.onlyFailures) {
    return {
      exitWith0,
      message: (0, _getNoTestFoundFailed.default)(globalConfig)
    };
  }
  if (globalConfig.onlyChanged) {
    return {
      exitWith0,
      message: (0, _getNoTestFoundRelatedToChangedFiles.default)(globalConfig)
    };
  }
  if (globalConfig.passWithNoTests) {
    return {
      exitWith0,
      message: (0, _getNoTestFoundPassWithNoTests.default)()
    };
  }
  return {
    exitWith0,
    message:
      testRunData.length === 1 || globalConfig.verbose
        ? (0, _getNoTestFoundVerbose.default)(
            testRunData,
            globalConfig,
            exitWith0
          )
        : (0, _getNoTestFound.default)(testRunData, globalConfig, exitWith0)
  };
}

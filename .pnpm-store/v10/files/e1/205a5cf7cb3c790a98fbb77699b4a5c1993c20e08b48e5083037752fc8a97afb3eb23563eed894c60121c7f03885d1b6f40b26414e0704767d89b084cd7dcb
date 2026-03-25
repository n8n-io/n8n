'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = getNoTestFoundFailed;
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

function getNoTestFoundFailed(globalConfig) {
  let msg = _chalk().default.bold('No failed test found.');
  if (_jestUtil().isInteractive) {
    msg += _chalk().default.dim(
      `\n${
        globalConfig.watch
          ? 'Press `f` to quit "only failed tests" mode.'
          : 'Run Jest without `--onlyFailures` or with `--all` to run all tests.'
      }`
    );
  }
  return msg;
}

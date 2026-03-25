'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = getNoTestFoundRelatedToChangedFiles;
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

function getNoTestFoundRelatedToChangedFiles(globalConfig) {
  const ref = globalConfig.changedSince
    ? `"${globalConfig.changedSince}"`
    : 'last commit';
  let msg = _chalk().default.bold(
    `No tests found related to files changed since ${ref}.`
  );
  if (_jestUtil().isInteractive) {
    msg += _chalk().default.dim(
      `\n${
        globalConfig.watch
          ? 'Press `a` to run all tests, or run Jest with `--watchAll`.'
          : 'Run Jest without `-o` or with `--all` to run all tests.'
      }`
    );
  }
  return msg;
}

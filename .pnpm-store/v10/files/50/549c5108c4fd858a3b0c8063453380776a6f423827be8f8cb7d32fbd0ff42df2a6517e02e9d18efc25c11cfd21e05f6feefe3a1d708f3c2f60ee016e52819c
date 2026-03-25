'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = isWatchmanInstalled;
function _child_process() {
  const data = require('child_process');
  _child_process = function () {
    return data;
  };
  return data;
}
function _util() {
  const data = require('util');
  _util = function () {
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

async function isWatchmanInstalled() {
  try {
    await (0, _util().promisify)(_child_process().execFile)('watchman', [
      '--version'
    ]);
    return true;
  } catch {
    return false;
  }
}

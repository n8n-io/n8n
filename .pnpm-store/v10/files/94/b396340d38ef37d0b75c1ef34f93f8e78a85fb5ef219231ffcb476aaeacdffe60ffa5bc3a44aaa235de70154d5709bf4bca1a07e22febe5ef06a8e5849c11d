'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.print = print;
exports.remove = remove;
function _chalk() {
  const data = _interopRequireDefault(require('chalk'));
  _chalk = function () {
    return data;
  };
  return data;
}
var _clearLine = _interopRequireDefault(require('./clearLine'));
var _isInteractive = _interopRequireDefault(require('./isInteractive'));
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {default: obj};
}
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

function print(stream) {
  if (_isInteractive.default) {
    stream.write(
      _chalk().default.bold.dim('Determining test suites to run...')
    );
  }
}
function remove(stream) {
  if (_isInteractive.default) {
    (0, _clearLine.default)(stream);
  }
}

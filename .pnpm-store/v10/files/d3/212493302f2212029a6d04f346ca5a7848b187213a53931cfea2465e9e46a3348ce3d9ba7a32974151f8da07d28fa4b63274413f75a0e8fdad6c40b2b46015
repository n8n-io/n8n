'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = colorize;
function _chalk() {
  const data = _interopRequireDefault(require('chalk'));
  _chalk = function () {
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

function colorize(str, start, end) {
  return (
    _chalk().default.dim(str.slice(0, start)) +
    _chalk().default.reset(str.slice(start, end)) +
    _chalk().default.dim(str.slice(end))
  );
}

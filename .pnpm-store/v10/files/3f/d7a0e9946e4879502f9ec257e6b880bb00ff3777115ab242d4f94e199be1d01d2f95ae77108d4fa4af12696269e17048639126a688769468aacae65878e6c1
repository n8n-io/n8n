'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = void 0;
function _ciInfo() {
  const data = require('ci-info');
  _ciInfo = function () {
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
var _default =
  !!process.stdout.isTTY && process.env.TERM !== 'dumb' && !_ciInfo().isCI;
exports.default = _default;

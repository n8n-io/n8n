'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = printDisplayName;
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

function printDisplayName(config) {
  const {displayName} = config;
  const white = _chalk().default.reset.inverse.white;
  if (!displayName) {
    return '';
  }
  const {name, color} = displayName;
  const chosenColor = _chalk().default.reset.inverse[color]
    ? _chalk().default.reset.inverse[color]
    : white;
  return _chalk().default.supportsColor ? chosenColor(` ${name} `) : name;
}

'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = void 0;
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

const activeFilters = (globalConfig, delimiter = '\n') => {
  const {testNamePattern, testPathPattern} = globalConfig;
  if (testNamePattern || testPathPattern) {
    const filters = [
      testPathPattern
        ? _chalk().default.dim('filename ') +
          _chalk().default.yellow(`/${testPathPattern}/`)
        : null,
      testNamePattern
        ? _chalk().default.dim('test name ') +
          _chalk().default.yellow(`/${testNamePattern}/`)
        : null
    ]
      .filter(f => f)
      .join(', ');
    const messages = [
      `\n${_chalk().default.bold('Active Filters: ')}${filters}`
    ];
    return messages.filter(message => !!message).join(delimiter);
  }
  return '';
};
var _default = activeFilters;
exports.default = _default;

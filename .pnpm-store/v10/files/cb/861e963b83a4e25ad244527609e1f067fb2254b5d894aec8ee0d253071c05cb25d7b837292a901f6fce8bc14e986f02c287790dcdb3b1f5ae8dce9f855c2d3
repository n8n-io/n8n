'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = void 0;
function _ansiEscapes() {
  const data = _interopRequireDefault(require('ansi-escapes'));
  _ansiEscapes = function () {
    return data;
  };
  return data;
}
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

const {CLEAR} = _jestUtil().specialChars;
const usage = entity =>
  `\n${_chalk().default.bold('Pattern Mode Usage')}\n` +
  ` ${_chalk().default.dim('\u203A Press')} Esc ${_chalk().default.dim(
    'to exit pattern mode.'
  )}\n` +
  ` ${_chalk().default.dim('\u203A Press')} Enter ` +
  `${_chalk().default.dim(`to filter by a ${entity} regex pattern.`)}\n` +
  '\n';
const usageRows = usage('').split('\n').length;
class PatternPrompt {
  _currentUsageRows;
  constructor(_pipe, _prompt, _entityName = '') {
    this._pipe = _pipe;
    this._prompt = _prompt;
    this._entityName = _entityName;
    this._currentUsageRows = usageRows;
  }
  run(onSuccess, onCancel, options) {
    this._pipe.write(_ansiEscapes().default.cursorHide);
    this._pipe.write(CLEAR);
    if (options && options.header) {
      this._pipe.write(`${options.header}\n`);
      this._currentUsageRows = usageRows + options.header.split('\n').length;
    } else {
      this._currentUsageRows = usageRows;
    }
    this._pipe.write(usage(this._entityName));
    this._pipe.write(_ansiEscapes().default.cursorShow);
    this._prompt.enter(this._onChange.bind(this), onSuccess, onCancel);
  }
  _onChange(_pattern, _options) {
    this._pipe.write(_ansiEscapes().default.eraseLine);
    this._pipe.write(_ansiEscapes().default.cursorLeft);
  }
}
exports.default = PatternPrompt;

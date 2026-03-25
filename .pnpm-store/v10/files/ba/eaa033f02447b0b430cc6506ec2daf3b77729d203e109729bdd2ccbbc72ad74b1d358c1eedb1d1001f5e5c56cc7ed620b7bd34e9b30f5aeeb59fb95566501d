'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = getConsoleOutput;
function _chalk() {
  const data = _interopRequireDefault(require('chalk'));
  _chalk = function () {
    return data;
  };
  return data;
}
function _jestMessageUtil() {
  const data = require('jest-message-util');
  _jestMessageUtil = function () {
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

function getConsoleOutput(buffer, config, globalConfig) {
  const TITLE_INDENT =
    globalConfig.verbose === true ? ' '.repeat(2) : ' '.repeat(4);
  const CONSOLE_INDENT = TITLE_INDENT + ' '.repeat(2);
  const logEntries = buffer.reduce((output, {type, message, origin}) => {
    message = message
      .split(/\n/)
      .map(line => CONSOLE_INDENT + line)
      .join('\n');
    let typeMessage = `console.${type}`;
    let noStackTrace = true;
    let noCodeFrame = true;
    if (type === 'warn') {
      message = _chalk().default.yellow(message);
      typeMessage = _chalk().default.yellow(typeMessage);
      noStackTrace = globalConfig?.noStackTrace ?? false;
      noCodeFrame = false;
    } else if (type === 'error') {
      message = _chalk().default.red(message);
      typeMessage = _chalk().default.red(typeMessage);
      noStackTrace = globalConfig?.noStackTrace ?? false;
      noCodeFrame = false;
    }
    const options = {
      noCodeFrame,
      noStackTrace
    };
    const formattedStackTrace = (0, _jestMessageUtil().formatStackTrace)(
      origin,
      config,
      options
    );
    return `${
      output + TITLE_INDENT + _chalk().default.dim(typeMessage)
    }\n${message.trimRight()}\n${_chalk().default.dim(
      formattedStackTrace.trimRight()
    )}\n\n`;
  }, '');
  return `${logEntries.trimRight()}\n`;
}

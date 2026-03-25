'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = void 0;
function _assert() {
  const data = require('assert');
  _assert = function () {
    return data;
  };
  return data;
}
function _console() {
  const data = require('console');
  _console = function () {
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

class CustomConsole extends _console().Console {
  _stdout;
  _stderr;
  _formatBuffer;
  _counters = {};
  _timers = {};
  _groupDepth = 0;
  Console = _console().Console;
  constructor(stdout, stderr, formatBuffer = (_type, message) => message) {
    super(stdout, stderr);
    this._stdout = stdout;
    this._stderr = stderr;
    this._formatBuffer = formatBuffer;
  }
  _log(type, message) {
    (0, _jestUtil().clearLine)(this._stdout);
    super.log(
      this._formatBuffer(type, '  '.repeat(this._groupDepth) + message)
    );
  }
  _logError(type, message) {
    (0, _jestUtil().clearLine)(this._stderr);
    super.error(
      this._formatBuffer(type, '  '.repeat(this._groupDepth) + message)
    );
  }
  assert(value, message) {
    try {
      (0, _assert().strict)(value, message);
    } catch (error) {
      if (!(error instanceof _assert().AssertionError)) {
        throw error;
      }
      // https://github.com/facebook/jest/pull/13422#issuecomment-1273396392
      this._logError('assert', error.toString().replace(/:\n\n.*\n/gs, ''));
    }
  }
  count(label = 'default') {
    if (!this._counters[label]) {
      this._counters[label] = 0;
    }
    this._log(
      'count',
      (0, _util().format)(`${label}: ${++this._counters[label]}`)
    );
  }
  countReset(label = 'default') {
    this._counters[label] = 0;
  }
  debug(firstArg, ...args) {
    this._log('debug', (0, _util().format)(firstArg, ...args));
  }
  dir(firstArg, options = {}) {
    const representation = (0, _util().inspect)(firstArg, options);
    this._log('dir', (0, _util().formatWithOptions)(options, representation));
  }
  dirxml(firstArg, ...args) {
    this._log('dirxml', (0, _util().format)(firstArg, ...args));
  }
  error(firstArg, ...args) {
    this._logError('error', (0, _util().format)(firstArg, ...args));
  }
  group(title, ...args) {
    this._groupDepth++;
    if (title != null || args.length > 0) {
      this._log(
        'group',
        _chalk().default.bold((0, _util().format)(title, ...args))
      );
    }
  }
  groupCollapsed(title, ...args) {
    this._groupDepth++;
    if (title != null || args.length > 0) {
      this._log(
        'groupCollapsed',
        _chalk().default.bold((0, _util().format)(title, ...args))
      );
    }
  }
  groupEnd() {
    if (this._groupDepth > 0) {
      this._groupDepth--;
    }
  }
  info(firstArg, ...args) {
    this._log('info', (0, _util().format)(firstArg, ...args));
  }
  log(firstArg, ...args) {
    this._log('log', (0, _util().format)(firstArg, ...args));
  }
  time(label = 'default') {
    if (this._timers[label] != null) {
      return;
    }
    this._timers[label] = new Date();
  }
  timeEnd(label = 'default') {
    const startTime = this._timers[label];
    if (startTime != null) {
      const endTime = new Date().getTime();
      const time = endTime - startTime.getTime();
      this._log(
        'time',
        (0, _util().format)(`${label}: ${(0, _jestUtil().formatTime)(time)}`)
      );
      delete this._timers[label];
    }
  }
  timeLog(label = 'default', ...data) {
    const startTime = this._timers[label];
    if (startTime != null) {
      const endTime = new Date();
      const time = endTime.getTime() - startTime.getTime();
      this._log(
        'time',
        (0, _util().format)(
          `${label}: ${(0, _jestUtil().formatTime)(time)}`,
          ...data
        )
      );
    }
  }
  warn(firstArg, ...args) {
    this._logError('warn', (0, _util().format)(firstArg, ...args));
  }
  getBuffer() {
    return undefined;
  }
}
exports.default = CustomConsole;

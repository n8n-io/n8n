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

class BufferedConsole extends _console().Console {
  _buffer = [];
  _counters = {};
  _timers = {};
  _groupDepth = 0;
  Console = _console().Console;
  constructor() {
    super({
      write: message => {
        BufferedConsole.write(this._buffer, 'log', message, null);
        return true;
      }
    });
  }
  static write(buffer, type, message, level) {
    const stackLevel = level != null ? level : 2;
    const rawStack = new (_jestUtil().ErrorWithStack)(
      undefined,
      BufferedConsole.write
    ).stack;
    (0, _jestUtil().invariant)(rawStack != null, 'always have a stack trace');
    const origin = rawStack
      .split('\n')
      .slice(stackLevel)
      .filter(Boolean)
      .join('\n');
    buffer.push({
      message,
      origin,
      type
    });
    return buffer;
  }
  _log(type, message) {
    BufferedConsole.write(
      this._buffer,
      type,
      '  '.repeat(this._groupDepth) + message,
      3
    );
  }
  assert(value, message) {
    try {
      (0, _assert().strict)(value, message);
    } catch (error) {
      if (!(error instanceof _assert().AssertionError)) {
        throw error;
      }
      // https://github.com/jestjs/jest/pull/13422#issuecomment-1273396392
      this._log('assert', error.toString().replace(/:\n\n.*\n/gs, ''));
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
  debug(firstArg, ...rest) {
    this._log('debug', (0, _util().format)(firstArg, ...rest));
  }
  dir(firstArg, options = {}) {
    const representation = (0, _util().inspect)(firstArg, options);
    this._log('dir', (0, _util().formatWithOptions)(options, representation));
  }
  dirxml(firstArg, ...rest) {
    this._log('dirxml', (0, _util().format)(firstArg, ...rest));
  }
  error(firstArg, ...rest) {
    this._log('error', (0, _util().format)(firstArg, ...rest));
  }
  group(title, ...rest) {
    this._groupDepth++;
    if (title != null || rest.length > 0) {
      this._log(
        'group',
        _chalk().default.bold((0, _util().format)(title, ...rest))
      );
    }
  }
  groupCollapsed(title, ...rest) {
    this._groupDepth++;
    if (title != null || rest.length > 0) {
      this._log(
        'groupCollapsed',
        _chalk().default.bold((0, _util().format)(title, ...rest))
      );
    }
  }
  groupEnd() {
    if (this._groupDepth > 0) {
      this._groupDepth--;
    }
  }
  info(firstArg, ...rest) {
    this._log('info', (0, _util().format)(firstArg, ...rest));
  }
  log(firstArg, ...rest) {
    this._log('log', (0, _util().format)(firstArg, ...rest));
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
      const endTime = new Date();
      const time = endTime.getTime() - startTime.getTime();
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
  warn(firstArg, ...rest) {
    this._log('warn', (0, _util().format)(firstArg, ...rest));
  }
  getBuffer() {
    return this._buffer.length ? this._buffer : undefined;
  }
}
exports.default = BufferedConsole;

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
function _jestWatcher() {
  const data = require('jest-watcher');
  _jestWatcher = function () {
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

const {ARROW, CLEAR} = _jestUtil().specialChars;
function describeKey(key, description) {
  return `${_chalk().default.dim(
    `${ARROW}Press`
  )} ${key} ${_chalk().default.dim(description)}`;
}
const TestProgressLabel = _chalk().default.bold('Interactive Test Progress');
class FailedTestsInteractiveMode {
  _isActive = false;
  _countPaths = 0;
  _skippedNum = 0;
  _testAssertions = [];
  _updateTestRunnerConfig;
  constructor(_pipe) {
    this._pipe = _pipe;
  }
  isActive() {
    return this._isActive;
  }
  put(key) {
    switch (key) {
      case 's':
        if (this._skippedNum === this._testAssertions.length) {
          break;
        }
        this._skippedNum += 1;
        // move skipped test to the end
        this._testAssertions.push(this._testAssertions.shift());
        if (this._testAssertions.length - this._skippedNum > 0) {
          this._run();
        } else {
          this._drawUIDoneWithSkipped();
        }
        break;
      case 'q':
      case _jestWatcher().KEYS.ESCAPE:
        this.abort();
        break;
      case 'r':
        this.restart();
        break;
      case _jestWatcher().KEYS.ENTER:
        if (this._testAssertions.length === 0) {
          this.abort();
        } else {
          this._run();
        }
        break;
      default:
    }
  }
  run(failedTestAssertions, updateConfig) {
    if (failedTestAssertions.length === 0) return;
    this._testAssertions = [...failedTestAssertions];
    this._countPaths = this._testAssertions.length;
    this._updateTestRunnerConfig = updateConfig;
    this._isActive = true;
    this._run();
  }
  updateWithResults(results) {
    if (!results.snapshot.failure && results.numFailedTests > 0) {
      return this._drawUIOverlay();
    }
    this._testAssertions.shift();
    if (this._testAssertions.length === 0) {
      return this._drawUIOverlay();
    }

    // Go to the next test
    return this._run();
  }
  _clearTestSummary() {
    this._pipe.write(_ansiEscapes().default.cursorUp(6));
    this._pipe.write(_ansiEscapes().default.eraseDown);
  }
  _drawUIDone() {
    this._pipe.write(CLEAR);
    const messages = [
      _chalk().default.bold('Watch Usage'),
      describeKey('Enter', 'to return to watch mode.')
    ];
    this._pipe.write(`${messages.join('\n')}\n`);
  }
  _drawUIDoneWithSkipped() {
    this._pipe.write(CLEAR);
    let stats = `${(0, _jestUtil().pluralize)(
      'test',
      this._countPaths
    )} reviewed`;
    if (this._skippedNum > 0) {
      const skippedText = _chalk().default.bold.yellow(
        `${(0, _jestUtil().pluralize)('test', this._skippedNum)} skipped`
      );
      stats = `${stats}, ${skippedText}`;
    }
    const message = [
      TestProgressLabel,
      `${ARROW}${stats}`,
      '\n',
      _chalk().default.bold('Watch Usage'),
      describeKey('r', 'to restart Interactive Mode.'),
      describeKey('q', 'to quit Interactive Mode.'),
      describeKey('Enter', 'to return to watch mode.')
    ];
    this._pipe.write(`\n${message.join('\n')}`);
  }
  _drawUIProgress() {
    this._clearTestSummary();
    const numPass = this._countPaths - this._testAssertions.length;
    const numRemaining = this._countPaths - numPass - this._skippedNum;
    let stats = `${(0, _jestUtil().pluralize)('test', numRemaining)} remaining`;
    if (this._skippedNum > 0) {
      const skippedText = _chalk().default.bold.yellow(
        `${(0, _jestUtil().pluralize)('test', this._skippedNum)} skipped`
      );
      stats = `${stats}, ${skippedText}`;
    }
    const message = [
      TestProgressLabel,
      `${ARROW}${stats}`,
      '\n',
      _chalk().default.bold('Watch Usage'),
      describeKey('s', 'to skip the current test.'),
      describeKey('q', 'to quit Interactive Mode.'),
      describeKey('Enter', 'to return to watch mode.')
    ];
    this._pipe.write(`\n${message.join('\n')}`);
  }
  _drawUIOverlay() {
    if (this._testAssertions.length === 0) return this._drawUIDone();
    return this._drawUIProgress();
  }
  _run() {
    if (this._updateTestRunnerConfig) {
      this._updateTestRunnerConfig(this._testAssertions[0]);
    }
  }
  abort() {
    this._isActive = false;
    this._skippedNum = 0;
    if (this._updateTestRunnerConfig) {
      this._updateTestRunnerConfig();
    }
  }
  restart() {
    this._skippedNum = 0;
    this._countPaths = this._testAssertions.length;
    this._run();
  }
}
exports.default = FailedTestsInteractiveMode;

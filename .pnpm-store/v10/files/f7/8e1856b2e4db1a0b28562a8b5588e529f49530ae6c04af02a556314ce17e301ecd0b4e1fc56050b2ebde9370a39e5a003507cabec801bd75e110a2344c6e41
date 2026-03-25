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
function _stringLength() {
  const data = _interopRequireDefault(require('string-length'));
  _stringLength = function () {
    return data;
  };
  return data;
}
var _getSummary = _interopRequireDefault(require('./getSummary'));
var _printDisplayName = _interopRequireDefault(require('./printDisplayName'));
var _trimAndFormatPath = _interopRequireDefault(require('./trimAndFormatPath'));
var _wrapAnsiString = _interopRequireDefault(require('./wrapAnsiString'));
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {default: obj};
}
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const RUNNING_TEXT = ' RUNS ';
const RUNNING = `${_chalk().default.reset.inverse.yellow.bold(RUNNING_TEXT)} `;

/**
 * This class is a perf optimization for sorting the list of currently
 * running tests. It tries to keep tests in the same positions without
 * shifting the whole list.
 */
class CurrentTestList {
  _array;
  constructor() {
    this._array = [];
  }
  add(testPath, config) {
    const index = this._array.indexOf(null);
    const record = {
      config,
      testPath
    };
    if (index !== -1) {
      this._array[index] = record;
    } else {
      this._array.push(record);
    }
  }
  delete(testPath) {
    const record = this._array.find(
      record => record !== null && record.testPath === testPath
    );
    this._array[this._array.indexOf(record || null)] = null;
  }
  get() {
    return this._array;
  }
}
/**
 * A class that generates the CLI status of currently running tests
 * and also provides an ANSI escape sequence to remove status lines
 * from the terminal.
 */
class Status {
  _cache;
  _callback;
  _currentTests;
  _currentTestCases;
  _done;
  _emitScheduled;
  _estimatedTime;
  _interval;
  _aggregatedResults;
  _showStatus;
  constructor(_globalConfig) {
    this._globalConfig = _globalConfig;
    this._cache = null;
    this._currentTests = new CurrentTestList();
    this._currentTestCases = [];
    this._done = false;
    this._emitScheduled = false;
    this._estimatedTime = 0;
    this._showStatus = false;
  }
  onChange(callback) {
    this._callback = callback;
  }
  runStarted(aggregatedResults, options) {
    this._estimatedTime = (options && options.estimatedTime) || 0;
    this._showStatus = options && options.showStatus;
    this._interval = setInterval(() => this._tick(), 1000);
    this._aggregatedResults = aggregatedResults;
    this._debouncedEmit();
  }
  runFinished() {
    this._done = true;
    if (this._interval) clearInterval(this._interval);
    this._emit();
  }
  addTestCaseResult(test, testCaseResult) {
    this._currentTestCases.push({
      test,
      testCaseResult
    });
    if (!this._showStatus) {
      this._emit();
    } else {
      this._debouncedEmit();
    }
  }
  testStarted(testPath, config) {
    this._currentTests.add(testPath, config);
    if (!this._showStatus) {
      this._emit();
    } else {
      this._debouncedEmit();
    }
  }
  testFinished(_config, testResult, aggregatedResults) {
    const {testFilePath} = testResult;
    this._aggregatedResults = aggregatedResults;
    this._currentTests.delete(testFilePath);
    this._currentTestCases = this._currentTestCases.filter(({test}) => {
      if (_config !== test.context.config) {
        return true;
      }
      return test.path !== testFilePath;
    });
    this._debouncedEmit();
  }
  get() {
    if (this._cache) {
      return this._cache;
    }
    if (this._done) {
      return {
        clear: '',
        content: ''
      };
    }
    const width = process.stdout.columns;
    let content = '\n';
    this._currentTests.get().forEach(record => {
      if (record) {
        const {config, testPath} = record;
        const projectDisplayName = config.displayName
          ? `${(0, _printDisplayName.default)(config)} `
          : '';
        const prefix = RUNNING + projectDisplayName;
        content += `${(0, _wrapAnsiString.default)(
          prefix +
            (0, _trimAndFormatPath.default)(
              (0, _stringLength().default)(prefix),
              config,
              testPath,
              width
            ),
          width
        )}\n`;
      }
    });
    if (this._showStatus && this._aggregatedResults) {
      content += `\n${(0, _getSummary.default)(this._aggregatedResults, {
        currentTestCases: this._currentTestCases,
        estimatedTime: this._estimatedTime,
        roundTime: true,
        seed: this._globalConfig.seed,
        showSeed: this._globalConfig.showSeed,
        width
      })}`;
    }
    let height = 0;
    for (let i = 0; i < content.length; i++) {
      if (content[i] === '\n') {
        height++;
      }
    }
    const clear = '\r\x1B[K\r\x1B[1A'.repeat(height);
    return (this._cache = {
      clear,
      content
    });
  }
  _emit() {
    this._cache = null;
    if (this._callback) this._callback();
  }
  _debouncedEmit() {
    if (!this._emitScheduled) {
      // Perf optimization to avoid two separate renders When
      // one test finishes and another test starts executing.
      this._emitScheduled = true;
      setTimeout(() => {
        this._emit();
        this._emitScheduled = false;
      }, 100);
    }
  }
  _tick() {
    this._debouncedEmit();
  }
}
exports.default = Status;

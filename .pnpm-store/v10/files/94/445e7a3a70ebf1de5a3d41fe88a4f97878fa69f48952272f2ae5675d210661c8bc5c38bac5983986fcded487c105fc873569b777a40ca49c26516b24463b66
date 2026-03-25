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
function _jestUtil() {
  const data = require('jest-util');
  _jestUtil = function () {
    return data;
  };
  return data;
}
var _DefaultReporter = _interopRequireDefault(require('./DefaultReporter'));
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {default: obj};
}
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const {ICONS} = _jestUtil().specialChars;
class VerboseReporter extends _DefaultReporter.default {
  _globalConfig;
  static filename = __filename;
  constructor(globalConfig) {
    super(globalConfig);
    this._globalConfig = globalConfig;
  }

  // Verbose mode is for debugging. Buffering of output is undesirable.
  // See https://github.com/jestjs/jest/issues/8208
  __wrapStdio(stream) {
    const write = stream.write.bind(stream);
    stream.write = chunk => {
      this.__clearStatus();
      write(chunk);
      this.__printStatus();
      return true;
    };
  }
  static filterTestResults(testResults) {
    return testResults.filter(({status}) => status !== 'pending');
  }
  static groupTestsBySuites(testResults) {
    const root = {
      suites: [],
      tests: [],
      title: ''
    };
    testResults.forEach(testResult => {
      let targetSuite = root;

      // Find the target suite for this test,
      // creating nested suites as necessary.
      for (const title of testResult.ancestorTitles) {
        let matchingSuite = targetSuite.suites.find(s => s.title === title);
        if (!matchingSuite) {
          matchingSuite = {
            suites: [],
            tests: [],
            title
          };
          targetSuite.suites.push(matchingSuite);
        }
        targetSuite = matchingSuite;
      }
      targetSuite.tests.push(testResult);
    });
    return root;
  }
  onTestResult(test, result, aggregatedResults) {
    super.testFinished(test.context.config, result, aggregatedResults);
    if (!result.skipped) {
      this.printTestFileHeader(
        result.testFilePath,
        test.context.config,
        result
      );
      if (!result.testExecError && !result.skipped) {
        this._logTestResults(result.testResults);
      }
      this.printTestFileFailureMessage(
        result.testFilePath,
        test.context.config,
        result
      );
    }
    super.forceFlushBufferedOutput();
  }
  _logTestResults(testResults) {
    this._logSuite(VerboseReporter.groupTestsBySuites(testResults), 0);
    this._logLine();
  }
  _logSuite(suite, indentLevel) {
    if (suite.title) {
      this._logLine(suite.title, indentLevel);
    }
    this._logTests(suite.tests, indentLevel + 1);
    suite.suites.forEach(suite => this._logSuite(suite, indentLevel + 1));
  }
  _getIcon(status) {
    if (status === 'failed') {
      return _chalk().default.red(ICONS.failed);
    } else if (status === 'pending') {
      return _chalk().default.yellow(ICONS.pending);
    } else if (status === 'todo') {
      return _chalk().default.magenta(ICONS.todo);
    } else {
      return _chalk().default.green(ICONS.success);
    }
  }
  _logTest(test, indentLevel) {
    const status = this._getIcon(test.status);
    const time = test.duration
      ? ` (${(0, _jestUtil().formatTime)(Math.round(test.duration))})`
      : '';
    this._logLine(
      `${status} ${_chalk().default.dim(test.title + time)}`,
      indentLevel
    );
  }
  _logTests(tests, indentLevel) {
    if (this._globalConfig.expand) {
      tests.forEach(test => this._logTest(test, indentLevel));
    } else {
      const summedTests = tests.reduce(
        (result, test) => {
          if (test.status === 'pending') {
            result.pending.push(test);
          } else if (test.status === 'todo') {
            result.todo.push(test);
          } else {
            this._logTest(test, indentLevel);
          }
          return result;
        },
        {
          pending: [],
          todo: []
        }
      );
      if (summedTests.pending.length > 0) {
        summedTests.pending.forEach(this._logTodoOrPendingTest(indentLevel));
      }
      if (summedTests.todo.length > 0) {
        summedTests.todo.forEach(this._logTodoOrPendingTest(indentLevel));
      }
    }
  }
  _logTodoOrPendingTest(indentLevel) {
    return test => {
      const printedTestStatus =
        test.status === 'pending' ? 'skipped' : test.status;
      const icon = this._getIcon(test.status);
      const text = _chalk().default.dim(`${printedTestStatus} ${test.title}`);
      this._logLine(`${icon} ${text}`, indentLevel);
    };
  }
  _logLine(str, indentLevel) {
    const indentation = '  '.repeat(indentLevel || 0);
    this.log(indentation + (str || ''));
  }
}
exports.default = VerboseReporter;

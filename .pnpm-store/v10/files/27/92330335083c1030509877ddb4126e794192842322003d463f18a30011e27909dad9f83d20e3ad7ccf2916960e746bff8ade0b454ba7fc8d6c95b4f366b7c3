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
function _console() {
  const data = require('@jest/console');
  _console = function () {
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
function _jestUtil() {
  const data = require('jest-util');
  _jestUtil = function () {
    return data;
  };
  return data;
}
var _BaseReporter = _interopRequireDefault(require('./BaseReporter'));
var _Status = _interopRequireDefault(require('./Status'));
var _getResultHeader = _interopRequireDefault(require('./getResultHeader'));
var _getSnapshotStatus = _interopRequireDefault(require('./getSnapshotStatus'));
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {default: obj};
}
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const TITLE_BULLET = _chalk().default.bold('\u25cf ');
class DefaultReporter extends _BaseReporter.default {
  _clear; // ANSI clear sequence for the last printed status
  _err;
  _globalConfig;
  _out;
  _status;
  _bufferedOutput;
  static filename = __filename;
  constructor(globalConfig) {
    super();
    this._globalConfig = globalConfig;
    this._clear = '';
    this._out = process.stdout.write.bind(process.stdout);
    this._err = process.stderr.write.bind(process.stderr);
    this._status = new _Status.default(globalConfig);
    this._bufferedOutput = new Set();
    this.__wrapStdio(process.stdout);
    this.__wrapStdio(process.stderr);
    this._status.onChange(() => {
      this.__clearStatus();
      this.__printStatus();
    });
  }
  __wrapStdio(stream) {
    const write = stream.write.bind(stream);
    let buffer = [];
    let timeout = null;
    const flushBufferedOutput = () => {
      const string = buffer.join('');
      buffer = [];

      // This is to avoid conflicts between random output and status text
      this.__clearStatus();
      if (string) {
        write(string);
      }
      this.__printStatus();
      this._bufferedOutput.delete(flushBufferedOutput);
    };
    this._bufferedOutput.add(flushBufferedOutput);
    const debouncedFlush = () => {
      // If the process blows up no errors would be printed.
      // There should be a smart way to buffer stderr, but for now
      // we just won't buffer it.
      if (stream === process.stderr) {
        flushBufferedOutput();
      } else {
        if (!timeout) {
          timeout = setTimeout(() => {
            flushBufferedOutput();
            timeout = null;
          }, 100);
        }
      }
    };
    stream.write = chunk => {
      buffer.push(chunk);
      debouncedFlush();
      return true;
    };
  }

  // Don't wait for the debounced call and flush all output immediately.
  forceFlushBufferedOutput() {
    for (const flushBufferedOutput of this._bufferedOutput) {
      flushBufferedOutput();
    }
  }
  __clearStatus() {
    if (_jestUtil().isInteractive) {
      if (this._globalConfig.useStderr) {
        this._err(this._clear);
      } else {
        this._out(this._clear);
      }
    }
  }
  __printStatus() {
    const {content, clear} = this._status.get();
    this._clear = clear;
    if (_jestUtil().isInteractive) {
      if (this._globalConfig.useStderr) {
        this._err(content);
      } else {
        this._out(content);
      }
    }
  }
  onRunStart(aggregatedResults, options) {
    this._status.runStarted(aggregatedResults, options);
  }
  onTestStart(test) {
    this._status.testStarted(test.path, test.context.config);
  }
  onTestCaseResult(test, testCaseResult) {
    this._status.addTestCaseResult(test, testCaseResult);
  }
  onRunComplete() {
    this.forceFlushBufferedOutput();
    this._status.runFinished();
    process.stdout.write = this._out;
    process.stderr.write = this._err;
    (0, _jestUtil().clearLine)(process.stderr);
  }
  onTestResult(test, testResult, aggregatedResults) {
    this.testFinished(test.context.config, testResult, aggregatedResults);
    if (!testResult.skipped) {
      this.printTestFileHeader(
        testResult.testFilePath,
        test.context.config,
        testResult
      );
      this.printTestFileFailureMessage(
        testResult.testFilePath,
        test.context.config,
        testResult
      );
    }
    this.forceFlushBufferedOutput();
  }
  testFinished(config, testResult, aggregatedResults) {
    this._status.testFinished(config, testResult, aggregatedResults);
  }
  printTestFileHeader(testPath, config, result) {
    // log retry errors if any exist
    result.testResults.forEach(testResult => {
      const testRetryReasons = testResult.retryReasons;
      if (testRetryReasons && testRetryReasons.length > 0) {
        this.log(
          `${_chalk().default.reset.inverse.bold.yellow(
            ' LOGGING RETRY ERRORS '
          )} ${_chalk().default.bold(testResult.fullName)}`
        );
        testRetryReasons.forEach((retryReasons, index) => {
          let {message, stack} = (0,
          _jestMessageUtil().separateMessageFromStack)(retryReasons);
          stack = this._globalConfig.noStackTrace
            ? ''
            : _chalk().default.dim(
                (0, _jestMessageUtil().formatStackTrace)(
                  stack,
                  config,
                  this._globalConfig,
                  testPath
                )
              );
          message = (0, _jestMessageUtil().indentAllLines)(message);
          this.log(
            `${_chalk().default.reset.inverse.bold.blueBright(
              ` RETRY ${index + 1} `
            )}\n`
          );
          this.log(`${message}\n${stack}\n`);
        });
      }
    });
    this.log((0, _getResultHeader.default)(result, this._globalConfig, config));
    if (result.console) {
      this.log(
        `  ${TITLE_BULLET}Console\n\n${(0, _console().getConsoleOutput)(
          result.console,
          config,
          this._globalConfig
        )}`
      );
    }
  }
  printTestFileFailureMessage(_testPath, _config, result) {
    if (result.failureMessage) {
      this.log(result.failureMessage);
    }
    const didUpdate = this._globalConfig.updateSnapshot === 'all';
    const snapshotStatuses = (0, _getSnapshotStatus.default)(
      result.snapshot,
      didUpdate
    );
    snapshotStatuses.forEach(this.log);
  }
}
exports.default = DefaultReporter;

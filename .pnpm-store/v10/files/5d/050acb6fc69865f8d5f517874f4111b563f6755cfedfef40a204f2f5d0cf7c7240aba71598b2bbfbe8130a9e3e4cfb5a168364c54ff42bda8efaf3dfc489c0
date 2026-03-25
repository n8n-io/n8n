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
var _BaseReporter = _interopRequireDefault(require('./BaseReporter'));
var _getResultHeader = _interopRequireDefault(require('./getResultHeader'));
var _getSnapshotSummary = _interopRequireDefault(
  require('./getSnapshotSummary')
);
var _getSummary = _interopRequireDefault(require('./getSummary'));
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {default: obj};
}
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const NPM_EVENTS = new Set([
  'prepublish',
  'publish',
  'postpublish',
  'preinstall',
  'install',
  'postinstall',
  'preuninstall',
  'uninstall',
  'postuninstall',
  'preversion',
  'version',
  'postversion',
  'pretest',
  'test',
  'posttest',
  'prestop',
  'stop',
  'poststop',
  'prestart',
  'start',
  'poststart',
  'prerestart',
  'restart',
  'postrestart'
]);
const {npm_config_user_agent, npm_lifecycle_event, npm_lifecycle_script} =
  process.env;
class SummaryReporter extends _BaseReporter.default {
  _estimatedTime;
  _globalConfig;
  _summaryThreshold;
  static filename = __filename;
  constructor(globalConfig, options) {
    super();
    this._globalConfig = globalConfig;
    this._estimatedTime = 0;
    this._validateOptions(options);
    this._summaryThreshold = options?.summaryThreshold ?? 20;
  }
  _validateOptions(options) {
    if (
      options?.summaryThreshold &&
      typeof options.summaryThreshold !== 'number'
    ) {
      throw new TypeError('The option summaryThreshold should be a number');
    }
  }

  // If we write more than one character at a time it is possible that
  // Node.js exits in the middle of printing the result. This was first observed
  // in Node.js 0.10 and still persists in Node.js 6.7+.
  // Let's print the test failure summary character by character which is safer
  // when hundreds of tests are failing.
  _write(string) {
    for (let i = 0; i < string.length; i++) {
      process.stderr.write(string.charAt(i));
    }
  }
  onRunStart(aggregatedResults, options) {
    super.onRunStart(aggregatedResults, options);
    this._estimatedTime = options.estimatedTime;
  }
  onRunComplete(testContexts, aggregatedResults) {
    const {numTotalTestSuites, testResults, wasInterrupted} = aggregatedResults;
    if (numTotalTestSuites) {
      const lastResult = testResults[testResults.length - 1];
      // Print a newline if the last test did not fail to line up newlines
      // similar to when an error would have been thrown in the test.
      if (
        !this._globalConfig.verbose &&
        lastResult &&
        !lastResult.numFailingTests &&
        !lastResult.testExecError
      ) {
        this.log('');
      }
      this._printSummary(aggregatedResults, this._globalConfig);
      this._printSnapshotSummary(
        aggregatedResults.snapshot,
        this._globalConfig
      );
      let message = (0, _getSummary.default)(aggregatedResults, {
        estimatedTime: this._estimatedTime,
        seed: this._globalConfig.seed,
        showSeed: this._globalConfig.showSeed
      });
      if (!this._globalConfig.silent) {
        message += `\n${
          wasInterrupted
            ? _chalk().default.bold.red('Test run was interrupted.')
            : this._getTestSummary(testContexts, this._globalConfig)
        }`;
      }
      this.log(message);
    }
  }
  _printSnapshotSummary(snapshots, globalConfig) {
    if (
      snapshots.added ||
      snapshots.filesRemoved ||
      snapshots.unchecked ||
      snapshots.unmatched ||
      snapshots.updated
    ) {
      let updateCommand;
      const event = npm_lifecycle_event || '';
      const prefix = NPM_EVENTS.has(event) ? '' : 'run ';
      const isYarn =
        typeof npm_config_user_agent === 'string' &&
        npm_config_user_agent.includes('yarn');
      const client = isYarn ? 'yarn' : 'npm';
      const scriptUsesJest =
        typeof npm_lifecycle_script === 'string' &&
        npm_lifecycle_script.includes('jest');
      if (globalConfig.watch || globalConfig.watchAll) {
        updateCommand = 'press `u`';
      } else if (event && scriptUsesJest) {
        updateCommand = `run \`${`${client} ${prefix}${event}${
          isYarn ? '' : ' --'
        }`} -u\``;
      } else {
        updateCommand = 're-run jest with `-u`';
      }
      const snapshotSummary = (0, _getSnapshotSummary.default)(
        snapshots,
        globalConfig,
        updateCommand
      );
      snapshotSummary.forEach(this.log);
      this.log(''); // print empty line
    }
  }

  _printSummary(aggregatedResults, globalConfig) {
    // If there were any failing tests and there was a large number of tests
    // executed, re-print the failing results at the end of execution output.
    const failedTests = aggregatedResults.numFailedTests;
    const runtimeErrors = aggregatedResults.numRuntimeErrorTestSuites;
    if (
      failedTests + runtimeErrors > 0 &&
      aggregatedResults.numTotalTestSuites > this._summaryThreshold
    ) {
      this.log(_chalk().default.bold('Summary of all failing tests'));
      aggregatedResults.testResults.forEach(testResult => {
        const {failureMessage} = testResult;
        if (failureMessage) {
          this._write(
            `${(0, _getResultHeader.default)(
              testResult,
              globalConfig
            )}\n${failureMessage}\n`
          );
        }
      });
      this.log(''); // print empty line
    }
  }

  _getTestSummary(testContexts, globalConfig) {
    const getMatchingTestsInfo = () => {
      const prefix = globalConfig.findRelatedTests
        ? ' related to files matching '
        : ' matching ';
      return (
        _chalk().default.dim(prefix) +
        (0, _jestUtil().testPathPatternToRegExp)(
          globalConfig.testPathPattern
        ).toString()
      );
    };
    let testInfo = '';
    if (globalConfig.runTestsByPath) {
      testInfo = _chalk().default.dim(' within paths');
    } else if (globalConfig.onlyChanged) {
      testInfo = _chalk().default.dim(' related to changed files');
    } else if (globalConfig.testPathPattern) {
      testInfo = getMatchingTestsInfo();
    }
    let nameInfo = '';
    if (globalConfig.runTestsByPath) {
      nameInfo = ` ${globalConfig.nonFlagArgs.map(p => `"${p}"`).join(', ')}`;
    } else if (globalConfig.testNamePattern) {
      nameInfo = `${_chalk().default.dim(' with tests matching ')}"${
        globalConfig.testNamePattern
      }"`;
    }
    const contextInfo =
      testContexts.size > 1
        ? _chalk().default.dim(' in ') +
          testContexts.size +
          _chalk().default.dim(' projects')
        : '';
    return (
      _chalk().default.dim('Ran all test suites') +
      testInfo +
      nameInfo +
      contextInfo +
      _chalk().default.dim('.')
    );
  }
}
exports.default = SummaryReporter;

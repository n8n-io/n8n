'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.createTestScheduler = createTestScheduler;
function _chalk() {
  const data = _interopRequireDefault(require('chalk'));
  _chalk = function () {
    return data;
  };
  return data;
}
function _ciInfo() {
  const data = require('ci-info');
  _ciInfo = function () {
    return data;
  };
  return data;
}
function _exit() {
  const data = _interopRequireDefault(require('exit'));
  _exit = function () {
    return data;
  };
  return data;
}
function _reporters() {
  const data = require('@jest/reporters');
  _reporters = function () {
    return data;
  };
  return data;
}
function _testResult() {
  const data = require('@jest/test-result');
  _testResult = function () {
    return data;
  };
  return data;
}
function _transform() {
  const data = require('@jest/transform');
  _transform = function () {
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
function _jestSnapshot() {
  const data = require('jest-snapshot');
  _jestSnapshot = function () {
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
var _ReporterDispatcher = _interopRequireDefault(
  require('./ReporterDispatcher')
);
var _testSchedulerHelper = require('./testSchedulerHelper');
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {default: obj};
}
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

async function createTestScheduler(globalConfig, context) {
  const scheduler = new TestScheduler(globalConfig, context);
  await scheduler._setupReporters();
  return scheduler;
}
class TestScheduler {
  _context;
  _dispatcher;
  _globalConfig;
  constructor(globalConfig, context) {
    this._context = context;
    this._dispatcher = new _ReporterDispatcher.default();
    this._globalConfig = globalConfig;
  }
  addReporter(reporter) {
    this._dispatcher.register(reporter);
  }
  removeReporter(reporterConstructor) {
    this._dispatcher.unregister(reporterConstructor);
  }
  async scheduleTests(tests, watcher) {
    const onTestFileStart = this._dispatcher.onTestFileStart.bind(
      this._dispatcher
    );
    const timings = [];
    const testContexts = new Set();
    tests.forEach(test => {
      testContexts.add(test.context);
      if (test.duration) {
        timings.push(test.duration);
      }
    });
    const aggregatedResults = createAggregatedResults(tests.length);
    const estimatedTime = Math.ceil(
      getEstimatedTime(timings, this._globalConfig.maxWorkers) / 1000
    );
    const runInBand = (0, _testSchedulerHelper.shouldRunInBand)(
      tests,
      timings,
      this._globalConfig
    );
    const onResult = async (test, testResult) => {
      if (watcher.isInterrupted()) {
        return Promise.resolve();
      }
      if (testResult.testResults.length === 0) {
        const message = 'Your test suite must contain at least one test.';
        return onFailure(test, {
          message,
          stack: new Error(message).stack
        });
      }

      // Throws when the context is leaked after executing a test.
      if (testResult.leaks) {
        const message =
          `${_chalk().default.red.bold(
            'EXPERIMENTAL FEATURE!\n'
          )}Your test suite is leaking memory. Please ensure all references are cleaned.\n` +
          '\n' +
          'There is a number of things that can leak memory:\n' +
          '  - Async operations that have not finished (e.g. fs.readFile).\n' +
          '  - Timers not properly mocked (e.g. setInterval, setTimeout).\n' +
          '  - Keeping references to the global scope.';
        return onFailure(test, {
          message,
          stack: new Error(message).stack
        });
      }
      (0, _testResult().addResult)(aggregatedResults, testResult);
      await this._dispatcher.onTestFileResult(
        test,
        testResult,
        aggregatedResults
      );
      return this._bailIfNeeded(testContexts, aggregatedResults, watcher);
    };
    const onFailure = async (test, error) => {
      if (watcher.isInterrupted()) {
        return;
      }
      const testResult = (0, _testResult().buildFailureTestResult)(
        test.path,
        error
      );
      testResult.failureMessage = (0, _jestMessageUtil().formatExecError)(
        testResult.testExecError,
        test.context.config,
        this._globalConfig,
        test.path
      );
      (0, _testResult().addResult)(aggregatedResults, testResult);
      await this._dispatcher.onTestFileResult(
        test,
        testResult,
        aggregatedResults
      );
    };
    const updateSnapshotState = async () => {
      const contextsWithSnapshotResolvers = await Promise.all(
        Array.from(testContexts).map(async context => [
          context,
          await (0, _jestSnapshot().buildSnapshotResolver)(context.config)
        ])
      );
      contextsWithSnapshotResolvers.forEach(([context, snapshotResolver]) => {
        const status = (0, _jestSnapshot().cleanup)(
          context.hasteFS,
          this._globalConfig.updateSnapshot,
          snapshotResolver,
          context.config.testPathIgnorePatterns
        );
        aggregatedResults.snapshot.filesRemoved += status.filesRemoved;
        aggregatedResults.snapshot.filesRemovedList = (
          aggregatedResults.snapshot.filesRemovedList || []
        ).concat(status.filesRemovedList);
      });
      const updateAll = this._globalConfig.updateSnapshot === 'all';
      aggregatedResults.snapshot.didUpdate = updateAll;
      aggregatedResults.snapshot.failure = !!(
        !updateAll &&
        (aggregatedResults.snapshot.unchecked ||
          aggregatedResults.snapshot.unmatched ||
          aggregatedResults.snapshot.filesRemoved)
      );
    };
    await this._dispatcher.onRunStart(aggregatedResults, {
      estimatedTime,
      showStatus: !runInBand
    });
    const testRunners = Object.create(null);
    const contextsByTestRunner = new WeakMap();
    try {
      await Promise.all(
        Array.from(testContexts).map(async context => {
          const {config} = context;
          if (!testRunners[config.runner]) {
            const transformer = await (0, _transform().createScriptTransformer)(
              config
            );
            const Runner = await transformer.requireAndTranspileModule(
              config.runner
            );
            const runner = new Runner(this._globalConfig, {
              changedFiles: this._context.changedFiles,
              sourcesRelatedToTestsInChangedFiles:
                this._context.sourcesRelatedToTestsInChangedFiles
            });
            testRunners[config.runner] = runner;
            contextsByTestRunner.set(runner, context);
          }
        })
      );
      const testsByRunner = this._partitionTests(testRunners, tests);
      if (testsByRunner) {
        try {
          for (const runner of Object.keys(testRunners)) {
            const testRunner = testRunners[runner];
            const context = contextsByTestRunner.get(testRunner);
            invariant(context);
            const tests = testsByRunner[runner];
            const testRunnerOptions = {
              serial: runInBand || Boolean(testRunner.isSerial)
            };
            if (testRunner.supportsEventEmitters) {
              const unsubscribes = [
                testRunner.on('test-file-start', ([test]) =>
                  onTestFileStart(test)
                ),
                testRunner.on('test-file-success', ([test, testResult]) =>
                  onResult(test, testResult)
                ),
                testRunner.on('test-file-failure', ([test, error]) =>
                  onFailure(test, error)
                ),
                testRunner.on(
                  'test-case-start',
                  ([testPath, testCaseStartInfo]) => {
                    const test = {
                      context,
                      path: testPath
                    };
                    this._dispatcher.onTestCaseStart(test, testCaseStartInfo);
                  }
                ),
                testRunner.on(
                  'test-case-result',
                  ([testPath, testCaseResult]) => {
                    const test = {
                      context,
                      path: testPath
                    };
                    this._dispatcher.onTestCaseResult(test, testCaseResult);
                  }
                )
              ];
              await testRunner.runTests(tests, watcher, testRunnerOptions);
              unsubscribes.forEach(sub => sub());
            } else {
              await testRunner.runTests(
                tests,
                watcher,
                onTestFileStart,
                onResult,
                onFailure,
                testRunnerOptions
              );
            }
          }
        } catch (error) {
          if (!watcher.isInterrupted()) {
            throw error;
          }
        }
      }
    } catch (error) {
      aggregatedResults.runExecError = buildExecError(error);
      await this._dispatcher.onRunComplete(testContexts, aggregatedResults);
      throw error;
    }
    await updateSnapshotState();
    aggregatedResults.wasInterrupted = watcher.isInterrupted();
    await this._dispatcher.onRunComplete(testContexts, aggregatedResults);
    const anyTestFailures = !(
      aggregatedResults.numFailedTests === 0 &&
      aggregatedResults.numRuntimeErrorTestSuites === 0
    );
    const anyReporterErrors = this._dispatcher.hasErrors();
    aggregatedResults.success = !(
      anyTestFailures ||
      aggregatedResults.snapshot.failure ||
      anyReporterErrors
    );
    return aggregatedResults;
  }
  _partitionTests(testRunners, tests) {
    if (Object.keys(testRunners).length > 1) {
      return tests.reduce((testRuns, test) => {
        const runner = test.context.config.runner;
        if (!testRuns[runner]) {
          testRuns[runner] = [];
        }
        testRuns[runner].push(test);
        return testRuns;
      }, Object.create(null));
    } else if (tests.length > 0 && tests[0] != null) {
      // If there is only one runner, don't partition the tests.
      return Object.assign(Object.create(null), {
        [tests[0].context.config.runner]: tests
      });
    } else {
      return null;
    }
  }
  async _setupReporters() {
    const {collectCoverage: coverage, notify, verbose} = this._globalConfig;
    const reporters = this._globalConfig.reporters || [['default', {}]];
    let summaryOptions = null;
    for (const [reporter, options] of reporters) {
      switch (reporter) {
        case 'default':
          summaryOptions = options;
          verbose
            ? this.addReporter(
                new (_reporters().VerboseReporter)(this._globalConfig)
              )
            : this.addReporter(
                new (_reporters().DefaultReporter)(this._globalConfig)
              );
          break;
        case 'github-actions':
          _ciInfo().GITHUB_ACTIONS &&
            this.addReporter(
              new (_reporters().GitHubActionsReporter)(
                this._globalConfig,
                options
              )
            );
          break;
        case 'summary':
          summaryOptions = options;
          break;
        default:
          await this._addCustomReporter(reporter, options);
      }
    }
    if (notify) {
      this.addReporter(
        new (_reporters().NotifyReporter)(this._globalConfig, this._context)
      );
    }
    if (coverage) {
      this.addReporter(
        new (_reporters().CoverageReporter)(this._globalConfig, this._context)
      );
    }
    if (summaryOptions != null) {
      this.addReporter(
        new (_reporters().SummaryReporter)(this._globalConfig, summaryOptions)
      );
    }
  }
  async _addCustomReporter(reporter, options) {
    try {
      const Reporter = await (0, _jestUtil().requireOrImportModule)(reporter);
      this.addReporter(
        new Reporter(this._globalConfig, options, this._context)
      );
    } catch (error) {
      error.message = `An error occurred while adding the reporter at path "${_chalk().default.bold(
        reporter
      )}".\n${error instanceof Error ? error.message : ''}`;
      throw error;
    }
  }
  async _bailIfNeeded(testContexts, aggregatedResults, watcher) {
    if (
      this._globalConfig.bail !== 0 &&
      aggregatedResults.numFailedTests >= this._globalConfig.bail
    ) {
      if (watcher.isWatchMode()) {
        await watcher.setState({
          interrupted: true
        });
        return;
      }
      try {
        await this._dispatcher.onRunComplete(testContexts, aggregatedResults);
      } finally {
        const exitCode = this._globalConfig.testFailureExitCode;
        (0, _exit().default)(exitCode);
      }
    }
  }
}
function invariant(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
const createAggregatedResults = numTotalTestSuites => {
  const result = (0, _testResult().makeEmptyAggregatedTestResult)();
  result.numTotalTestSuites = numTotalTestSuites;
  result.startTime = Date.now();
  result.success = false;
  return result;
};
const getEstimatedTime = (timings, workers) => {
  if (timings.length === 0) {
    return 0;
  }
  const max = Math.max(...timings);
  return timings.length <= workers
    ? max
    : Math.max(timings.reduce((sum, time) => sum + time) / workers, max);
};
const strToError = errString => {
  const {message, stack} = (0, _jestMessageUtil().separateMessageFromStack)(
    errString
  );
  if (stack.length > 0) {
    return {
      message,
      stack
    };
  }
  const error = new (_jestUtil().ErrorWithStack)(message, buildExecError);
  return {
    message,
    stack: error.stack || ''
  };
};
const buildExecError = err => {
  if (typeof err === 'string' || err == null) {
    return strToError(err || 'Error');
  }
  const anyErr = err;
  if (typeof anyErr.message === 'string') {
    if (typeof anyErr.stack === 'string' && anyErr.stack.length > 0) {
      return anyErr;
    }
    return strToError(anyErr.message);
  }
  return strToError(JSON.stringify(err));
};

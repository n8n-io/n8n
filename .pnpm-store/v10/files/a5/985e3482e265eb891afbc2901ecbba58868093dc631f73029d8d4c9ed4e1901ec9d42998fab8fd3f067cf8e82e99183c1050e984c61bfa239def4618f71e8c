'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.runAndTransformResultsToJestFormat = exports.initialize = void 0;
var _expect = require('@jest/expect');
var _testResult = require('@jest/test-result');
var _jestMessageUtil = require('jest-message-util');
var _jestSnapshot = require('jest-snapshot');
var _ = _interopRequireDefault(require('..'));
var _run = _interopRequireDefault(require('../run'));
var _state = require('../state');
var _testCaseReportHandler = _interopRequireDefault(
  require('../testCaseReportHandler')
);
var _utils = require('../utils');
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {default: obj};
}
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const initialize = async ({
  config,
  environment,
  globalConfig,
  localRequire,
  parentProcess,
  sendMessageToJest,
  setGlobalsForRuntime,
  testPath
}) => {
  if (globalConfig.testTimeout) {
    (0, _state.getState)().testTimeout = globalConfig.testTimeout;
  }
  (0, _state.getState)().maxConcurrency = globalConfig.maxConcurrency;
  (0, _state.getState)().randomize = globalConfig.randomize;
  (0, _state.getState)().seed = globalConfig.seed;

  // @ts-expect-error: missing `concurrent` which is added later
  const globalsObject = {
    ..._.default,
    fdescribe: _.default.describe.only,
    fit: _.default.it.only,
    xdescribe: _.default.describe.skip,
    xit: _.default.it.skip,
    xtest: _.default.it.skip
  };
  (0, _state.addEventHandler)(eventHandler);
  if (environment.handleTestEvent) {
    (0, _state.addEventHandler)(environment.handleTestEvent.bind(environment));
  }
  _expect.jestExpect.setState({
    expand: globalConfig.expand
  });
  const runtimeGlobals = {
    ...globalsObject,
    expect: _expect.jestExpect
  };
  setGlobalsForRuntime(runtimeGlobals);
  if (config.injectGlobals) {
    Object.assign(environment.global, runtimeGlobals);
  }
  await (0, _state.dispatch)({
    name: 'setup',
    parentProcess,
    runtimeGlobals,
    testNamePattern: globalConfig.testNamePattern
  });
  if (config.testLocationInResults) {
    await (0, _state.dispatch)({
      name: 'include_test_location_in_result'
    });
  }

  // Jest tests snapshotSerializers in order preceding built-in serializers.
  // Therefore, add in reverse because the last added is the first tested.
  config.snapshotSerializers
    .concat()
    .reverse()
    .forEach(path => (0, _jestSnapshot.addSerializer)(localRequire(path)));
  const snapshotResolver = await (0, _jestSnapshot.buildSnapshotResolver)(
    config,
    localRequire
  );
  const snapshotPath = snapshotResolver.resolveSnapshotPath(testPath);
  const snapshotState = new _jestSnapshot.SnapshotState(snapshotPath, {
    expand: globalConfig.expand,
    prettierPath: config.prettierPath,
    rootDir: config.rootDir,
    snapshotFormat: config.snapshotFormat,
    updateSnapshot: globalConfig.updateSnapshot
  });
  _expect.jestExpect.setState({
    snapshotState,
    testPath
  });
  (0, _state.addEventHandler)(handleSnapshotStateAfterRetry(snapshotState));
  if (sendMessageToJest) {
    (0, _state.addEventHandler)(
      (0, _testCaseReportHandler.default)(testPath, sendMessageToJest)
    );
  }

  // Return it back to the outer scope (test runner outside the VM).
  return {
    globals: globalsObject,
    snapshotState
  };
};
exports.initialize = initialize;
const runAndTransformResultsToJestFormat = async ({
  config,
  globalConfig,
  testPath
}) => {
  const runResult = await (0, _run.default)();
  let numFailingTests = 0;
  let numPassingTests = 0;
  let numPendingTests = 0;
  let numTodoTests = 0;
  const assertionResults = runResult.testResults.map(testResult => {
    let status;
    if (testResult.status === 'skip') {
      status = 'pending';
      numPendingTests += 1;
    } else if (testResult.status === 'todo') {
      status = 'todo';
      numTodoTests += 1;
    } else if (testResult.errors.length) {
      status = 'failed';
      numFailingTests += 1;
    } else {
      status = 'passed';
      numPassingTests += 1;
    }
    const ancestorTitles = testResult.testPath.filter(
      name => name !== _state.ROOT_DESCRIBE_BLOCK_NAME
    );
    const title = ancestorTitles.pop();
    return {
      ancestorTitles,
      duration: testResult.duration,
      failureDetails: testResult.errorsDetailed,
      failureMessages: testResult.errors,
      fullName: title
        ? ancestorTitles.concat(title).join(' ')
        : ancestorTitles.join(' '),
      invocations: testResult.invocations,
      location: testResult.location,
      numPassingAsserts: testResult.numPassingAsserts,
      retryReasons: testResult.retryReasons,
      status,
      title: testResult.testPath[testResult.testPath.length - 1]
    };
  });
  let failureMessage = (0, _jestMessageUtil.formatResultsErrors)(
    assertionResults,
    config,
    globalConfig,
    testPath
  );
  let testExecError;
  if (runResult.unhandledErrors.length) {
    testExecError = {
      message: '',
      stack: runResult.unhandledErrors.join('\n')
    };
    failureMessage = `${failureMessage || ''}\n\n${runResult.unhandledErrors
      .map(err =>
        (0, _jestMessageUtil.formatExecError)(err, config, globalConfig)
      )
      .join('\n')}`;
  }
  await (0, _state.dispatch)({
    name: 'teardown'
  });
  return {
    ...(0, _testResult.createEmptyTestResult)(),
    console: undefined,
    displayName: config.displayName,
    failureMessage,
    numFailingTests,
    numPassingTests,
    numPendingTests,
    numTodoTests,
    testExecError,
    testFilePath: testPath,
    testResults: assertionResults
  };
};
exports.runAndTransformResultsToJestFormat = runAndTransformResultsToJestFormat;
const handleSnapshotStateAfterRetry = snapshotState => event => {
  switch (event.name) {
    case 'test_retry': {
      // Clear any snapshot data that occurred in previous test run
      snapshotState.clear();
    }
  }
};
const eventHandler = async event => {
  switch (event.name) {
    case 'test_start': {
      _expect.jestExpect.setState({
        currentTestName: (0, _utils.getTestID)(event.test)
      });
      break;
    }
    case 'test_done': {
      event.test.numPassingAsserts =
        _expect.jestExpect.getState().numPassingAsserts;
      _addSuppressedErrors(event.test);
      _addExpectedAssertionErrors(event.test);
      break;
    }
  }
};
const _addExpectedAssertionErrors = test => {
  const failures = _expect.jestExpect.extractExpectedAssertionsErrors();
  const errors = failures.map(failure => failure.error);
  test.errors = test.errors.concat(errors);
};

// Get suppressed errors from ``jest-matchers`` that weren't throw during
// test execution and add them to the test result, potentially failing
// a passing test.
const _addSuppressedErrors = test => {
  const {suppressedErrors} = _expect.jestExpect.getState();
  _expect.jestExpect.setState({
    suppressedErrors: []
  });
  if (suppressedErrors.length) {
    test.errors = test.errors.concat(suppressedErrors);
  }
};

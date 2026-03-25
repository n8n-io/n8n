'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.PROGRESS_BAR_WIDTH = void 0;
exports.default = getSummary;
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

const PROGRESS_BAR_WIDTH = 40;
exports.PROGRESS_BAR_WIDTH = PROGRESS_BAR_WIDTH;
function getValuesCurrentTestCases(currentTestCases = []) {
  let numFailingTests = 0;
  let numPassingTests = 0;
  let numPendingTests = 0;
  let numTodoTests = 0;
  let numTotalTests = 0;
  currentTestCases.forEach(testCase => {
    switch (testCase.testCaseResult.status) {
      case 'failed': {
        numFailingTests++;
        break;
      }
      case 'passed': {
        numPassingTests++;
        break;
      }
      case 'skipped': {
        numPendingTests++;
        break;
      }
      case 'todo': {
        numTodoTests++;
        break;
      }
    }
    numTotalTests++;
  });
  return {
    numFailingTests,
    numPassingTests,
    numPendingTests,
    numTodoTests,
    numTotalTests
  };
}
function renderTime(runTime, estimatedTime, width) {
  // If we are more than one second over the estimated time, highlight it.
  const renderedTime =
    estimatedTime && runTime >= estimatedTime + 1
      ? _chalk().default.bold.yellow((0, _jestUtil().formatTime)(runTime, 0))
      : (0, _jestUtil().formatTime)(runTime, 0);
  let time = `${_chalk().default.bold('Time:')}        ${renderedTime}`;
  if (runTime < estimatedTime) {
    time += `, estimated ${(0, _jestUtil().formatTime)(estimatedTime, 0)}`;
  }

  // Only show a progress bar if the test run is actually going to take
  // some time.
  if (estimatedTime > 2 && runTime < estimatedTime && width) {
    const availableWidth = Math.min(PROGRESS_BAR_WIDTH, width);
    const length = Math.min(
      Math.floor((runTime / estimatedTime) * availableWidth),
      availableWidth
    );
    if (availableWidth >= 2) {
      time += `\n${_chalk().default.green('█').repeat(length)}${_chalk()
        .default.white('█')
        .repeat(availableWidth - length)}`;
    }
  }
  return time;
}
function getSummary(aggregatedResults, options) {
  let runTime = (Date.now() - aggregatedResults.startTime) / 1000;
  if (options && options.roundTime) {
    runTime = Math.floor(runTime);
  }
  const valuesForCurrentTestCases = getValuesCurrentTestCases(
    options?.currentTestCases
  );
  const estimatedTime = (options && options.estimatedTime) || 0;
  const snapshotResults = aggregatedResults.snapshot;
  const snapshotsAdded = snapshotResults.added;
  const snapshotsFailed = snapshotResults.unmatched;
  const snapshotsOutdated = snapshotResults.unchecked;
  const snapshotsFilesRemoved = snapshotResults.filesRemoved;
  const snapshotsDidUpdate = snapshotResults.didUpdate;
  const snapshotsPassed = snapshotResults.matched;
  const snapshotsTotal = snapshotResults.total;
  const snapshotsUpdated = snapshotResults.updated;
  const suitesFailed = aggregatedResults.numFailedTestSuites;
  const suitesPassed = aggregatedResults.numPassedTestSuites;
  const suitesPending = aggregatedResults.numPendingTestSuites;
  const suitesRun = suitesFailed + suitesPassed;
  const suitesTotal = aggregatedResults.numTotalTestSuites;
  const testsFailed = aggregatedResults.numFailedTests;
  const testsPassed = aggregatedResults.numPassedTests;
  const testsPending = aggregatedResults.numPendingTests;
  const testsTodo = aggregatedResults.numTodoTests;
  const testsTotal = aggregatedResults.numTotalTests;
  const width = (options && options.width) || 0;
  const optionalLines = [];
  if (options?.showSeed === true) {
    const {seed} = options;
    if (seed === undefined) {
      throw new Error('Attempted to display seed but seed value is undefined');
    }
    optionalLines.push(`${_chalk().default.bold('Seed:        ') + seed}`);
  }
  const suites = `${
    _chalk().default.bold('Test Suites: ') +
    (suitesFailed
      ? `${_chalk().default.bold.red(`${suitesFailed} failed`)}, `
      : '') +
    (suitesPending
      ? `${_chalk().default.bold.yellow(`${suitesPending} skipped`)}, `
      : '') +
    (suitesPassed
      ? `${_chalk().default.bold.green(`${suitesPassed} passed`)}, `
      : '') +
    (suitesRun !== suitesTotal ? `${suitesRun} of ${suitesTotal}` : suitesTotal)
  } total`;
  const updatedTestsFailed =
    testsFailed + valuesForCurrentTestCases.numFailingTests;
  const updatedTestsPending =
    testsPending + valuesForCurrentTestCases.numPendingTests;
  const updatedTestsTodo = testsTodo + valuesForCurrentTestCases.numTodoTests;
  const updatedTestsPassed =
    testsPassed + valuesForCurrentTestCases.numPassingTests;
  const updatedTestsTotal =
    testsTotal + valuesForCurrentTestCases.numTotalTests;
  const tests = `${
    _chalk().default.bold('Tests:       ') +
    (updatedTestsFailed > 0
      ? `${_chalk().default.bold.red(`${updatedTestsFailed} failed`)}, `
      : '') +
    (updatedTestsPending > 0
      ? `${_chalk().default.bold.yellow(`${updatedTestsPending} skipped`)}, `
      : '') +
    (updatedTestsTodo > 0
      ? `${_chalk().default.bold.magenta(`${updatedTestsTodo} todo`)}, `
      : '') +
    (updatedTestsPassed > 0
      ? `${_chalk().default.bold.green(`${updatedTestsPassed} passed`)}, `
      : '')
  }${updatedTestsTotal} total`;
  const snapshots = `${
    _chalk().default.bold('Snapshots:   ') +
    (snapshotsFailed
      ? `${_chalk().default.bold.red(`${snapshotsFailed} failed`)}, `
      : '') +
    (snapshotsOutdated && !snapshotsDidUpdate
      ? `${_chalk().default.bold.yellow(`${snapshotsOutdated} obsolete`)}, `
      : '') +
    (snapshotsOutdated && snapshotsDidUpdate
      ? `${_chalk().default.bold.green(`${snapshotsOutdated} removed`)}, `
      : '') +
    (snapshotsFilesRemoved && !snapshotsDidUpdate
      ? `${_chalk().default.bold.yellow(
          `${(0, _jestUtil().pluralize)(
            'file',
            snapshotsFilesRemoved
          )} obsolete`
        )}, `
      : '') +
    (snapshotsFilesRemoved && snapshotsDidUpdate
      ? `${_chalk().default.bold.green(
          `${(0, _jestUtil().pluralize)('file', snapshotsFilesRemoved)} removed`
        )}, `
      : '') +
    (snapshotsUpdated
      ? `${_chalk().default.bold.green(`${snapshotsUpdated} updated`)}, `
      : '') +
    (snapshotsAdded
      ? `${_chalk().default.bold.green(`${snapshotsAdded} written`)}, `
      : '') +
    (snapshotsPassed
      ? `${_chalk().default.bold.green(`${snapshotsPassed} passed`)}, `
      : '')
  }${snapshotsTotal} total`;
  const time = renderTime(runTime, estimatedTime, width);
  return [...optionalLines, suites, tests, snapshots, time].join('\n');
}

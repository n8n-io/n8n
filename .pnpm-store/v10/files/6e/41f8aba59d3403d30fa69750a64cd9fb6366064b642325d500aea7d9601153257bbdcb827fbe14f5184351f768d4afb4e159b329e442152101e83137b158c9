'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = formatTestResults;
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const formatTestResult = (testResult, codeCoverageFormatter, reporter) => {
  if (testResult.testExecError) {
    const now = Date.now();
    return {
      assertionResults: testResult.testResults,
      coverage: {},
      endTime: now,
      message: testResult.failureMessage ?? testResult.testExecError.message,
      name: testResult.testFilePath,
      startTime: now,
      status: 'failed',
      summary: ''
    };
  }
  if (testResult.skipped) {
    const now = Date.now();
    return {
      assertionResults: testResult.testResults,
      coverage: {},
      endTime: now,
      message: testResult.failureMessage ?? '',
      name: testResult.testFilePath,
      startTime: now,
      status: 'skipped',
      summary: ''
    };
  }
  const allTestsExecuted = testResult.numPendingTests === 0;
  const allTestsPassed = testResult.numFailingTests === 0;
  return {
    assertionResults: testResult.testResults,
    coverage:
      codeCoverageFormatter != null
        ? codeCoverageFormatter(testResult.coverage, reporter)
        : testResult.coverage,
    endTime: testResult.perfStats.end,
    message: testResult.failureMessage ?? '',
    name: testResult.testFilePath,
    startTime: testResult.perfStats.start,
    status: allTestsPassed
      ? allTestsExecuted
        ? 'passed'
        : 'focused'
      : 'failed',
    summary: ''
  };
};
function formatTestResults(results, codeCoverageFormatter, reporter) {
  const testResults = results.testResults.map(testResult =>
    formatTestResult(testResult, codeCoverageFormatter, reporter)
  );
  return {
    ...results,
    testResults
  };
}

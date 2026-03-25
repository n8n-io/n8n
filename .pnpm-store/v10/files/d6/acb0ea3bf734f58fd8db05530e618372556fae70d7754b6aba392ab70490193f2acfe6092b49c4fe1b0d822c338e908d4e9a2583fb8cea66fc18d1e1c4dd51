'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = void 0;
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

class ReporterDispatcher {
  _reporters;
  constructor() {
    this._reporters = [];
  }
  register(reporter) {
    this._reporters.push(reporter);
  }
  unregister(reporterConstructor) {
    this._reporters = this._reporters.filter(
      reporter => !(reporter instanceof reporterConstructor)
    );
  }
  async onTestFileResult(test, testResult, results) {
    for (const reporter of this._reporters) {
      if (reporter.onTestFileResult) {
        await reporter.onTestFileResult(test, testResult, results);
      } else if (reporter.onTestResult) {
        await reporter.onTestResult(test, testResult, results);
      }
    }

    // Release memory if unused later.
    testResult.coverage = undefined;
    testResult.console = undefined;
  }
  async onTestFileStart(test) {
    for (const reporter of this._reporters) {
      if (reporter.onTestFileStart) {
        await reporter.onTestFileStart(test);
      } else if (reporter.onTestStart) {
        await reporter.onTestStart(test);
      }
    }
  }
  async onRunStart(results, options) {
    for (const reporter of this._reporters) {
      reporter.onRunStart && (await reporter.onRunStart(results, options));
    }
  }
  async onTestCaseStart(test, testCaseStartInfo) {
    for (const reporter of this._reporters) {
      if (reporter.onTestCaseStart) {
        await reporter.onTestCaseStart(test, testCaseStartInfo);
      }
    }
  }
  async onTestCaseResult(test, testCaseResult) {
    for (const reporter of this._reporters) {
      if (reporter.onTestCaseResult) {
        await reporter.onTestCaseResult(test, testCaseResult);
      }
    }
  }
  async onRunComplete(testContexts, results) {
    for (const reporter of this._reporters) {
      if (reporter.onRunComplete) {
        await reporter.onRunComplete(testContexts, results);
      }
    }
  }

  // Return a list of last errors for every reporter
  getErrors() {
    return this._reporters.reduce((list, reporter) => {
      const error = reporter.getLastError && reporter.getLastError();
      return error ? list.concat(error) : list;
    }, []);
  }
  hasErrors() {
    return this.getErrors().length !== 0;
  }
}
exports.default = ReporterDispatcher;

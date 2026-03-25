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

class FailedTestsCache {
  _enabledTestsMap;
  filterTests(tests) {
    const enabledTestsMap = this._enabledTestsMap;
    if (!enabledTestsMap) {
      return tests;
    }
    return tests.filter(testResult => enabledTestsMap[testResult.path]);
  }
  setTestResults(testResults) {
    this._enabledTestsMap = (testResults || []).reduce(
      (suiteMap, testResult) => {
        if (!testResult.numFailingTests) {
          return suiteMap;
        }
        suiteMap[testResult.testFilePath] = testResult.testResults.reduce(
          (testMap, test) => {
            if (test.status !== 'failed') {
              return testMap;
            }
            testMap[test.fullName] = true;
            return testMap;
          },
          {}
        );
        return suiteMap;
      },
      {}
    );
    this._enabledTestsMap = Object.freeze(this._enabledTestsMap);
  }
}
exports.default = FailedTestsCache;

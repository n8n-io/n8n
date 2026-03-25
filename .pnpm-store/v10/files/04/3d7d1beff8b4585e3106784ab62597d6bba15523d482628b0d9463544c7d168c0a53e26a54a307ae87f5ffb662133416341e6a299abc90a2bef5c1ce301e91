'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = void 0;
function crypto() {
  const data = _interopRequireWildcard(require('crypto'));
  crypto = function () {
    return data;
  };
  return data;
}
function path() {
  const data = _interopRequireWildcard(require('path'));
  path = function () {
    return data;
  };
  return data;
}
function fs() {
  const data = _interopRequireWildcard(require('graceful-fs'));
  fs = function () {
    return data;
  };
  return data;
}
function _slash() {
  const data = _interopRequireDefault(require('slash'));
  _slash = function () {
    return data;
  };
  return data;
}
function _jestHasteMap() {
  const data = _interopRequireDefault(require('jest-haste-map'));
  _jestHasteMap = function () {
    return data;
  };
  return data;
}
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {default: obj};
}
function _getRequireWildcardCache(nodeInterop) {
  if (typeof WeakMap !== 'function') return null;
  var cacheBabelInterop = new WeakMap();
  var cacheNodeInterop = new WeakMap();
  return (_getRequireWildcardCache = function (nodeInterop) {
    return nodeInterop ? cacheNodeInterop : cacheBabelInterop;
  })(nodeInterop);
}
function _interopRequireWildcard(obj, nodeInterop) {
  if (!nodeInterop && obj && obj.__esModule) {
    return obj;
  }
  if (obj === null || (typeof obj !== 'object' && typeof obj !== 'function')) {
    return {default: obj};
  }
  var cache = _getRequireWildcardCache(nodeInterop);
  if (cache && cache.has(obj)) {
    return cache.get(obj);
  }
  var newObj = {};
  var hasPropertyDescriptor =
    Object.defineProperty && Object.getOwnPropertyDescriptor;
  for (var key in obj) {
    if (key !== 'default' && Object.prototype.hasOwnProperty.call(obj, key)) {
      var desc = hasPropertyDescriptor
        ? Object.getOwnPropertyDescriptor(obj, key)
        : null;
      if (desc && (desc.get || desc.set)) {
        Object.defineProperty(newObj, key, desc);
      } else {
        newObj[key] = obj[key];
      }
    }
  }
  newObj.default = obj;
  if (cache) {
    cache.set(obj, newObj);
  }
  return newObj;
}
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const FAIL = 0;
const SUCCESS = 1;
/**
 * The TestSequencer will ultimately decide which tests should run first.
 * It is responsible for storing and reading from a local cache
 * map that stores context information for a given test, such as how long it
 * took to run during the last run and if it has failed or not.
 * Such information is used on:
 * TestSequencer.sort(tests: Array<Test>)
 * to sort the order of the provided tests.
 *
 * After the results are collected,
 * TestSequencer.cacheResults(tests: Array<Test>, results: AggregatedResult)
 * is called to store/update this information on the cache map.
 */
class TestSequencer {
  _cache = new Map();
  _getCachePath(testContext) {
    const {config} = testContext;
    const HasteMapClass = _jestHasteMap().default.getStatic(config);
    return HasteMapClass.getCacheFilePath(
      config.cacheDirectory,
      `perf-cache-${config.id}`
    );
  }
  _getCache(test) {
    const {context} = test;
    if (!this._cache.has(context) && context.config.cache) {
      const cachePath = this._getCachePath(context);
      if (fs().existsSync(cachePath)) {
        try {
          this._cache.set(
            context,
            JSON.parse(fs().readFileSync(cachePath, 'utf8'))
          );
        } catch {}
      }
    }
    let cache = this._cache.get(context);
    if (!cache) {
      cache = {};
      this._cache.set(context, cache);
    }
    return cache;
  }
  _shardPosition(options) {
    const shardRest = options.suiteLength % options.shardCount;
    const ratio = options.suiteLength / options.shardCount;
    return new Array(options.shardIndex)
      .fill(true)
      .reduce((acc, _, shardIndex) => {
        const dangles = shardIndex < shardRest;
        const shardSize = dangles ? Math.ceil(ratio) : Math.floor(ratio);
        return acc + shardSize;
      }, 0);
  }

  /**
   * Select tests for shard requested via --shard=shardIndex/shardCount
   * Sharding is applied before sorting
   *
   * @param tests All tests
   * @param options shardIndex and shardIndex to select
   *
   * @example
   * ```typescript
   * class CustomSequencer extends Sequencer {
   *  shard(tests, { shardIndex, shardCount }) {
   *    const shardSize = Math.ceil(tests.length / options.shardCount);
   *    const shardStart = shardSize * (options.shardIndex - 1);
   *    const shardEnd = shardSize * options.shardIndex;
   *    return [...tests]
   *     .sort((a, b) => (a.path > b.path ? 1 : -1))
   *     .slice(shardStart, shardEnd);
   *  }
   * }
   * ```
   */
  shard(tests, options) {
    const shardStart = this._shardPosition({
      shardCount: options.shardCount,
      shardIndex: options.shardIndex - 1,
      suiteLength: tests.length
    });
    const shardEnd = this._shardPosition({
      shardCount: options.shardCount,
      shardIndex: options.shardIndex,
      suiteLength: tests.length
    });
    return tests
      .map(test => {
        const relativeTestPath = path().posix.relative(
          (0, _slash().default)(test.context.config.rootDir),
          (0, _slash().default)(test.path)
        );
        return {
          hash: crypto()
            .createHash('sha1')
            .update(relativeTestPath)
            .digest('hex'),
          test
        };
      })
      .sort((a, b) => (a.hash < b.hash ? -1 : a.hash > b.hash ? 1 : 0))
      .slice(shardStart, shardEnd)
      .map(result => result.test);
  }

  /**
   * Sort test to determine order of execution
   * Sorting is applied after sharding
   * @param tests
   *
   * ```typescript
   * class CustomSequencer extends Sequencer {
   *   sort(tests) {
   *     const copyTests = Array.from(tests);
   *     return [...tests].sort((a, b) => (a.path > b.path ? 1 : -1));
   *   }
   * }
   * ```
   */
  sort(tests) {
    /**
     * Sorting tests is very important because it has a great impact on the
     * user-perceived responsiveness and speed of the test run.
     *
     * If such information is on cache, tests are sorted based on:
     * -> Has it failed during the last run ?
     * Since it's important to provide the most expected feedback as quickly
     * as possible.
     * -> How long it took to run ?
     * Because running long tests first is an effort to minimize worker idle
     * time at the end of a long test run.
     * And if that information is not available they are sorted based on file size
     * since big test files usually take longer to complete.
     *
     * Note that a possible improvement would be to analyse other information
     * from the file other than its size.
     *
     */
    const stats = {};
    const fileSize = ({path, context: {hasteFS}}) =>
      stats[path] || (stats[path] = hasteFS.getSize(path) ?? 0);
    tests.forEach(test => {
      test.duration = this.time(test);
    });
    return tests.sort((testA, testB) => {
      const failedA = this.hasFailed(testA);
      const failedB = this.hasFailed(testB);
      const hasTimeA = testA.duration != null;
      if (failedA !== failedB) {
        return failedA ? -1 : 1;
      } else if (hasTimeA != (testB.duration != null)) {
        // If only one of two tests has timing information, run it last
        return hasTimeA ? 1 : -1;
      } else if (testA.duration != null && testB.duration != null) {
        return testA.duration < testB.duration ? 1 : -1;
      } else {
        return fileSize(testA) < fileSize(testB) ? 1 : -1;
      }
    });
  }
  allFailedTests(tests) {
    return this.sort(tests.filter(test => this.hasFailed(test)));
  }
  cacheResults(tests, results) {
    const map = Object.create(null);
    tests.forEach(test => (map[test.path] = test));
    results.testResults.forEach(testResult => {
      const test = map[testResult.testFilePath];
      if (test != null && !testResult.skipped) {
        const cache = this._getCache(test);
        const perf = testResult.perfStats;
        const testRuntime =
          perf.runtime ?? test.duration ?? perf.end - perf.start;
        cache[testResult.testFilePath] = [
          testResult.numFailingTests > 0 ? FAIL : SUCCESS,
          testRuntime || 0
        ];
      }
    });
    this._cache.forEach((cache, context) =>
      fs().writeFileSync(this._getCachePath(context), JSON.stringify(cache))
    );
  }
  hasFailed(test) {
    const cache = this._getCache(test);
    return cache[test.path]?.[0] === FAIL;
  }
  time(test) {
    const cache = this._getCache(test);
    return cache[test.path]?.[1];
  }
}
exports.default = TestSequencer;

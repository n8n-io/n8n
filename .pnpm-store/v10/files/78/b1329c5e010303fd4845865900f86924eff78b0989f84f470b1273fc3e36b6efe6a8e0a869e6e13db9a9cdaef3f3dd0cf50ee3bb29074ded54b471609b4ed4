'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = shouldInstrument;
function path() {
  const data = _interopRequireWildcard(require('path'));
  path = function () {
    return data;
  };
  return data;
}
function _micromatch() {
  const data = _interopRequireDefault(require('micromatch'));
  _micromatch = function () {
    return data;
  };
  return data;
}
function _jestRegexUtil() {
  const data = require('jest-regex-util');
  _jestRegexUtil = function () {
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

const MOCKS_PATTERN = new RegExp(
  (0, _jestRegexUtil().escapePathForRegex)(
    `${path().sep}__mocks__${path().sep}`
  )
);
const cachedRegexes = new Map();
const getRegex = regexStr => {
  if (!cachedRegexes.has(regexStr)) {
    cachedRegexes.set(regexStr, new RegExp(regexStr));
  }
  const regex = cachedRegexes.get(regexStr);

  // prevent stateful regexes from breaking, just in case
  regex.lastIndex = 0;
  return regex;
};
function shouldInstrument(filename, options, config, loadedFilenames) {
  if (!options.collectCoverage) {
    return false;
  }
  if (
    config.forceCoverageMatch.length &&
    _micromatch().default.any(filename, config.forceCoverageMatch)
  ) {
    return true;
  }
  if (
    !config.testPathIgnorePatterns.some(pattern =>
      getRegex(pattern).test(filename)
    )
  ) {
    if (config.testRegex.some(regex => new RegExp(regex).test(filename))) {
      return false;
    }
    if (
      (0, _jestUtil().globsToMatcher)(config.testMatch)(
        (0, _jestUtil().replacePathSepForGlob)(filename)
      )
    ) {
      return false;
    }
  }
  if (
    options.collectCoverageFrom.length === 0 &&
    loadedFilenames != null &&
    !loadedFilenames.includes(filename)
  ) {
    return false;
  }
  if (
    // still cover if `only` is specified
    options.collectCoverageFrom.length &&
    !(0, _jestUtil().globsToMatcher)(options.collectCoverageFrom)(
      (0, _jestUtil().replacePathSepForGlob)(
        path().relative(config.rootDir, filename)
      )
    )
  ) {
    return false;
  }
  if (
    config.coveragePathIgnorePatterns.some(pattern => !!filename.match(pattern))
  ) {
    return false;
  }
  if (config.globalSetup === filename) {
    return false;
  }
  if (config.globalTeardown === filename) {
    return false;
  }
  if (config.setupFiles.includes(filename)) {
    return false;
  }
  if (config.setupFilesAfterEnv.includes(filename)) {
    return false;
  }
  if (MOCKS_PATTERN.test(filename)) {
    return false;
  }
  if (options.changedFiles && !options.changedFiles.has(filename)) {
    if (!options.sourcesRelatedToTestsInChangedFiles) {
      return false;
    }
    if (!options.sourcesRelatedToTestsInChangedFiles.has(filename)) {
      return false;
    }
  }
  if (filename.endsWith('.json')) {
    return false;
  }
  return true;
}

'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = void 0;
function _path() {
  const data = require('path');
  _path = function () {
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
function _jestRegexUtil() {
  const data = require('jest-regex-util');
  _jestRegexUtil = function () {
    return data;
  };
  return data;
}
var _constants = require('./constants');
var _getCacheDirectory = _interopRequireDefault(require('./getCacheDirectory'));
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {default: obj};
}
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const NODE_MODULES_REGEXP = (0, _jestRegexUtil().replacePathSepForRegex)(
  _constants.NODE_MODULES
);
const defaultOptions = {
  automock: false,
  bail: 0,
  cache: true,
  cacheDirectory: (0, _getCacheDirectory.default)(),
  changedFilesWithAncestor: false,
  ci: _ciInfo().isCI,
  clearMocks: false,
  collectCoverage: false,
  coveragePathIgnorePatterns: [NODE_MODULES_REGEXP],
  coverageProvider: 'babel',
  coverageReporters: ['json', 'text', 'lcov', 'clover'],
  detectLeaks: false,
  detectOpenHandles: false,
  errorOnDeprecated: false,
  expand: false,
  extensionsToTreatAsEsm: [],
  fakeTimers: {
    enableGlobally: false
  },
  forceCoverageMatch: [],
  globals: {},
  haste: {
    computeSha1: false,
    enableSymlinks: false,
    forceNodeFilesystemAPI: true,
    throwOnModuleCollision: false
  },
  injectGlobals: true,
  listTests: false,
  maxConcurrency: 5,
  maxWorkers: '50%',
  moduleDirectories: ['node_modules'],
  moduleFileExtensions: [
    'js',
    'mjs',
    'cjs',
    'jsx',
    'ts',
    'tsx',
    'json',
    'node'
  ],
  moduleNameMapper: {},
  modulePathIgnorePatterns: [],
  noStackTrace: false,
  notify: false,
  notifyMode: 'failure-change',
  openHandlesTimeout: 1000,
  passWithNoTests: false,
  prettierPath: 'prettier',
  resetMocks: false,
  resetModules: false,
  restoreMocks: false,
  roots: ['<rootDir>'],
  runTestsByPath: false,
  runner: 'jest-runner',
  setupFiles: [],
  setupFilesAfterEnv: [],
  skipFilter: false,
  slowTestThreshold: 5,
  snapshotFormat: {
    escapeString: false,
    printBasicPrototype: false
  },
  snapshotSerializers: [],
  testEnvironment: 'jest-environment-node',
  testEnvironmentOptions: {},
  testFailureExitCode: 1,
  testLocationInResults: false,
  testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[tj]s?(x)'],
  testPathIgnorePatterns: [NODE_MODULES_REGEXP],
  testRegex: [],
  testRunner: 'jest-circus/runner',
  testSequencer: '@jest/test-sequencer',
  transformIgnorePatterns: [
    NODE_MODULES_REGEXP,
    `\\.pnp\\.[^\\${_path().sep}]+$`
  ],
  useStderr: false,
  watch: false,
  watchPathIgnorePatterns: [],
  watchman: true,
  workerThreads: false
};
var _default = defaultOptions;
exports.default = _default;

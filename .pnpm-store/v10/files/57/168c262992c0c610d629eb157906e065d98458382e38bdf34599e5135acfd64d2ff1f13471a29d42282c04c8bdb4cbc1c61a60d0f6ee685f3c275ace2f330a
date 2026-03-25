'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.initialProjectOptions = exports.initialOptions = void 0;
function _jestRegexUtil() {
  const data = require('jest-regex-util');
  _jestRegexUtil = function () {
    return data;
  };
  return data;
}
function _jestValidate() {
  const data = require('jest-validate');
  _jestValidate = function () {
    return data;
  };
  return data;
}
function _prettyFormat() {
  const data = require('pretty-format');
  _prettyFormat = function () {
    return data;
  };
  return data;
}
var _constants = require('./constants');
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const NODE_MODULES_REGEXP = (0, _jestRegexUtil().replacePathSepForRegex)(
  _constants.NODE_MODULES
);
const initialOptions = {
  automock: false,
  bail: (0, _jestValidate().multipleValidOptions)(false, 0),
  cache: true,
  cacheDirectory: '/tmp/user/jest',
  changedFilesWithAncestor: false,
  changedSince: 'master',
  ci: false,
  clearMocks: false,
  collectCoverage: true,
  collectCoverageFrom: ['src', '!public'],
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: [NODE_MODULES_REGEXP],
  coverageProvider: 'v8',
  coverageReporters: ['json', 'text', 'lcov', 'clover'],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 100,
      lines: 100,
      statements: 100
    }
  },
  dependencyExtractor: '<rootDir>/dependencyExtractor.js',
  detectLeaks: false,
  detectOpenHandles: false,
  displayName: (0, _jestValidate().multipleValidOptions)('test-config', {
    color: 'blue',
    name: 'test-config'
  }),
  errorOnDeprecated: false,
  expand: false,
  extensionsToTreatAsEsm: [],
  fakeTimers: {
    advanceTimers: (0, _jestValidate().multipleValidOptions)(40, true),
    doNotFake: [
      'Date',
      'hrtime',
      'nextTick',
      'performance',
      'queueMicrotask',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'requestIdleCallback',
      'cancelIdleCallback',
      'setImmediate',
      'clearImmediate',
      'setInterval',
      'clearInterval',
      'setTimeout',
      'clearTimeout'
    ],
    enableGlobally: true,
    legacyFakeTimers: false,
    now: 1483228800000,
    timerLimit: 1000
  },
  filter: '<rootDir>/filter.js',
  forceCoverageMatch: ['**/*.t.js'],
  forceExit: false,
  globalSetup: 'setup.js',
  globalTeardown: 'teardown.js',
  globals: {
    __DEV__: true
  },
  haste: {
    computeSha1: true,
    defaultPlatform: 'ios',
    enableSymlinks: false,
    forceNodeFilesystemAPI: true,
    hasteImplModulePath: '<rootDir>/haste_impl.js',
    hasteMapModulePath: '',
    platforms: ['ios', 'android'],
    retainAllFiles: false,
    throwOnModuleCollision: false
  },
  id: 'string',
  injectGlobals: true,
  json: false,
  lastCommit: false,
  listTests: false,
  logHeapUsage: true,
  maxConcurrency: 5,
  maxWorkers: '50%',
  moduleDirectories: ['node_modules'],
  moduleFileExtensions: [
    'js',
    'mjs',
    'cjs',
    'json',
    'jsx',
    'ts',
    'tsx',
    'node'
  ],
  moduleNameMapper: {
    '^React$': '<rootDir>/node_modules/react'
  },
  modulePathIgnorePatterns: ['<rootDir>/build/'],
  modulePaths: ['/shared/vendor/modules'],
  noStackTrace: false,
  notify: false,
  notifyMode: 'failure-change',
  onlyChanged: false,
  onlyFailures: false,
  openHandlesTimeout: 1000,
  passWithNoTests: false,
  preset: 'react-native',
  prettierPath: '<rootDir>/node_modules/prettier',
  projects: ['project-a', 'project-b/'],
  randomize: false,
  reporters: [
    'default',
    'custom-reporter-1',
    [
      'custom-reporter-2',
      {
        configValue: true
      }
    ]
  ],
  resetMocks: false,
  resetModules: false,
  resolver: '<rootDir>/resolver.js',
  restoreMocks: false,
  rootDir: '/',
  roots: ['<rootDir>'],
  runTestsByPath: false,
  runner: 'jest-runner',
  runtime: '<rootDir>',
  sandboxInjectedGlobals: [],
  setupFiles: ['<rootDir>/setup.js'],
  setupFilesAfterEnv: ['<rootDir>/testSetupFile.js'],
  showSeed: false,
  silent: true,
  skipFilter: false,
  skipNodeResolution: false,
  slowTestThreshold: 5,
  snapshotFormat: _prettyFormat().DEFAULT_OPTIONS,
  snapshotResolver: '<rootDir>/snapshotResolver.js',
  snapshotSerializers: ['my-serializer-module'],
  testEnvironment: 'jest-environment-node',
  testEnvironmentOptions: {
    url: 'http://localhost',
    userAgent: 'Agent/007'
  },
  testFailureExitCode: 1,
  testLocationInResults: false,
  testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
  testNamePattern: 'test signature',
  testPathIgnorePatterns: [NODE_MODULES_REGEXP],
  testRegex: (0, _jestValidate().multipleValidOptions)(
    '(/__tests__/.*|(\\.|/)(test|spec))\\.[jt]sx?$',
    ['/__tests__/\\.test\\.[jt]sx?$', '/__tests__/\\.spec\\.[jt]sx?$']
  ),
  testResultsProcessor: 'processor-node-module',
  testRunner: 'circus',
  testSequencer: '@jest/test-sequencer',
  testTimeout: 5000,
  transform: {
    '\\.js$': '<rootDir>/preprocessor.js'
  },
  transformIgnorePatterns: [NODE_MODULES_REGEXP],
  unmockedModulePathPatterns: ['mock'],
  updateSnapshot: true,
  useStderr: false,
  verbose: false,
  watch: false,
  watchAll: false,
  watchPathIgnorePatterns: ['<rootDir>/e2e/'],
  watchPlugins: [
    'path/to/yourWatchPlugin',
    [
      'jest-watch-typeahead/filename',
      {
        key: 'k',
        prompt: 'do something with my custom prompt'
      }
    ]
  ],
  watchman: true,
  workerIdleMemoryLimit: (0, _jestValidate().multipleValidOptions)(0.2, '50%'),
  workerThreads: true
};
exports.initialOptions = initialOptions;
const initialProjectOptions = {
  automock: false,
  cache: true,
  cacheDirectory: '/tmp/user/jest',
  clearMocks: false,
  collectCoverageFrom: ['src', '!public'],
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: [NODE_MODULES_REGEXP],
  dependencyExtractor: '<rootDir>/dependencyExtractor.js',
  detectLeaks: false,
  detectOpenHandles: false,
  displayName: (0, _jestValidate().multipleValidOptions)('test-config', {
    color: 'blue',
    name: 'test-config'
  }),
  errorOnDeprecated: false,
  extensionsToTreatAsEsm: [],
  fakeTimers: {
    advanceTimers: (0, _jestValidate().multipleValidOptions)(40, true),
    doNotFake: [
      'Date',
      'hrtime',
      'nextTick',
      'performance',
      'queueMicrotask',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'requestIdleCallback',
      'cancelIdleCallback',
      'setImmediate',
      'clearImmediate',
      'setInterval',
      'clearInterval',
      'setTimeout',
      'clearTimeout'
    ],
    enableGlobally: true,
    legacyFakeTimers: false,
    now: 1483228800000,
    timerLimit: 1000
  },
  filter: '<rootDir>/filter.js',
  forceCoverageMatch: ['**/*.t.js'],
  globalSetup: 'setup.js',
  globalTeardown: 'teardown.js',
  globals: {
    __DEV__: true
  },
  haste: {
    computeSha1: true,
    defaultPlatform: 'ios',
    enableSymlinks: false,
    forceNodeFilesystemAPI: true,
    hasteImplModulePath: '<rootDir>/haste_impl.js',
    hasteMapModulePath: '',
    platforms: ['ios', 'android'],
    retainAllFiles: false,
    throwOnModuleCollision: false
  },
  id: 'string',
  injectGlobals: true,
  moduleDirectories: ['node_modules'],
  moduleFileExtensions: [
    'js',
    'mjs',
    'cjs',
    'json',
    'jsx',
    'ts',
    'tsx',
    'node'
  ],
  moduleNameMapper: {
    '^React$': '<rootDir>/node_modules/react'
  },
  modulePathIgnorePatterns: ['<rootDir>/build/'],
  modulePaths: ['/shared/vendor/modules'],
  openHandlesTimeout: 1000,
  preset: 'react-native',
  prettierPath: '<rootDir>/node_modules/prettier',
  resetMocks: false,
  resetModules: false,
  resolver: '<rootDir>/resolver.js',
  restoreMocks: false,
  rootDir: '/',
  roots: ['<rootDir>'],
  runner: 'jest-runner',
  runtime: '<rootDir>',
  sandboxInjectedGlobals: [],
  setupFiles: ['<rootDir>/setup.js'],
  setupFilesAfterEnv: ['<rootDir>/testSetupFile.js'],
  skipFilter: false,
  skipNodeResolution: false,
  slowTestThreshold: 5,
  snapshotFormat: _prettyFormat().DEFAULT_OPTIONS,
  snapshotResolver: '<rootDir>/snapshotResolver.js',
  snapshotSerializers: ['my-serializer-module'],
  testEnvironment: 'jest-environment-node',
  testEnvironmentOptions: {
    url: 'http://localhost',
    userAgent: 'Agent/007'
  },
  testLocationInResults: false,
  testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
  testPathIgnorePatterns: [NODE_MODULES_REGEXP],
  testRegex: (0, _jestValidate().multipleValidOptions)(
    '(/__tests__/.*|(\\.|/)(test|spec))\\.[jt]sx?$',
    ['/__tests__/\\.test\\.[jt]sx?$', '/__tests__/\\.spec\\.[jt]sx?$']
  ),
  testRunner: 'circus',
  transform: {
    '\\.js$': '<rootDir>/preprocessor.js'
  },
  transformIgnorePatterns: [NODE_MODULES_REGEXP],
  unmockedModulePathPatterns: ['mock'],
  watchPathIgnorePatterns: ['<rootDir>/e2e/'],
  workerIdleMemoryLimit: (0, _jestValidate().multipleValidOptions)(0.2, '50%')
};
exports.initialProjectOptions = initialProjectOptions;

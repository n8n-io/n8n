'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.check = check;
exports.usage = exports.options = exports.docs = void 0;
function _jestConfig() {
  const data = require('jest-config');
  _jestConfig = function () {
    return data;
  };
  return data;
}
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

function check(argv) {
  if (
    argv.runInBand &&
    Object.prototype.hasOwnProperty.call(argv, 'maxWorkers')
  ) {
    throw new Error(
      'Both --runInBand and --maxWorkers were specified, only one is allowed.'
    );
  }
  for (const key of [
    'onlyChanged',
    'lastCommit',
    'changedFilesWithAncestor',
    'changedSince'
  ]) {
    if (argv[key] && argv.watchAll) {
      throw new Error(
        `Both --${key} and --watchAll were specified, but cannot be used ` +
          'together. Try the --watch option which reruns only tests ' +
          'related to changed files.'
      );
    }
  }
  if (argv.onlyFailures && argv.watchAll) {
    throw new Error(
      'Both --onlyFailures and --watchAll were specified, only one is allowed.'
    );
  }
  if (argv.findRelatedTests && argv._.length === 0) {
    throw new Error(
      'The --findRelatedTests option requires file paths to be specified.\n' +
        'Example usage: jest --findRelatedTests ./src/source.js ' +
        './src/index.js.'
    );
  }
  if (
    Object.prototype.hasOwnProperty.call(argv, 'maxWorkers') &&
    argv.maxWorkers === undefined
  ) {
    throw new Error(
      'The --maxWorkers (-w) option requires a number or string to be specified.\n' +
        'Example usage: jest --maxWorkers 2\n' +
        'Example usage: jest --maxWorkers 50%\n' +
        'Or did you mean --watch?'
    );
  }
  if (argv.selectProjects && argv.selectProjects.length === 0) {
    throw new Error(
      'The --selectProjects option requires the name of at least one project to be specified.\n' +
        'Example usage: jest --selectProjects my-first-project my-second-project'
    );
  }
  if (argv.ignoreProjects && argv.ignoreProjects.length === 0) {
    throw new Error(
      'The --ignoreProjects option requires the name of at least one project to be specified.\n' +
        'Example usage: jest --ignoreProjects my-first-project my-second-project'
    );
  }
  if (
    argv.config &&
    !(0, _jestConfig().isJSONString)(argv.config) &&
    !argv.config.match(
      new RegExp(
        `\\.(${_jestConfig()
          .constants.JEST_CONFIG_EXT_ORDER.map(e => e.substring(1))
          .join('|')})$`,
        'i'
      )
    )
  ) {
    throw new Error(
      `The --config option requires a JSON string literal, or a file path with one of these extensions: ${_jestConfig().constants.JEST_CONFIG_EXT_ORDER.join(
        ', '
      )}.\nExample usage: jest --config ./jest.config.js`
    );
  }
  return true;
}
const usage = 'Usage: $0 [--config=<pathToConfigFile>] [TestPathPattern]';
exports.usage = usage;
const docs = 'Documentation: https://jestjs.io/';

// The default values are all set in jest-config
exports.docs = docs;
const options = {
  all: {
    description:
      'The opposite of `onlyChanged`. If `onlyChanged` is set by ' +
      'default, running jest with `--all` will force Jest to run all tests ' +
      'instead of running only tests related to changed files.',
    type: 'boolean'
  },
  automock: {
    description: 'Automock all files by default.',
    type: 'boolean'
  },
  bail: {
    alias: 'b',
    description:
      'Exit the test suite immediately after `n` number of failing tests.',
    type: 'boolean'
  },
  cache: {
    description:
      'Whether to use the transform cache. Disable the cache ' +
      'using --no-cache.',
    type: 'boolean'
  },
  cacheDirectory: {
    description:
      'The directory where Jest should store its cached ' +
      ' dependency information.',
    type: 'string'
  },
  changedFilesWithAncestor: {
    description:
      'Runs tests related to the current changes and the changes made in the ' +
      'last commit. Behaves similarly to `--onlyChanged`.',
    type: 'boolean'
  },
  changedSince: {
    description:
      'Runs tests related to the changes since the provided branch. If the ' +
      'current branch has diverged from the given branch, then only changes ' +
      'made locally will be tested. Behaves similarly to `--onlyChanged`.',
    nargs: 1,
    type: 'string'
  },
  ci: {
    description:
      'Whether to run Jest in continuous integration (CI) mode. ' +
      'This option is on by default in most popular CI environments. It will ' +
      'prevent snapshots from being written unless explicitly requested.',
    type: 'boolean'
  },
  clearCache: {
    description:
      'Clears the configured Jest cache directory and then exits. ' +
      'Default directory can be found by calling jest --showConfig',
    type: 'boolean'
  },
  clearMocks: {
    description:
      'Automatically clear mock calls, instances, contexts and results before every test. ' +
      'Equivalent to calling jest.clearAllMocks() before each test.',
    type: 'boolean'
  },
  collectCoverage: {
    description: 'Alias for --coverage.',
    type: 'boolean'
  },
  collectCoverageFrom: {
    description:
      'A glob pattern relative to <rootDir> matching the files that coverage ' +
      'info needs to be collected from.',
    type: 'string'
  },
  color: {
    description:
      'Forces test results output color highlighting (even if ' +
      'stdout is not a TTY). Set to false if you would like to have no colors.',
    type: 'boolean'
  },
  colors: {
    description: 'Alias for `--color`.',
    type: 'boolean'
  },
  config: {
    alias: 'c',
    description:
      'The path to a jest config file specifying how to find ' +
      'and execute tests. If no rootDir is set in the config, the directory ' +
      'containing the config file is assumed to be the rootDir for the project. ' +
      'This can also be a JSON encoded value which Jest will use as configuration.',
    type: 'string'
  },
  coverage: {
    description:
      'Indicates that test coverage information should be ' +
      'collected and reported in the output.',
    type: 'boolean'
  },
  coverageDirectory: {
    description: 'The directory where Jest should output its coverage files.',
    type: 'string'
  },
  coveragePathIgnorePatterns: {
    description:
      'An array of regexp pattern strings that are matched ' +
      'against all file paths before executing the test. If the file path ' +
      'matches any of the patterns, coverage information will be skipped.',
    string: true,
    type: 'array'
  },
  coverageProvider: {
    choices: ['babel', 'v8'],
    description: 'Select between Babel and V8 to collect coverage'
  },
  coverageReporters: {
    description:
      'A list of reporter names that Jest uses when writing ' +
      'coverage reports. Any istanbul reporter can be used.',
    string: true,
    type: 'array'
  },
  coverageThreshold: {
    description:
      'A JSON string with which will be used to configure ' +
      'minimum threshold enforcement for coverage results',
    type: 'string'
  },
  debug: {
    description: 'Print debugging info about your jest config.',
    type: 'boolean'
  },
  detectLeaks: {
    description:
      '**EXPERIMENTAL**: Detect memory leaks in tests. After executing a ' +
      'test, it will try to garbage collect the global object used, and fail ' +
      'if it was leaked',
    type: 'boolean'
  },
  detectOpenHandles: {
    description:
      'Print out remaining open handles preventing Jest from exiting at the ' +
      'end of a test run. Implies `runInBand`.',
    type: 'boolean'
  },
  env: {
    description:
      'The test environment used for all tests. This can point to ' +
      'any file or node module. Examples: `jsdom`, `node` or ' +
      '`path/to/my-environment.js`',
    type: 'string'
  },
  errorOnDeprecated: {
    description: 'Make calling deprecated APIs throw helpful error messages.',
    type: 'boolean'
  },
  expand: {
    alias: 'e',
    description: 'Use this flag to show full diffs instead of a patch.',
    type: 'boolean'
  },
  filter: {
    description:
      'Path to a module exporting a filtering function. This method receives ' +
      'a list of tests which can be manipulated to exclude tests from ' +
      'running. Especially useful when used in conjunction with a testing ' +
      'infrastructure to filter known broken tests.',
    type: 'string'
  },
  findRelatedTests: {
    description:
      'Find related tests for a list of source files that were ' +
      'passed in as arguments. Useful for pre-commit hook integration to run ' +
      'the minimal amount of tests necessary.',
    type: 'boolean'
  },
  forceExit: {
    description:
      'Force Jest to exit after all tests have completed running. ' +
      'This is useful when resources set up by test code cannot be ' +
      'adequately cleaned up.',
    type: 'boolean'
  },
  globalSetup: {
    description: 'The path to a module that runs before All Tests.',
    type: 'string'
  },
  globalTeardown: {
    description: 'The path to a module that runs after All Tests.',
    type: 'string'
  },
  globals: {
    description:
      'A JSON string with map of global variables that need ' +
      'to be available in all test environments.',
    type: 'string'
  },
  haste: {
    description:
      'A JSON string with map of variables for the haste module system',
    type: 'string'
  },
  ignoreProjects: {
    description:
      'Ignore the tests of the specified projects. ' +
      'Jest uses the attribute `displayName` in the configuration to identify each project.',
    string: true,
    type: 'array'
  },
  init: {
    description: 'Generate a basic configuration file',
    type: 'boolean'
  },
  injectGlobals: {
    description: 'Should Jest inject global variables or not',
    type: 'boolean'
  },
  json: {
    description:
      'Prints the test results in JSON. This mode will send all ' +
      'other test output and user messages to stderr.',
    type: 'boolean'
  },
  lastCommit: {
    description:
      'Run all tests affected by file changes in the last commit made. ' +
      'Behaves similarly to `--onlyChanged`.',
    type: 'boolean'
  },
  listTests: {
    description:
      'Lists all tests Jest will run given the arguments and ' +
      'exits. Most useful in a CI system together with `--findRelatedTests` ' +
      'to determine the tests Jest will run based on specific files',
    type: 'boolean'
  },
  logHeapUsage: {
    description:
      'Logs the heap usage after every test. Useful to debug ' +
      'memory leaks. Use together with `--runInBand` and `--expose-gc` in ' +
      'node.',
    type: 'boolean'
  },
  maxConcurrency: {
    description:
      'Specifies the maximum number of tests that are allowed to run ' +
      'concurrently. This only affects tests using `test.concurrent`.',
    type: 'number'
  },
  maxWorkers: {
    alias: 'w',
    description:
      'Specifies the maximum number of workers the worker-pool ' +
      'will spawn for running tests. This defaults to the number of the ' +
      'cores available on your machine. (its usually best not to override ' +
      'this default)',
    type: 'string'
  },
  moduleDirectories: {
    description:
      'An array of directory names to be searched recursively ' +
      "up from the requiring module's location.",
    string: true,
    type: 'array'
  },
  moduleFileExtensions: {
    description:
      'An array of file extensions your modules use. If you ' +
      'require modules without specifying a file extension, these are the ' +
      'extensions Jest will look for.',
    string: true,
    type: 'array'
  },
  moduleNameMapper: {
    description:
      'A JSON string with a map from regular expressions to ' +
      'module names or to arrays of module names that allow to stub ' +
      'out resources, like images or styles with a single module',
    type: 'string'
  },
  modulePathIgnorePatterns: {
    description:
      'An array of regexp pattern strings that are matched ' +
      'against all module paths before those paths are to be considered ' +
      '"visible" to the module loader.',
    string: true,
    type: 'array'
  },
  modulePaths: {
    description:
      'An alternative API to setting the NODE_PATH env variable, ' +
      'modulePaths is an array of absolute paths to additional locations to ' +
      'search when resolving modules.',
    string: true,
    type: 'array'
  },
  noStackTrace: {
    description: 'Disables stack trace in test results output',
    type: 'boolean'
  },
  notify: {
    description: 'Activates notifications for test results.',
    type: 'boolean'
  },
  notifyMode: {
    description: 'Specifies when notifications will appear for test results.',
    type: 'string'
  },
  onlyChanged: {
    alias: 'o',
    description:
      'Attempts to identify which tests to run based on which ' +
      "files have changed in the current repository. Only works if you're " +
      'running tests in a git or hg repository at the moment.',
    type: 'boolean'
  },
  onlyFailures: {
    alias: 'f',
    description: 'Run tests that failed in the previous execution.',
    type: 'boolean'
  },
  openHandlesTimeout: {
    description:
      'Print a warning about probable open handles if Jest does not exit ' +
      'cleanly after this number of milliseconds. `0` to disable.',
    type: 'number'
  },
  outputFile: {
    description:
      'Write test results to a file when the --json option is ' +
      'also specified.',
    type: 'string'
  },
  passWithNoTests: {
    description:
      'Will not fail if no tests are found (for example while using `--testPathPattern`.)',
    type: 'boolean'
  },
  preset: {
    description: "A preset that is used as a base for Jest's configuration.",
    type: 'string'
  },
  prettierPath: {
    description: 'The path to the "prettier" module used for inline snapshots.',
    type: 'string'
  },
  projects: {
    description:
      'A list of projects that use Jest to run all tests of all ' +
      'projects in a single instance of Jest.',
    string: true,
    type: 'array'
  },
  randomize: {
    description:
      'Shuffle the order of the tests within a file. In order to choose the seed refer to the `--seed` CLI option.',
    type: 'boolean'
  },
  reporters: {
    description: 'A list of custom reporters for the test suite.',
    string: true,
    type: 'array'
  },
  resetMocks: {
    description:
      'Automatically reset mock state before every test. ' +
      'Equivalent to calling jest.resetAllMocks() before each test.',
    type: 'boolean'
  },
  resetModules: {
    description:
      'If enabled, the module registry for every test file will ' +
      'be reset before running each individual test.',
    type: 'boolean'
  },
  resolver: {
    description: 'A JSON string which allows the use of a custom resolver.',
    type: 'string'
  },
  restoreMocks: {
    description:
      'Automatically restore mock state and implementation before every test. ' +
      'Equivalent to calling jest.restoreAllMocks() before each test.',
    type: 'boolean'
  },
  rootDir: {
    description:
      'The root directory that Jest should scan for tests and ' +
      'modules within.',
    type: 'string'
  },
  roots: {
    description:
      'A list of paths to directories that Jest should use to ' +
      'search for files in.',
    string: true,
    type: 'array'
  },
  runInBand: {
    alias: 'i',
    description:
      'Run all tests serially in the current process (rather than ' +
      'creating a worker pool of child processes that run tests). This ' +
      'is sometimes useful for debugging, but such use cases are pretty ' +
      'rare.',
    type: 'boolean'
  },
  runTestsByPath: {
    description:
      'Used when provided patterns are exact file paths. This avoids ' +
      'converting them into a regular expression and matching it against ' +
      'every single file.',
    type: 'boolean'
  },
  runner: {
    description:
      "Allows to use a custom runner instead of Jest's default test runner.",
    type: 'string'
  },
  seed: {
    description:
      'Sets a seed value that can be retrieved in a tests file via `jest.getSeed()`. If this option is not specified Jest will randomly generate the value. The seed value must be between `-0x80000000` and `0x7fffffff` inclusive.',
    type: 'number'
  },
  selectProjects: {
    description:
      'Run the tests of the specified projects. ' +
      'Jest uses the attribute `displayName` in the configuration to identify each project.',
    string: true,
    type: 'array'
  },
  setupFiles: {
    description:
      'A list of paths to modules that run some code to configure or ' +
      'set up the testing environment before each test.',
    string: true,
    type: 'array'
  },
  setupFilesAfterEnv: {
    description:
      'A list of paths to modules that run some code to configure or ' +
      'set up the testing framework before each test',
    string: true,
    type: 'array'
  },
  shard: {
    description:
      'Shard tests and execute only the selected shard, specify in ' +
      'the form "current/all". 1-based, for example "3/5".',
    type: 'string'
  },
  showConfig: {
    description: 'Print your jest config and then exits.',
    type: 'boolean'
  },
  showSeed: {
    description:
      'Prints the seed value in the test report summary. See `--seed` for how to set this value',
    type: 'boolean'
  },
  silent: {
    description: 'Prevent tests from printing messages through the console.',
    type: 'boolean'
  },
  skipFilter: {
    description:
      'Disables the filter provided by --filter. Useful for CI jobs, or ' +
      'local enforcement when fixing tests.',
    type: 'boolean'
  },
  snapshotSerializers: {
    description:
      'A list of paths to snapshot serializer modules Jest should ' +
      'use for snapshot testing.',
    string: true,
    type: 'array'
  },
  testEnvironment: {
    description: 'Alias for --env',
    type: 'string'
  },
  testEnvironmentOptions: {
    description:
      'A JSON string with options that will be passed to the `testEnvironment`. ' +
      'The relevant options depend on the environment.',
    type: 'string'
  },
  testFailureExitCode: {
    description: 'Exit code of `jest` command if the test run failed',
    type: 'string' // number
  },

  testLocationInResults: {
    description: 'Add `location` information to the test results',
    type: 'boolean'
  },
  testMatch: {
    description: 'The glob patterns Jest uses to detect test files.',
    string: true,
    type: 'array'
  },
  testNamePattern: {
    alias: 't',
    description: 'Run only tests with a name that matches the regex pattern.',
    type: 'string'
  },
  testPathIgnorePatterns: {
    description:
      'An array of regexp pattern strings that are matched ' +
      'against all test paths before executing the test. If the test path ' +
      'matches any of the patterns, it will be skipped.',
    string: true,
    type: 'array'
  },
  testPathPattern: {
    description:
      'A regexp pattern string that is matched against all tests ' +
      'paths before executing the test.',
    string: true,
    type: 'array'
  },
  testRegex: {
    description:
      'A string or array of string regexp patterns that Jest uses to detect test files.',
    string: true,
    type: 'array'
  },
  testResultsProcessor: {
    description:
      'Allows the use of a custom results processor. ' +
      'This processor must be a node module that exports ' +
      'a function expecting as the first argument the result object.',
    type: 'string'
  },
  testRunner: {
    description:
      'Allows to specify a custom test runner. The default is' +
      ' `jest-circus/runner`. A path to a custom test runner can be provided:' +
      ' `<rootDir>/path/to/testRunner.js`.',
    type: 'string'
  },
  testSequencer: {
    description:
      'Allows to specify a custom test sequencer. The default is ' +
      '`@jest/test-sequencer`. A path to a custom test sequencer can be ' +
      'provided: `<rootDir>/path/to/testSequencer.js`',
    type: 'string'
  },
  testTimeout: {
    description: 'This option sets the default timeouts of test cases.',
    type: 'number'
  },
  transform: {
    description:
      'A JSON string which maps from regular expressions to paths ' +
      'to transformers.',
    type: 'string'
  },
  transformIgnorePatterns: {
    description:
      'An array of regexp pattern strings that are matched ' +
      'against all source file paths before transformation.',
    string: true,
    type: 'array'
  },
  unmockedModulePathPatterns: {
    description:
      'An array of regexp pattern strings that are matched ' +
      'against all modules before the module loader will automatically ' +
      'return a mock for them.',
    string: true,
    type: 'array'
  },
  updateSnapshot: {
    alias: 'u',
    description:
      'Use this flag to re-record snapshots. ' +
      'Can be used together with a test suite pattern or with ' +
      '`--testNamePattern` to re-record snapshot for test matching ' +
      'the pattern',
    type: 'boolean'
  },
  useStderr: {
    description: 'Divert all output to stderr.',
    type: 'boolean'
  },
  verbose: {
    description:
      'Display individual test results with the test suite hierarchy.',
    type: 'boolean'
  },
  watch: {
    description:
      'Watch files for changes and rerun tests related to ' +
      'changed files. If you want to re-run all tests when a file has ' +
      'changed, use the `--watchAll` option.',
    type: 'boolean'
  },
  watchAll: {
    description:
      'Watch files for changes and rerun all tests. If you want ' +
      'to re-run only the tests related to the changed files, use the ' +
      '`--watch` option.',
    type: 'boolean'
  },
  watchPathIgnorePatterns: {
    description:
      'An array of regexp pattern strings that are matched ' +
      'against all paths before trigger test re-run in watch mode. ' +
      'If the test path matches any of the patterns, it will be skipped.',
    string: true,
    type: 'array'
  },
  watchman: {
    description:
      'Whether to use watchman for file crawling. Disable using ' +
      '--no-watchman.',
    type: 'boolean'
  },
  workerThreads: {
    description:
      'Whether to use worker threads for parallelization. Child processes ' +
      'are used by default.',
    type: 'boolean'
  }
};
exports.options = options;

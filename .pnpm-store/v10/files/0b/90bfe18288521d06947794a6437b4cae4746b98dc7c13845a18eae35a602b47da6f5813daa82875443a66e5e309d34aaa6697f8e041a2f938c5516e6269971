'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.constants = void 0;
Object.defineProperty(exports, 'defaults', {
  enumerable: true,
  get: function () {
    return _Defaults.default;
  }
});
Object.defineProperty(exports, 'deprecationEntries', {
  enumerable: true,
  get: function () {
    return _Deprecated.default;
  }
});
Object.defineProperty(exports, 'descriptions', {
  enumerable: true,
  get: function () {
    return _Descriptions.default;
  }
});
Object.defineProperty(exports, 'isJSONString', {
  enumerable: true,
  get: function () {
    return _utils.isJSONString;
  }
});
Object.defineProperty(exports, 'normalize', {
  enumerable: true,
  get: function () {
    return _normalize.default;
  }
});
exports.readConfig = readConfig;
exports.readConfigs = readConfigs;
exports.readInitialOptions = readInitialOptions;
Object.defineProperty(exports, 'replaceRootDirInPath', {
  enumerable: true,
  get: function () {
    return _utils.replaceRootDirInPath;
  }
});
function path() {
  const data = _interopRequireWildcard(require('path'));
  path = function () {
    return data;
  };
  return data;
}
function _chalk() {
  const data = _interopRequireDefault(require('chalk'));
  _chalk = function () {
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
function _jestUtil() {
  const data = require('jest-util');
  _jestUtil = function () {
    return data;
  };
  return data;
}
var constants = _interopRequireWildcard(require('./constants'));
exports.constants = constants;
var _normalize = _interopRequireDefault(require('./normalize'));
var _readConfigFileAndSetRootDir = _interopRequireDefault(
  require('./readConfigFileAndSetRootDir')
);
var _resolveConfigPath = _interopRequireDefault(require('./resolveConfigPath'));
var _utils = require('./utils');
var _Deprecated = _interopRequireDefault(require('./Deprecated'));
var _Defaults = _interopRequireDefault(require('./Defaults'));
var _Descriptions = _interopRequireDefault(require('./Descriptions'));
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

async function readConfig(
  argv,
  packageRootOrConfig,
  // Whether it needs to look into `--config` arg passed to CLI.
  // It only used to read initial config. If the initial config contains
  // `project` property, we don't want to read `--config` value and rather
  // read individual configs for every project.
  skipArgvConfigOption,
  parentConfigDirname,
  projectIndex = Infinity,
  skipMultipleConfigError = false
) {
  const {config: initialOptions, configPath} = await readInitialOptions(
    argv.config,
    {
      packageRootOrConfig,
      parentConfigDirname,
      readFromCwd: skipArgvConfigOption,
      skipMultipleConfigError
    }
  );
  const packageRoot =
    typeof packageRootOrConfig === 'string'
      ? path().resolve(packageRootOrConfig)
      : undefined;
  const {options, hasDeprecationWarnings} = await (0, _normalize.default)(
    initialOptions,
    argv,
    configPath,
    projectIndex,
    skipArgvConfigOption && !(packageRoot === parentConfigDirname)
  );
  const {globalConfig, projectConfig} = groupOptions(options);
  return {
    configPath,
    globalConfig,
    hasDeprecationWarnings,
    projectConfig
  };
}
const groupOptions = options => ({
  globalConfig: Object.freeze({
    bail: options.bail,
    changedFilesWithAncestor: options.changedFilesWithAncestor,
    changedSince: options.changedSince,
    ci: options.ci,
    collectCoverage: options.collectCoverage,
    collectCoverageFrom: options.collectCoverageFrom,
    coverageDirectory: options.coverageDirectory,
    coverageProvider: options.coverageProvider,
    coverageReporters: options.coverageReporters,
    coverageThreshold: options.coverageThreshold,
    detectLeaks: options.detectLeaks,
    detectOpenHandles: options.detectOpenHandles,
    errorOnDeprecated: options.errorOnDeprecated,
    expand: options.expand,
    filter: options.filter,
    findRelatedTests: options.findRelatedTests,
    forceExit: options.forceExit,
    globalSetup: options.globalSetup,
    globalTeardown: options.globalTeardown,
    json: options.json,
    lastCommit: options.lastCommit,
    listTests: options.listTests,
    logHeapUsage: options.logHeapUsage,
    maxConcurrency: options.maxConcurrency,
    maxWorkers: options.maxWorkers,
    noSCM: undefined,
    noStackTrace: options.noStackTrace,
    nonFlagArgs: options.nonFlagArgs,
    notify: options.notify,
    notifyMode: options.notifyMode,
    onlyChanged: options.onlyChanged,
    onlyFailures: options.onlyFailures,
    openHandlesTimeout: options.openHandlesTimeout,
    outputFile: options.outputFile,
    passWithNoTests: options.passWithNoTests,
    projects: options.projects,
    randomize: options.randomize,
    replname: options.replname,
    reporters: options.reporters,
    rootDir: options.rootDir,
    runInBand: options.runInBand,
    runTestsByPath: options.runTestsByPath,
    seed: options.seed,
    shard: options.shard,
    showSeed: options.showSeed,
    silent: options.silent,
    skipFilter: options.skipFilter,
    snapshotFormat: options.snapshotFormat,
    testFailureExitCode: options.testFailureExitCode,
    testNamePattern: options.testNamePattern,
    testPathPattern: options.testPathPattern,
    testResultsProcessor: options.testResultsProcessor,
    testSequencer: options.testSequencer,
    testTimeout: options.testTimeout,
    updateSnapshot: options.updateSnapshot,
    useStderr: options.useStderr,
    verbose: options.verbose,
    watch: options.watch,
    watchAll: options.watchAll,
    watchPlugins: options.watchPlugins,
    watchman: options.watchman,
    workerIdleMemoryLimit: options.workerIdleMemoryLimit,
    workerThreads: options.workerThreads
  }),
  projectConfig: Object.freeze({
    automock: options.automock,
    cache: options.cache,
    cacheDirectory: options.cacheDirectory,
    clearMocks: options.clearMocks,
    collectCoverageFrom: options.collectCoverageFrom,
    coverageDirectory: options.coverageDirectory,
    coveragePathIgnorePatterns: options.coveragePathIgnorePatterns,
    cwd: options.cwd,
    dependencyExtractor: options.dependencyExtractor,
    detectLeaks: options.detectLeaks,
    detectOpenHandles: options.detectOpenHandles,
    displayName: options.displayName,
    errorOnDeprecated: options.errorOnDeprecated,
    extensionsToTreatAsEsm: options.extensionsToTreatAsEsm,
    fakeTimers: options.fakeTimers,
    filter: options.filter,
    forceCoverageMatch: options.forceCoverageMatch,
    globalSetup: options.globalSetup,
    globalTeardown: options.globalTeardown,
    globals: options.globals,
    haste: options.haste,
    id: options.id,
    injectGlobals: options.injectGlobals,
    moduleDirectories: options.moduleDirectories,
    moduleFileExtensions: options.moduleFileExtensions,
    moduleNameMapper: options.moduleNameMapper,
    modulePathIgnorePatterns: options.modulePathIgnorePatterns,
    modulePaths: options.modulePaths,
    openHandlesTimeout: options.openHandlesTimeout,
    prettierPath: options.prettierPath,
    resetMocks: options.resetMocks,
    resetModules: options.resetModules,
    resolver: options.resolver,
    restoreMocks: options.restoreMocks,
    rootDir: options.rootDir,
    roots: options.roots,
    runner: options.runner,
    runtime: options.runtime,
    sandboxInjectedGlobals: options.sandboxInjectedGlobals,
    setupFiles: options.setupFiles,
    setupFilesAfterEnv: options.setupFilesAfterEnv,
    skipFilter: options.skipFilter,
    skipNodeResolution: options.skipNodeResolution,
    slowTestThreshold: options.slowTestThreshold,
    snapshotFormat: options.snapshotFormat,
    snapshotResolver: options.snapshotResolver,
    snapshotSerializers: options.snapshotSerializers,
    testEnvironment: options.testEnvironment,
    testEnvironmentOptions: options.testEnvironmentOptions,
    testLocationInResults: options.testLocationInResults,
    testMatch: options.testMatch,
    testPathIgnorePatterns: options.testPathIgnorePatterns,
    testRegex: options.testRegex,
    testRunner: options.testRunner,
    transform: options.transform,
    transformIgnorePatterns: options.transformIgnorePatterns,
    unmockedModulePathPatterns: options.unmockedModulePathPatterns,
    watchPathIgnorePatterns: options.watchPathIgnorePatterns
  })
});
const ensureNoDuplicateConfigs = (parsedConfigs, projects) => {
  if (projects.length <= 1) {
    return;
  }
  const configPathMap = new Map();
  for (const config of parsedConfigs) {
    const {configPath} = config;
    if (configPathMap.has(configPath)) {
      const message = `Whoops! Two projects resolved to the same config path: ${_chalk().default.bold(
        String(configPath)
      )}:

  Project 1: ${_chalk().default.bold(
    projects[parsedConfigs.findIndex(x => x === config)]
  )}
  Project 2: ${_chalk().default.bold(
    projects[parsedConfigs.findIndex(x => x === configPathMap.get(configPath))]
  )}

This usually means that your ${_chalk().default.bold(
        '"projects"'
      )} config includes a directory that doesn't have any configuration recognizable by Jest. Please fix it.
`;
      throw new Error(message);
    }
    if (configPath !== null) {
      configPathMap.set(configPath, config);
    }
  }
};
/**
 * Reads the jest config, without validating them or filling it out with defaults.
 * @param config The path to the file or serialized config.
 * @param param1 Additional options
 * @returns The raw initial config (not validated)
 */
async function readInitialOptions(
  config,
  {
    packageRootOrConfig = process.cwd(),
    parentConfigDirname = null,
    readFromCwd = false,
    skipMultipleConfigError = false
  } = {}
) {
  if (typeof packageRootOrConfig !== 'string') {
    if (parentConfigDirname) {
      const rawOptions = packageRootOrConfig;
      rawOptions.rootDir = rawOptions.rootDir
        ? (0, _utils.replaceRootDirInPath)(
            parentConfigDirname,
            rawOptions.rootDir
          )
        : parentConfigDirname;
      return {
        config: rawOptions,
        configPath: null
      };
    } else {
      throw new Error(
        'Jest: Cannot use configuration as an object without a file path.'
      );
    }
  }
  if ((0, _utils.isJSONString)(config)) {
    try {
      // A JSON string was passed to `--config` argument and we can parse it
      // and use as is.
      const initialOptions = JSON.parse(config);
      // NOTE: we might need to resolve this dir to an absolute path in the future
      initialOptions.rootDir = initialOptions.rootDir || packageRootOrConfig;
      return {
        config: initialOptions,
        configPath: null
      };
    } catch {
      throw new Error(
        'There was an error while parsing the `--config` argument as a JSON string.'
      );
    }
  }
  if (!readFromCwd && typeof config == 'string') {
    // A string passed to `--config`, which is either a direct path to the config
    // or a path to directory containing `package.json`, `jest.config.js` or `jest.config.ts`
    const configPath = (0, _resolveConfigPath.default)(
      config,
      process.cwd(),
      skipMultipleConfigError
    );
    return {
      config: await (0, _readConfigFileAndSetRootDir.default)(configPath),
      configPath
    };
  }
  // Otherwise just try to find config in the current rootDir.
  const configPath = (0, _resolveConfigPath.default)(
    packageRootOrConfig,
    process.cwd(),
    skipMultipleConfigError
  );
  return {
    config: await (0, _readConfigFileAndSetRootDir.default)(configPath),
    configPath
  };
}

// Possible scenarios:
//  1. jest --config config.json
//  2. jest --projects p1 p2
//  3. jest --projects p1 p2 --config config.json
//  4. jest --projects p1
//  5. jest
//
// If no projects are specified, process.cwd() will be used as the default
// (and only) project.
async function readConfigs(argv, projectPaths) {
  let globalConfig;
  let hasDeprecationWarnings;
  let configs = [];
  let projects = projectPaths;
  let configPath;
  if (projectPaths.length === 1) {
    const parsedConfig = await readConfig(argv, projects[0]);
    configPath = parsedConfig.configPath;
    hasDeprecationWarnings = parsedConfig.hasDeprecationWarnings;
    globalConfig = parsedConfig.globalConfig;
    configs = [parsedConfig.projectConfig];
    if (globalConfig.projects && globalConfig.projects.length) {
      // Even though we had one project in CLI args, there might be more
      // projects defined in the config.
      // In other words, if this was a single project,
      // and its config has `projects` settings, use that value instead.
      projects = globalConfig.projects;
    }
  }
  if (projects.length > 0) {
    const cwd =
      process.platform === 'win32'
        ? (0, _jestUtil().tryRealpath)(process.cwd())
        : process.cwd();
    const projectIsCwd = projects[0] === cwd;
    const parsedConfigs = await Promise.all(
      projects
        .filter(root => {
          // Ignore globbed files that cannot be `require`d.
          if (
            typeof root === 'string' &&
            fs().existsSync(root) &&
            !fs().lstatSync(root).isDirectory() &&
            !constants.JEST_CONFIG_EXT_ORDER.some(ext => root.endsWith(ext))
          ) {
            return false;
          }
          return true;
        })
        .map((root, projectIndex) => {
          const projectIsTheOnlyProject =
            projectIndex === 0 && projects.length === 1;
          const skipArgvConfigOption = !(
            projectIsTheOnlyProject && projectIsCwd
          );
          return readConfig(
            argv,
            root,
            skipArgvConfigOption,
            configPath ? path().dirname(configPath) : cwd,
            projectIndex,
            // we wanna skip the warning if this is the "main" project
            projectIsCwd
          );
        })
    );
    ensureNoDuplicateConfigs(parsedConfigs, projects);
    configs = parsedConfigs.map(({projectConfig}) => projectConfig);
    if (!hasDeprecationWarnings) {
      hasDeprecationWarnings = parsedConfigs.some(
        ({hasDeprecationWarnings}) => !!hasDeprecationWarnings
      );
    }
    // If no config was passed initially, use the one from the first project
    if (!globalConfig) {
      globalConfig = parsedConfigs[0].globalConfig;
    }
  }
  if (!globalConfig || !configs.length) {
    throw new Error('jest: No configuration found for any project.');
  }
  return {
    configs,
    globalConfig,
    hasDeprecationWarnings: !!hasDeprecationWarnings
  };
}

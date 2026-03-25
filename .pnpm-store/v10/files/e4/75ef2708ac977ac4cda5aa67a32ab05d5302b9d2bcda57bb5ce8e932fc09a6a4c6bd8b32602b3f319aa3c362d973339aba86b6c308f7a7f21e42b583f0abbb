'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = normalize;
function _crypto() {
  const data = require('crypto');
  _crypto = function () {
    return data;
  };
  return data;
}
function _os() {
  const data = require('os');
  _os = function () {
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
function _chalk() {
  const data = _interopRequireDefault(require('chalk'));
  _chalk = function () {
    return data;
  };
  return data;
}
function _deepmerge() {
  const data = _interopRequireDefault(require('deepmerge'));
  _deepmerge = function () {
    return data;
  };
  return data;
}
function _glob() {
  const data = require('glob');
  _glob = function () {
    return data;
  };
  return data;
}
function _gracefulFs() {
  const data = require('graceful-fs');
  _gracefulFs = function () {
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
function _jestResolve() {
  const data = _interopRequireWildcard(require('jest-resolve'));
  _jestResolve = function () {
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
function _jestValidate() {
  const data = require('jest-validate');
  _jestValidate = function () {
    return data;
  };
  return data;
}
var _Defaults = _interopRequireDefault(require('./Defaults'));
var _Deprecated = _interopRequireDefault(require('./Deprecated'));
var _ReporterValidationErrors = require('./ReporterValidationErrors');
var _ValidConfig = require('./ValidConfig');
var _color = require('./color');
var _constants = require('./constants');
var _getMaxWorkers = _interopRequireDefault(require('./getMaxWorkers'));
var _parseShardPair = require('./parseShardPair');
var _setFromArgv = _interopRequireDefault(require('./setFromArgv'));
var _stringToBytes = _interopRequireDefault(require('./stringToBytes'));
var _utils = require('./utils');
var _validatePattern = _interopRequireDefault(require('./validatePattern'));
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

const ERROR = `${_utils.BULLET}Validation Error`;
const PRESET_EXTENSIONS = ['.json', '.js', '.cjs', '.mjs'];
const PRESET_NAME = 'jest-preset';
const createConfigError = message =>
  new (_jestValidate().ValidationError)(
    ERROR,
    message,
    _utils.DOCUMENTATION_NOTE
  );
function verifyDirectoryExists(path, key) {
  try {
    const rootStat = (0, _gracefulFs().statSync)(path);
    if (!rootStat.isDirectory()) {
      throw createConfigError(
        `  ${_chalk().default.bold(path)} in the ${_chalk().default.bold(
          key
        )} option is not a directory.`
      );
    }
  } catch (err) {
    if (err instanceof _jestValidate().ValidationError) {
      throw err;
    }
    if (err.code === 'ENOENT') {
      throw createConfigError(
        `  Directory ${_chalk().default.bold(
          path
        )} in the ${_chalk().default.bold(key)} option was not found.`
      );
    }

    // Not sure in which cases `statSync` can throw, so let's just show the underlying error to the user
    throw createConfigError(
      `  Got an error trying to find ${_chalk().default.bold(
        path
      )} in the ${_chalk().default.bold(key)} option.\n\n  Error was: ${
        err.message
      }`
    );
  }
}
const mergeOptionWithPreset = (options, preset, optionName) => {
  if (options[optionName] && preset[optionName]) {
    options[optionName] = {
      ...options[optionName],
      ...preset[optionName],
      ...options[optionName]
    };
  }
};
const mergeGlobalsWithPreset = (options, preset) => {
  if (options.globals && preset.globals) {
    options.globals = (0, _deepmerge().default)(
      preset.globals,
      options.globals
    );
  }
};
const setupPreset = async (options, optionsPreset) => {
  let preset;
  const presetPath = (0, _utils.replaceRootDirInPath)(
    options.rootDir,
    optionsPreset
  );
  const presetModule = _jestResolve().default.findNodeModule(
    presetPath.startsWith('.')
      ? presetPath
      : path().join(presetPath, PRESET_NAME),
    {
      basedir: options.rootDir,
      extensions: PRESET_EXTENSIONS
    }
  );
  try {
    if (!presetModule) {
      throw new Error(`Cannot find module '${presetPath}'`);
    }

    // Force re-evaluation to support multiple projects
    try {
      delete require.cache[require.resolve(presetModule)];
    } catch {}
    preset = await (0, _jestUtil().requireOrImportModule)(presetModule);
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof TypeError) {
      throw createConfigError(
        `  Preset ${_chalk().default.bold(presetPath)} is invalid:\n\n  ${
          error.message
        }\n  ${error.stack}`
      );
    }
    if (error.message.includes('Cannot find module')) {
      if (error.message.includes(presetPath)) {
        const preset = _jestResolve().default.findNodeModule(presetPath, {
          basedir: options.rootDir
        });
        if (preset) {
          throw createConfigError(
            `  Module ${_chalk().default.bold(
              presetPath
            )} should have "jest-preset.js" or "jest-preset.json" file at the root.`
          );
        }
        throw createConfigError(
          `  Preset ${_chalk().default.bold(presetPath)} not found.`
        );
      }
      throw createConfigError(
        `  Missing dependency in ${_chalk().default.bold(presetPath)}:\n\n  ${
          error.message
        }\n  ${error.stack}`
      );
    }
    throw createConfigError(
      `  An unknown error occurred in ${_chalk().default.bold(
        presetPath
      )}:\n\n  ${error.message}\n  ${error.stack}`
    );
  }
  if (options.setupFiles) {
    options.setupFiles = (preset.setupFiles || []).concat(options.setupFiles);
  }
  if (options.setupFilesAfterEnv) {
    options.setupFilesAfterEnv = (preset.setupFilesAfterEnv || []).concat(
      options.setupFilesAfterEnv
    );
  }
  if (options.modulePathIgnorePatterns && preset.modulePathIgnorePatterns) {
    options.modulePathIgnorePatterns = preset.modulePathIgnorePatterns.concat(
      options.modulePathIgnorePatterns
    );
  }
  mergeOptionWithPreset(options, preset, 'moduleNameMapper');
  mergeOptionWithPreset(options, preset, 'transform');
  mergeGlobalsWithPreset(options, preset);
  return {
    ...preset,
    ...options
  };
};
const setupBabelJest = options => {
  const transform = options.transform;
  let babelJest;
  if (transform) {
    const customJSPattern = Object.keys(transform).find(pattern => {
      const regex = new RegExp(pattern);
      return regex.test('a.js') || regex.test('a.jsx');
    });
    const customTSPattern = Object.keys(transform).find(pattern => {
      const regex = new RegExp(pattern);
      return regex.test('a.ts') || regex.test('a.tsx');
    });
    [customJSPattern, customTSPattern].forEach(pattern => {
      if (pattern) {
        const customTransformer = transform[pattern];
        if (Array.isArray(customTransformer)) {
          if (customTransformer[0] === 'babel-jest') {
            babelJest = require.resolve('babel-jest');
            customTransformer[0] = babelJest;
          } else if (customTransformer[0].includes('babel-jest')) {
            babelJest = customTransformer[0];
          }
        } else {
          if (customTransformer === 'babel-jest') {
            babelJest = require.resolve('babel-jest');
            transform[pattern] = babelJest;
          } else if (customTransformer.includes('babel-jest')) {
            babelJest = customTransformer;
          }
        }
      }
    });
  } else {
    babelJest = require.resolve('babel-jest');
    options.transform = {
      [_constants.DEFAULT_JS_PATTERN]: babelJest
    };
  }
};
const normalizeCollectCoverageFrom = (options, key) => {
  const initialCollectCoverageFrom = options[key];
  let value;
  if (!initialCollectCoverageFrom) {
    value = [];
  }
  if (!Array.isArray(initialCollectCoverageFrom)) {
    try {
      value = JSON.parse(initialCollectCoverageFrom);
    } catch {}
    if (options[key] && !Array.isArray(value)) {
      value = [initialCollectCoverageFrom];
    }
  } else {
    value = initialCollectCoverageFrom;
  }
  if (value) {
    value = value.map(filePath =>
      filePath.replace(/^(!?)(<rootDir>\/)(.*)/, '$1$3')
    );
  }
  return value;
};
const normalizeUnmockedModulePathPatterns = (options, key) =>
  // _replaceRootDirTags is specifically well-suited for substituting
  // <rootDir> in paths (it deals with properly interpreting relative path
  // separators, etc).
  //
  // For patterns, direct global substitution is far more ideal, so we
  // special case substitutions for patterns here.
  options[key].map(pattern =>
    (0, _jestRegexUtil().replacePathSepForRegex)(
      pattern.replace(/<rootDir>/g, options.rootDir)
    )
  );
const normalizeMissingOptions = (options, configPath, projectIndex) => {
  if (!options.id) {
    options.id = (0, _crypto().createHash)('sha1')
      .update(options.rootDir)
      // In case we load config from some path that has the same root dir
      .update(configPath || '')
      .update(String(projectIndex))
      .digest('hex')
      .substring(0, 32);
  }
  if (!options.setupFiles) {
    options.setupFiles = [];
  }
  return options;
};
const normalizeRootDir = options => {
  // Assert that there *is* a rootDir
  if (!options.rootDir) {
    throw createConfigError(
      `  Configuration option ${_chalk().default.bold(
        'rootDir'
      )} must be specified.`
    );
  }
  options.rootDir = path().normalize(options.rootDir);
  try {
    // try to resolve windows short paths, ignoring errors (permission errors, mostly)
    options.rootDir = (0, _jestUtil().tryRealpath)(options.rootDir);
  } catch {
    // ignored
  }
  verifyDirectoryExists(options.rootDir, 'rootDir');
  return {
    ...options,
    rootDir: options.rootDir
  };
};
const normalizeReporters = ({reporters, rootDir}) => {
  if (!reporters || !Array.isArray(reporters)) {
    return undefined;
  }
  (0, _ReporterValidationErrors.validateReporters)(reporters);
  return reporters.map(reporterConfig => {
    const normalizedReporterConfig =
      typeof reporterConfig === 'string'
        ? // if reporter config is a string, we wrap it in an array
          // and pass an empty object for options argument, to normalize
          // the shape.
          [reporterConfig, {}]
        : reporterConfig;
    const reporterPath = (0, _utils.replaceRootDirInPath)(
      rootDir,
      normalizedReporterConfig[0]
    );
    if (!['default', 'github-actions', 'summary'].includes(reporterPath)) {
      const reporter = _jestResolve().default.findNodeModule(reporterPath, {
        basedir: rootDir
      });
      if (!reporter) {
        throw new (_jestResolve().default.ModuleNotFoundError)(
          'Could not resolve a module for a custom reporter.\n' +
            `  Module name: ${reporterPath}`
        );
      }
      normalizedReporterConfig[0] = reporter;
    }
    return normalizedReporterConfig;
  });
};
const buildTestPathPattern = argv => {
  const patterns = [];
  if (argv._) {
    patterns.push(...argv._);
  }
  if (argv.testPathPattern) {
    patterns.push(...argv.testPathPattern);
  }
  const replacePosixSep = pattern => {
    // yargs coerces positional args into numbers
    const patternAsString = pattern.toString();
    if (path().sep === '/') {
      return patternAsString;
    }
    return patternAsString.replace(/\//g, '\\\\');
  };
  const testPathPattern = patterns.map(replacePosixSep).join('|');
  if ((0, _validatePattern.default)(testPathPattern)) {
    return testPathPattern;
  } else {
    showTestPathPatternError(testPathPattern);
    return '';
  }
};
const showTestPathPatternError = testPathPattern => {
  (0, _jestUtil().clearLine)(process.stdout);

  // eslint-disable-next-line no-console
  console.log(
    _chalk().default.red(
      `  Invalid testPattern ${testPathPattern} supplied. ` +
        'Running all tests instead.'
    )
  );
};
function validateExtensionsToTreatAsEsm(extensionsToTreatAsEsm) {
  if (!extensionsToTreatAsEsm || extensionsToTreatAsEsm.length === 0) {
    return;
  }
  function printConfig(opts) {
    const string = opts.map(ext => `'${ext}'`).join(', ');
    return _chalk().default.bold(`extensionsToTreatAsEsm: [${string}]`);
  }
  const extensionWithoutDot = extensionsToTreatAsEsm.some(
    ext => !ext.startsWith('.')
  );
  if (extensionWithoutDot) {
    throw createConfigError(`  Option: ${printConfig(
      extensionsToTreatAsEsm
    )} includes a string that does not start with a period (${_chalk().default.bold(
      '.'
    )}).
  Please change your configuration to ${printConfig(
    extensionsToTreatAsEsm.map(ext => (ext.startsWith('.') ? ext : `.${ext}`))
  )}.`);
  }
  if (extensionsToTreatAsEsm.includes('.js')) {
    throw createConfigError(
      `  Option: ${printConfig(
        extensionsToTreatAsEsm
      )} includes ${_chalk().default.bold(
        "'.js'"
      )} which is always inferred based on ${_chalk().default.bold(
        'type'
      )} in its nearest ${_chalk().default.bold('package.json')}.`
    );
  }
  if (extensionsToTreatAsEsm.includes('.cjs')) {
    throw createConfigError(
      `  Option: ${printConfig(
        extensionsToTreatAsEsm
      )} includes ${_chalk().default.bold(
        "'.cjs'"
      )} which is always treated as CommonJS.`
    );
  }
  if (extensionsToTreatAsEsm.includes('.mjs')) {
    throw createConfigError(
      `  Option: ${printConfig(
        extensionsToTreatAsEsm
      )} includes ${_chalk().default.bold(
        "'.mjs'"
      )} which is always treated as an ECMAScript Module.`
    );
  }
}
async function normalize(
  initialOptions,
  argv,
  configPath,
  projectIndex = Infinity,
  isProjectOptions
) {
  const {hasDeprecationWarnings} = (0, _jestValidate().validate)(
    initialOptions,
    {
      comment: _utils.DOCUMENTATION_NOTE,
      deprecatedConfig: _Deprecated.default,
      exampleConfig: isProjectOptions
        ? _ValidConfig.initialProjectOptions
        : _ValidConfig.initialOptions,
      recursiveDenylist: [
        // 'coverageThreshold' allows to use 'global' and glob strings on the same
        // level, there's currently no way we can deal with such config
        'coverageThreshold',
        'globals',
        'moduleNameMapper',
        'testEnvironmentOptions',
        'transform'
      ]
    }
  );
  let options = normalizeMissingOptions(
    normalizeRootDir((0, _setFromArgv.default)(initialOptions, argv)),
    configPath,
    projectIndex
  );
  if (options.preset) {
    options = await setupPreset(options, options.preset);
  }
  if (!options.setupFilesAfterEnv) {
    options.setupFilesAfterEnv = [];
  }
  options.testEnvironment = (0, _jestResolve().resolveTestEnvironment)({
    requireResolveFunction: require.resolve,
    rootDir: options.rootDir,
    testEnvironment:
      options.testEnvironment ||
      require.resolve(_Defaults.default.testEnvironment)
  });
  if (!options.roots) {
    options.roots = [options.rootDir];
  }
  if (
    !options.testRunner ||
    options.testRunner === 'circus' ||
    options.testRunner === 'jest-circus' ||
    options.testRunner === 'jest-circus/runner'
  ) {
    options.testRunner = require.resolve('jest-circus/runner');
  } else if (options.testRunner === 'jasmine2') {
    try {
      options.testRunner = require.resolve('jest-jasmine2');
    } catch (error) {
      if (error.code === 'MODULE_NOT_FOUND') {
        throw createConfigError(
          'jest-jasmine is no longer shipped by default with Jest, you need to install it explicitly or provide an absolute path to Jest'
        );
      }
      throw error;
    }
  }
  if (!options.coverageDirectory) {
    options.coverageDirectory = path().resolve(options.rootDir, 'coverage');
  }
  setupBabelJest(options);
  // TODO: Type this properly
  const newOptions = {
    ..._Defaults.default
  };
  if (options.resolver) {
    newOptions.resolver = (0, _utils.resolve)(null, {
      filePath: options.resolver,
      key: 'resolver',
      rootDir: options.rootDir
    });
  }
  validateExtensionsToTreatAsEsm(options.extensionsToTreatAsEsm);
  if (options.watchman == null) {
    options.watchman = _Defaults.default.watchman;
  }
  const optionKeys = Object.keys(options);
  optionKeys.reduce((newOptions, key) => {
    // The resolver has been resolved separately; skip it
    if (key === 'resolver') {
      return newOptions;
    }

    // This is cheating, because it claims that all keys of InitialOptions are Required.
    // We only really know it's Required for oldOptions[key], not for oldOptions.someOtherKey,
    // so oldOptions[key] is the only way it should be used.
    const oldOptions = options;
    let value;
    switch (key) {
      case 'setupFiles':
      case 'setupFilesAfterEnv':
      case 'snapshotSerializers':
        {
          const option = oldOptions[key];
          value =
            option &&
            option.map(filePath =>
              (0, _utils.resolve)(newOptions.resolver, {
                filePath,
                key,
                rootDir: options.rootDir
              })
            );
        }
        break;
      case 'modulePaths':
      case 'roots':
        {
          const option = oldOptions[key];
          value =
            option &&
            option.map(filePath =>
              path().resolve(
                options.rootDir,
                (0, _utils.replaceRootDirInPath)(options.rootDir, filePath)
              )
            );
        }
        break;
      case 'collectCoverageFrom':
        value = normalizeCollectCoverageFrom(oldOptions, key);
        break;
      case 'cacheDirectory':
      case 'coverageDirectory':
        {
          const option = oldOptions[key];
          value =
            option &&
            path().resolve(
              options.rootDir,
              (0, _utils.replaceRootDirInPath)(options.rootDir, option)
            );
        }
        break;
      case 'dependencyExtractor':
      case 'globalSetup':
      case 'globalTeardown':
      case 'runtime':
      case 'snapshotResolver':
      case 'testResultsProcessor':
      case 'testRunner':
      case 'filter':
        {
          const option = oldOptions[key];
          value =
            option &&
            (0, _utils.resolve)(newOptions.resolver, {
              filePath: option,
              key,
              rootDir: options.rootDir
            });
        }
        break;
      case 'runner':
        {
          const option = oldOptions[key];
          value =
            option &&
            (0, _jestResolve().resolveRunner)(newOptions.resolver, {
              filePath: option,
              requireResolveFunction: require.resolve,
              rootDir: options.rootDir
            });
        }
        break;
      case 'prettierPath':
        {
          // We only want this to throw if "prettierPath" is explicitly passed
          // from config or CLI, and the requested path isn't found. Otherwise we
          // set it to null and throw an error lazily when it is used.

          const option = oldOptions[key];
          value =
            option &&
            (0, _utils.resolve)(newOptions.resolver, {
              filePath: option,
              key,
              optional: option === _Defaults.default[key],
              rootDir: options.rootDir
            });
        }
        break;
      case 'moduleNameMapper':
        const moduleNameMapper = oldOptions[key];
        value =
          moduleNameMapper &&
          Object.keys(moduleNameMapper).map(regex => {
            const item = moduleNameMapper && moduleNameMapper[regex];
            return (
              item && [
                regex,
                (0, _utils._replaceRootDirTags)(options.rootDir, item)
              ]
            );
          });
        break;
      case 'transform':
        const transform = oldOptions[key];
        value =
          transform &&
          Object.keys(transform).map(regex => {
            const transformElement = transform[regex];
            return [
              regex,
              (0, _utils.resolve)(newOptions.resolver, {
                filePath: Array.isArray(transformElement)
                  ? transformElement[0]
                  : transformElement,
                key,
                rootDir: options.rootDir
              }),
              Array.isArray(transformElement) ? transformElement[1] : {}
            ];
          });
        break;
      case 'reporters':
        value = normalizeReporters(oldOptions);
        break;
      case 'coveragePathIgnorePatterns':
      case 'modulePathIgnorePatterns':
      case 'testPathIgnorePatterns':
      case 'transformIgnorePatterns':
      case 'watchPathIgnorePatterns':
      case 'unmockedModulePathPatterns':
        value = normalizeUnmockedModulePathPatterns(oldOptions, key);
        break;
      case 'haste':
        value = {
          ...oldOptions[key]
        };
        if (value.hasteImplModulePath != null) {
          const resolvedHasteImpl = (0, _utils.resolve)(newOptions.resolver, {
            filePath: (0, _utils.replaceRootDirInPath)(
              options.rootDir,
              value.hasteImplModulePath
            ),
            key: 'haste.hasteImplModulePath',
            rootDir: options.rootDir
          });
          value.hasteImplModulePath = resolvedHasteImpl || undefined;
        }
        break;
      case 'projects':
        value = (oldOptions[key] || [])
          .map(project =>
            typeof project === 'string'
              ? (0, _utils._replaceRootDirTags)(options.rootDir, project)
              : project
          )
          .reduce((projects, project) => {
            // Project can be specified as globs. If a glob matches any files,
            // We expand it to these paths. If not, we keep the original path
            // for the future resolution.
            const globMatches =
              typeof project === 'string' ? (0, _glob().sync)(project) : [];
            return projects.concat(globMatches.length ? globMatches : project);
          }, []);
        break;
      case 'moduleDirectories':
      case 'testMatch':
        {
          const replacedRootDirTags = (0, _utils._replaceRootDirTags)(
            (0, _utils.escapeGlobCharacters)(options.rootDir),
            oldOptions[key]
          );
          if (replacedRootDirTags) {
            value = Array.isArray(replacedRootDirTags)
              ? replacedRootDirTags.map(_jestUtil().replacePathSepForGlob)
              : (0, _jestUtil().replacePathSepForGlob)(replacedRootDirTags);
          } else {
            value = replacedRootDirTags;
          }
        }
        break;
      case 'testRegex':
        {
          const option = oldOptions[key];
          value = option
            ? (Array.isArray(option) ? option : [option]).map(
                _jestRegexUtil().replacePathSepForRegex
              )
            : [];
        }
        break;
      case 'moduleFileExtensions': {
        value = oldOptions[key];
        if (
          Array.isArray(value) &&
          // If it's the wrong type, it can throw at a later time
          (options.runner === undefined ||
            options.runner === _Defaults.default.runner) &&
          // Only require 'js' for the default jest-runner
          !value.includes('js')
        ) {
          const errorMessage =
            "  moduleFileExtensions must include 'js':\n" +
            '  but instead received:\n' +
            `    ${_chalk().default.bold.red(JSON.stringify(value))}`;

          // If `js` is not included, any dependency Jest itself injects into
          // the environment, like jasmine or sourcemap-support, will need to
          // `require` its modules with a file extension. This is not plausible
          // in the long run, so it's way easier to just fail hard early.
          // We might consider throwing if `json` is missing as well, as it's a
          // fair assumption from modules that they can do
          // `require('some-package/package') without the trailing `.json` as it
          // works in Node normally.
          throw createConfigError(
            `${errorMessage}\n  Please change your configuration to include 'js'.`
          );
        }
        break;
      }
      case 'bail': {
        const bail = oldOptions[key];
        if (typeof bail === 'boolean') {
          value = bail ? 1 : 0;
        } else if (typeof bail === 'string') {
          value = 1;
          // If Jest is invoked as `jest --bail someTestPattern` then need to
          // move the pattern from the `bail` configuration and into `argv._`
          // to be processed as an extra parameter
          argv._.push(bail);
        } else {
          value = oldOptions[key];
        }
        break;
      }
      case 'displayName': {
        const displayName = oldOptions[key];
        /**
         * Ensuring that displayName shape is correct here so that the
         * reporters can trust the shape of the data
         */
        if (typeof displayName === 'object') {
          const {name, color} = displayName;
          if (
            !name ||
            !color ||
            typeof name !== 'string' ||
            typeof color !== 'string'
          ) {
            const errorMessage =
              `  Option "${_chalk().default.bold(
                'displayName'
              )}" must be of type:\n\n` +
              '  {\n' +
              '    name: string;\n' +
              '    color: string;\n' +
              '  }\n';
            throw createConfigError(errorMessage);
          }
          value = oldOptions[key];
        } else {
          value = {
            color: (0, _color.getDisplayNameColor)(options.runner),
            name: displayName
          };
        }
        break;
      }
      case 'testTimeout': {
        if (oldOptions[key] < 0) {
          throw createConfigError(
            `  Option "${_chalk().default.bold(
              'testTimeout'
            )}" must be a natural number.`
          );
        }
        value = oldOptions[key];
        break;
      }
      case 'snapshotFormat': {
        value = {
          ..._Defaults.default.snapshotFormat,
          ...oldOptions[key]
        };
        break;
      }
      case 'automock':
      case 'cache':
      case 'changedSince':
      case 'changedFilesWithAncestor':
      case 'clearMocks':
      case 'collectCoverage':
      case 'coverageProvider':
      case 'coverageReporters':
      case 'coverageThreshold':
      case 'detectLeaks':
      case 'detectOpenHandles':
      case 'errorOnDeprecated':
      case 'expand':
      case 'extensionsToTreatAsEsm':
      case 'globals':
      case 'fakeTimers':
      case 'findRelatedTests':
      case 'forceCoverageMatch':
      case 'forceExit':
      case 'injectGlobals':
      case 'lastCommit':
      case 'listTests':
      case 'logHeapUsage':
      case 'maxConcurrency':
      case 'id':
      case 'noStackTrace':
      case 'notify':
      case 'notifyMode':
      case 'onlyChanged':
      case 'onlyFailures':
      case 'openHandlesTimeout':
      case 'outputFile':
      case 'passWithNoTests':
      case 'randomize':
      case 'replname':
      case 'resetMocks':
      case 'resetModules':
      case 'restoreMocks':
      case 'rootDir':
      case 'runTestsByPath':
      case 'sandboxInjectedGlobals':
      case 'silent':
      case 'showSeed':
      case 'skipFilter':
      case 'skipNodeResolution':
      case 'slowTestThreshold':
      case 'testEnvironment':
      case 'testEnvironmentOptions':
      case 'testFailureExitCode':
      case 'testLocationInResults':
      case 'testNamePattern':
      case 'useStderr':
      case 'verbose':
      case 'watch':
      case 'watchAll':
      case 'watchman':
      case 'workerThreads':
        value = oldOptions[key];
        break;
      case 'workerIdleMemoryLimit':
        value = (0, _stringToBytes.default)(
          oldOptions[key],
          (0, _os().totalmem)()
        );
        break;
      case 'watchPlugins':
        value = (oldOptions[key] || []).map(watchPlugin => {
          if (typeof watchPlugin === 'string') {
            return {
              config: {},
              path: (0, _jestResolve().resolveWatchPlugin)(
                newOptions.resolver,
                {
                  filePath: watchPlugin,
                  requireResolveFunction: require.resolve,
                  rootDir: options.rootDir
                }
              )
            };
          } else {
            return {
              config: watchPlugin[1] || {},
              path: (0, _jestResolve().resolveWatchPlugin)(
                newOptions.resolver,
                {
                  filePath: watchPlugin[0],
                  requireResolveFunction: require.resolve,
                  rootDir: options.rootDir
                }
              )
            };
          }
        });
        break;
    }
    // @ts-expect-error: automock is missing in GlobalConfig, so what
    newOptions[key] = value;
    return newOptions;
  }, newOptions);
  if (options.watchman && options.haste?.enableSymlinks) {
    throw new (_jestValidate().ValidationError)(
      'Validation Error',
      'haste.enableSymlinks is incompatible with watchman',
      'Either set haste.enableSymlinks to false or do not use watchman'
    );
  }
  newOptions.roots.forEach((root, i) => {
    verifyDirectoryExists(root, `roots[${i}]`);
  });
  try {
    // try to resolve windows short paths, ignoring errors (permission errors, mostly)
    newOptions.cwd = (0, _jestUtil().tryRealpath)(process.cwd());
  } catch {
    // ignored
  }
  newOptions.testSequencer = (0, _jestResolve().resolveSequencer)(
    newOptions.resolver,
    {
      filePath:
        options.testSequencer ||
        require.resolve(_Defaults.default.testSequencer),
      requireResolveFunction: require.resolve,
      rootDir: options.rootDir
    }
  );
  if (newOptions.runner === _Defaults.default.runner) {
    newOptions.runner = require.resolve(newOptions.runner);
  }
  newOptions.nonFlagArgs = argv._?.map(arg => `${arg}`);
  newOptions.testPathPattern = buildTestPathPattern(argv);
  newOptions.json = !!argv.json;
  newOptions.testFailureExitCode = parseInt(newOptions.testFailureExitCode, 10);
  if (
    newOptions.lastCommit ||
    newOptions.changedFilesWithAncestor ||
    newOptions.changedSince
  ) {
    newOptions.onlyChanged = true;
  }
  if (argv.all) {
    newOptions.onlyChanged = false;
    newOptions.onlyFailures = false;
  } else if (newOptions.testPathPattern) {
    // When passing a test path pattern we don't want to only monitor changed
    // files unless `--watch` is also passed.
    newOptions.onlyChanged = newOptions.watch;
  }
  newOptions.randomize = newOptions.randomize || argv.randomize;
  newOptions.showSeed =
    newOptions.randomize || newOptions.showSeed || argv.showSeed;
  const upperBoundSeedValue = 2 ** 31;

  // bounds are determined by xoroshiro128plus which is used in v8 and is used here (at time of writing)
  newOptions.seed =
    argv.seed ??
    Math.floor((2 ** 32 - 1) * Math.random() - upperBoundSeedValue);
  if (
    newOptions.seed < -upperBoundSeedValue ||
    newOptions.seed > upperBoundSeedValue - 1
  ) {
    throw new (_jestValidate().ValidationError)(
      'Validation Error',
      `seed value must be between \`-0x80000000\` and \`0x7fffffff\` inclusive - instead it is ${newOptions.seed}`
    );
  }
  if (!newOptions.onlyChanged) {
    newOptions.onlyChanged = false;
  }
  if (!newOptions.lastCommit) {
    newOptions.lastCommit = false;
  }
  if (!newOptions.onlyFailures) {
    newOptions.onlyFailures = false;
  }
  if (!newOptions.watchAll) {
    newOptions.watchAll = false;
  }

  // as unknown since it can happen. We really need to fix the types here
  if (newOptions.moduleNameMapper === _Defaults.default.moduleNameMapper) {
    newOptions.moduleNameMapper = [];
  }
  if (argv.ci != null) {
    newOptions.ci = argv.ci;
  }
  newOptions.updateSnapshot =
    newOptions.ci && !argv.updateSnapshot
      ? 'none'
      : argv.updateSnapshot
      ? 'all'
      : 'new';
  newOptions.maxConcurrency = parseInt(newOptions.maxConcurrency, 10);
  newOptions.maxWorkers = (0, _getMaxWorkers.default)(argv, options);
  if (newOptions.testRegex.length > 0 && options.testMatch) {
    throw createConfigError(
      `  Configuration options ${_chalk().default.bold('testMatch')} and` +
        ` ${_chalk().default.bold('testRegex')} cannot be used together.`
    );
  }
  if (newOptions.testRegex.length > 0 && !options.testMatch) {
    // Prevent the default testMatch conflicting with any explicitly
    // configured `testRegex` value
    newOptions.testMatch = [];
  }

  // If argv.json is set, coverageReporters shouldn't print a text report.
  if (argv.json) {
    newOptions.coverageReporters = (newOptions.coverageReporters || []).filter(
      reporter => reporter !== 'text'
    );
  }

  // If collectCoverage is enabled while using --findRelatedTests we need to
  // avoid having false negatives in the generated coverage report.
  // The following: `--findRelatedTests '/rootDir/file1.js' --coverage`
  // Is transformed to: `--findRelatedTests '/rootDir/file1.js' --coverage --collectCoverageFrom 'file1.js'`
  // where arguments to `--collectCoverageFrom` should be globs (or relative
  // paths to the rootDir)
  if (newOptions.collectCoverage && argv.findRelatedTests) {
    let collectCoverageFrom = newOptions.nonFlagArgs.map(filename => {
      filename = (0, _utils.replaceRootDirInPath)(options.rootDir, filename);
      return path().isAbsolute(filename)
        ? path().relative(options.rootDir, filename)
        : filename;
    });

    // Don't override existing collectCoverageFrom options
    if (newOptions.collectCoverageFrom) {
      collectCoverageFrom = collectCoverageFrom.reduce((patterns, filename) => {
        if (
          (0, _micromatch().default)(
            [
              (0, _jestUtil().replacePathSepForGlob)(
                path().relative(options.rootDir, filename)
              )
            ],
            newOptions.collectCoverageFrom
          ).length === 0
        ) {
          return patterns;
        }
        return [...patterns, filename];
      }, newOptions.collectCoverageFrom);
    }
    newOptions.collectCoverageFrom = collectCoverageFrom;
  } else if (!newOptions.collectCoverageFrom) {
    newOptions.collectCoverageFrom = [];
  }
  if (!newOptions.findRelatedTests) {
    newOptions.findRelatedTests = false;
  }
  if (!newOptions.projects) {
    newOptions.projects = [];
  }
  if (!newOptions.sandboxInjectedGlobals) {
    newOptions.sandboxInjectedGlobals = [];
  }
  if (!newOptions.forceExit) {
    newOptions.forceExit = false;
  }
  if (!newOptions.logHeapUsage) {
    newOptions.logHeapUsage = false;
  }
  if (argv.shard) {
    newOptions.shard = (0, _parseShardPair.parseShardPair)(argv.shard);
  }
  return {
    hasDeprecationWarnings,
    options: newOptions
  };
}

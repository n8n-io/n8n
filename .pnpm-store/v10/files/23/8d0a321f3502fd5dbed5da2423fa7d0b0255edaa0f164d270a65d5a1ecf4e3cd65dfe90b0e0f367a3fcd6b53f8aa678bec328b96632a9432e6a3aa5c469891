'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = readConfigFileAndSetRootDir;
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
function _parseJson() {
  const data = _interopRequireDefault(require('parse-json'));
  _parseJson = function () {
    return data;
  };
  return data;
}
function _stripJsonComments() {
  const data = _interopRequireDefault(require('strip-json-comments'));
  _stripJsonComments = function () {
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
var _constants = require('./constants');
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

// Read the configuration and set its `rootDir`
// 1. If it's a `package.json` file, we look into its "jest" property
// 2. If it's a `jest.config.ts` file, we use `ts-node` to transpile & require it
// 3. For any other file, we just require it. If we receive an 'ERR_REQUIRE_ESM'
//    from node, perform a dynamic import instead.
async function readConfigFileAndSetRootDir(configPath) {
  const isTS = configPath.endsWith(_constants.JEST_CONFIG_EXT_TS);
  const isJSON = configPath.endsWith(_constants.JEST_CONFIG_EXT_JSON);
  let configObject;
  try {
    if (isTS) {
      configObject = await loadTSConfigFile(configPath);
    } else if (isJSON) {
      const fileContent = fs().readFileSync(configPath, 'utf8');
      configObject = (0, _parseJson().default)(
        (0, _stripJsonComments().default)(fileContent),
        configPath
      );
    } else {
      configObject = await (0, _jestUtil().requireOrImportModule)(configPath);
    }
  } catch (error) {
    if (isTS) {
      throw new Error(
        `Jest: Failed to parse the TypeScript config file ${configPath}\n` +
          `  ${error}`
      );
    }
    throw error;
  }
  if (configPath.endsWith(_constants.PACKAGE_JSON)) {
    // Event if there's no "jest" property in package.json we will still use
    // an empty object.
    configObject = configObject.jest || {};
  }
  if (typeof configObject === 'function') {
    configObject = await configObject();
  }
  if (configObject.rootDir) {
    // We don't touch it if it has an absolute path specified
    if (!path().isAbsolute(configObject.rootDir)) {
      // otherwise, we'll resolve it relative to the file's __dirname
      configObject = {
        ...configObject,
        rootDir: path().resolve(
          path().dirname(configPath),
          configObject.rootDir
        )
      };
    }
  } else {
    // If rootDir is not there, we'll set it to this file's __dirname
    configObject = {
      ...configObject,
      rootDir: path().dirname(configPath)
    };
  }
  return configObject;
}

// Load the TypeScript configuration
const loadTSConfigFile = async configPath => {
  // Get registered TypeScript compiler instance
  const registeredCompiler = await getRegisteredCompiler();
  registeredCompiler.enabled(true);
  let configObject = (0, _jestUtil().interopRequireDefault)(
    require(configPath)
  ).default;

  // In case the config is a function which imports more Typescript code
  if (typeof configObject === 'function') {
    configObject = await configObject();
  }
  registeredCompiler.enabled(false);
  return configObject;
};
let registeredCompilerPromise;
function getRegisteredCompiler() {
  // Cache the promise to avoid multiple registrations
  registeredCompilerPromise = registeredCompilerPromise ?? registerTsNode();
  return registeredCompilerPromise;
}
async function registerTsNode() {
  try {
    // Register TypeScript compiler instance
    const tsNode = await import('ts-node');
    return tsNode.register({
      compilerOptions: {
        module: 'CommonJS'
      },
      moduleTypes: {
        '**': 'cjs'
      }
    });
  } catch (e) {
    if (e.code === 'ERR_MODULE_NOT_FOUND') {
      throw new Error(
        `Jest: 'ts-node' is required for the TypeScript configuration files. Make sure it is installed\nError: ${e.message}`
      );
    }
    throw e;
  }
}

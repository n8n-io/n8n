'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.resolveWatchPlugin =
  exports.resolveTestEnvironment =
  exports.resolveSequencer =
  exports.resolveRunner =
    void 0;
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
function _jestValidate() {
  const data = require('jest-validate');
  _jestValidate = function () {
    return data;
  };
  return data;
}
var _resolver = _interopRequireDefault(require('./resolver'));
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

const BULLET = _chalk().default.bold('\u25cf ');
const DOCUMENTATION_NOTE = `  ${_chalk().default.bold(
  'Configuration Documentation:'
)}
  https://jestjs.io/docs/configuration
`;
const createValidationError = message =>
  new (_jestValidate().ValidationError)(
    `${BULLET}Validation Error`,
    message,
    DOCUMENTATION_NOTE
  );
const replaceRootDirInPath = (rootDir, filePath) => {
  if (!/^<rootDir>/.test(filePath)) {
    return filePath;
  }
  return path().resolve(
    rootDir,
    path().normalize(`./${filePath.substr('<rootDir>'.length)}`)
  );
};
const resolveWithPrefix = (
  resolver,
  {
    filePath,
    humanOptionName,
    optionName,
    prefix,
    requireResolveFunction,
    rootDir
  }
) => {
  const fileName = replaceRootDirInPath(rootDir, filePath);
  let module = _resolver.default.findNodeModule(`${prefix}${fileName}`, {
    basedir: rootDir,
    resolver: resolver || undefined
  });
  if (module) {
    return module;
  }
  try {
    return requireResolveFunction(`${prefix}${fileName}`);
  } catch {}
  module = _resolver.default.findNodeModule(fileName, {
    basedir: rootDir,
    resolver: resolver || undefined
  });
  if (module) {
    return module;
  }
  try {
    return requireResolveFunction(fileName);
  } catch {}
  throw createValidationError(
    `  ${humanOptionName} ${_chalk().default.bold(
      fileName
    )} cannot be found. Make sure the ${_chalk().default.bold(
      optionName
    )} configuration option points to an existing node module.`
  );
};

/**
 * Finds the test environment to use:
 *
 * 1. looks for jest-environment-<name> relative to project.
 * 1. looks for jest-environment-<name> relative to Jest.
 * 1. looks for <name> relative to project.
 * 1. looks for <name> relative to Jest.
 */
const resolveTestEnvironment = ({
  rootDir,
  testEnvironment: filePath,
  requireResolveFunction
}) => {
  // we don't want to resolve the actual `jsdom` module if `jest-environment-jsdom` is not installed, but `jsdom` package is
  if (filePath === 'jsdom') {
    filePath = 'jest-environment-jsdom';
  }
  try {
    return resolveWithPrefix(undefined, {
      filePath,
      humanOptionName: 'Test environment',
      optionName: 'testEnvironment',
      prefix: 'jest-environment-',
      requireResolveFunction,
      rootDir
    });
  } catch (error) {
    if (filePath === 'jest-environment-jsdom') {
      error.message +=
        '\n\nAs of Jest 28 "jest-environment-jsdom" is no longer shipped by default, make sure to install it separately.';
    }
    throw error;
  }
};

/**
 * Finds the watch plugins to use:
 *
 * 1. looks for jest-watch-<name> relative to project.
 * 1. looks for jest-watch-<name> relative to Jest.
 * 1. looks for <name> relative to project.
 * 1. looks for <name> relative to Jest.
 */
exports.resolveTestEnvironment = resolveTestEnvironment;
const resolveWatchPlugin = (
  resolver,
  {filePath, rootDir, requireResolveFunction}
) =>
  resolveWithPrefix(resolver, {
    filePath,
    humanOptionName: 'Watch plugin',
    optionName: 'watchPlugins',
    prefix: 'jest-watch-',
    requireResolveFunction,
    rootDir
  });

/**
 * Finds the runner to use:
 *
 * 1. looks for jest-runner-<name> relative to project.
 * 1. looks for jest-runner-<name> relative to Jest.
 * 1. looks for <name> relative to project.
 * 1. looks for <name> relative to Jest.
 */
exports.resolveWatchPlugin = resolveWatchPlugin;
const resolveRunner = (resolver, {filePath, rootDir, requireResolveFunction}) =>
  resolveWithPrefix(resolver, {
    filePath,
    humanOptionName: 'Jest Runner',
    optionName: 'runner',
    prefix: 'jest-runner-',
    requireResolveFunction,
    rootDir
  });
exports.resolveRunner = resolveRunner;
const resolveSequencer = (
  resolver,
  {filePath, rootDir, requireResolveFunction}
) =>
  resolveWithPrefix(resolver, {
    filePath,
    humanOptionName: 'Jest Sequencer',
    optionName: 'testSequencer',
    prefix: 'jest-sequencer-',
    requireResolveFunction,
    rootDir
  });
exports.resolveSequencer = resolveSequencer;

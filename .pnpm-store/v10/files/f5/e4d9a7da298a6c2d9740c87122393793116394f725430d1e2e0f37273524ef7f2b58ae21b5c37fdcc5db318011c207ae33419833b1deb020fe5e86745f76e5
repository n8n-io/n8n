'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.resolve =
  exports.replaceRootDirInPath =
  exports.isJSONString =
  exports.escapeGlobCharacters =
  exports._replaceRootDirTags =
  exports.DOCUMENTATION_NOTE =
  exports.BULLET =
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
function _jestResolve() {
  const data = _interopRequireDefault(require('jest-resolve'));
  _jestResolve = function () {
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
exports.BULLET = BULLET;
const DOCUMENTATION_NOTE = `  ${_chalk().default.bold(
  'Configuration Documentation:'
)}
  https://jestjs.io/docs/configuration
`;
exports.DOCUMENTATION_NOTE = DOCUMENTATION_NOTE;
const createValidationError = message =>
  new (_jestValidate().ValidationError)(
    `${BULLET}Validation Error`,
    message,
    DOCUMENTATION_NOTE
  );
const resolve = (resolver, {key, filePath, rootDir, optional}) => {
  const module = _jestResolve().default.findNodeModule(
    replaceRootDirInPath(rootDir, filePath),
    {
      basedir: rootDir,
      resolver: resolver || undefined
    }
  );
  if (!module && !optional) {
    throw createValidationError(`  Module ${_chalk().default.bold(
      filePath
    )} in the ${_chalk().default.bold(key)} option was not found.
         ${_chalk().default.bold('<rootDir>')} is: ${rootDir}`);
  }
  /// can cast as string since nulls will be thrown
  return module;
};
exports.resolve = resolve;
const escapeGlobCharacters = path => path.replace(/([()*{}[\]!?\\])/g, '\\$1');
exports.escapeGlobCharacters = escapeGlobCharacters;
const replaceRootDirInPath = (rootDir, filePath) => {
  if (!/^<rootDir>/.test(filePath)) {
    return filePath;
  }
  return path().resolve(
    rootDir,
    path().normalize(`./${filePath.substring('<rootDir>'.length)}`)
  );
};
exports.replaceRootDirInPath = replaceRootDirInPath;
const _replaceRootDirInObject = (rootDir, config) => {
  const newConfig = {};
  for (const configKey in config) {
    newConfig[configKey] =
      configKey === 'rootDir'
        ? config[configKey]
        : _replaceRootDirTags(rootDir, config[configKey]);
  }
  return newConfig;
};
const _replaceRootDirTags = (rootDir, config) => {
  if (config == null) {
    return config;
  }
  switch (typeof config) {
    case 'object':
      if (Array.isArray(config)) {
        /// can be string[] or {}[]
        return config.map(item => _replaceRootDirTags(rootDir, item));
      }
      if (config instanceof RegExp) {
        return config;
      }
      return _replaceRootDirInObject(rootDir, config);
    case 'string':
      return replaceRootDirInPath(rootDir, config);
  }
  return config;
};
exports._replaceRootDirTags = _replaceRootDirTags;
// newtype
const isJSONString = text =>
  text != null &&
  typeof text === 'string' &&
  text.startsWith('{') &&
  text.endsWith('}');
exports.isJSONString = isJSONString;

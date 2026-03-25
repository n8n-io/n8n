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
function _jestPnpResolver() {
  const data = _interopRequireDefault(require('jest-pnp-resolver'));
  _jestPnpResolver = function () {
    return data;
  };
  return data;
}
function _resolve() {
  const data = require('resolve');
  _resolve = function () {
    return data;
  };
  return data;
}
var resolve = _interopRequireWildcard(require('resolve.exports'));
var _fileWalkers = require('./fileWalkers');
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
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {default: obj};
}
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Allows transforming parsed `package.json` contents.
 *
 * @param pkg - Parsed `package.json` contents.
 * @param file - Path to `package.json` file.
 * @param dir - Directory that contains the `package.json`.
 *
 * @returns Transformed `package.json` contents.
 */

/**
 * Allows transforming a path within a package.
 *
 * @param pkg - Parsed `package.json` contents.
 * @param path - Path being resolved.
 * @param relativePath - Path relative from the `package.json` location.
 *
 * @returns Relative path that will be joined from the `package.json` location.
 */

const defaultResolver = (path, options) => {
  // Yarn 2 adds support to `resolve` automatically so the pnpResolver is only
  // needed for Yarn 1 which implements version 1 of the pnp spec
  if (process.versions.pnp === '1') {
    return (0, _jestPnpResolver().default)(path, options);
  }
  const resolveOptions = {
    ...options,
    isDirectory: _fileWalkers.isDirectory,
    isFile: _fileWalkers.isFile,
    preserveSymlinks: false,
    readPackageSync,
    realpathSync: _fileWalkers.realpathSync
  };
  const pathToResolve = getPathInModule(path, resolveOptions);

  // resolveSync dereferences symlinks to ensure we don't create a separate
  // module instance depending on how it was referenced.
  const result = (0, _resolve().sync)(pathToResolve, resolveOptions);
  return result;
};
var _default = defaultResolver;
/*
 * helper functions
 */
exports.default = _default;
function readPackageSync(_, file) {
  return (0, _fileWalkers.readPackageCached)(file);
}
function getPathInModule(path, options) {
  if (shouldIgnoreRequestForExports(path)) {
    return path;
  }
  if (path.startsWith('#')) {
    const closestPackageJson = (0, _fileWalkers.findClosestPackageJson)(
      options.basedir
    );
    if (!closestPackageJson) {
      throw new Error(
        `Jest: unable to locate closest package.json from ${options.basedir} when resolving import "${path}"`
      );
    }
    const pkg = (0, _fileWalkers.readPackageCached)(closestPackageJson);
    const resolved = resolve.imports(
      pkg,
      path,
      createResolveOptions(options.conditions)
    );
    if (resolved) {
      const target = resolved[0];
      return target.startsWith('.')
        ? // internal relative filepath
          (0, _path().resolve)((0, _path().dirname)(closestPackageJson), target)
        : // this is an external module, re-resolve it
          defaultResolver(target, options);
    }
    if (pkg.imports) {
      throw new Error(
        '`imports` exists, but no results - this is a bug in Jest. Please report an issue'
      );
    }
  }
  const segments = path.split('/');
  let moduleName = segments.shift();
  if (moduleName) {
    if (moduleName.startsWith('@')) {
      moduleName = `${moduleName}/${segments.shift()}`;
    }

    // self-reference
    const closestPackageJson = (0, _fileWalkers.findClosestPackageJson)(
      options.basedir
    );
    if (closestPackageJson) {
      const pkg = (0, _fileWalkers.readPackageCached)(closestPackageJson);
      if (pkg.name === moduleName) {
        const resolved = resolve.exports(
          pkg,
          segments.join('/') || '.',
          createResolveOptions(options.conditions)
        );
        if (resolved) {
          return (0, _path().resolve)(
            (0, _path().dirname)(closestPackageJson),
            resolved[0]
          );
        }
        if (pkg.exports) {
          throw new Error(
            '`exports` exists, but no results - this is a bug in Jest. Please report an issue'
          );
        }
      }
    }
    let packageJsonPath = '';
    try {
      packageJsonPath = (0, _resolve().sync)(
        `${moduleName}/package.json`,
        options
      );
    } catch {
      // ignore if package.json cannot be found
    }
    if (packageJsonPath && (0, _fileWalkers.isFile)(packageJsonPath)) {
      const pkg = (0, _fileWalkers.readPackageCached)(packageJsonPath);
      const resolved = resolve.exports(
        pkg,
        segments.join('/') || '.',
        createResolveOptions(options.conditions)
      );
      if (resolved) {
        return (0, _path().resolve)(
          (0, _path().dirname)(packageJsonPath),
          resolved[0]
        );
      }
      if (pkg.exports) {
        throw new Error(
          '`exports` exists, but no results - this is a bug in Jest. Please report an issue'
        );
      }
    }
  }
  return path;
}
function createResolveOptions(conditions) {
  return conditions
    ? {
        conditions,
        unsafe: true
      }
    : // no conditions were passed - let's assume this is Jest internal and it should be `require`
      {
        browser: false,
        require: true
      };
}

// if it's a relative import or an absolute path, imports/exports are ignored
const shouldIgnoreRequestForExports = path =>
  path.startsWith('.') || (0, _path().isAbsolute)(path);

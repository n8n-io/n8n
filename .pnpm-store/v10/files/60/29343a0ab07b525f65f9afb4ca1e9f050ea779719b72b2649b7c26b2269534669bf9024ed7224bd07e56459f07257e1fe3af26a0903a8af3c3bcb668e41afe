'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.GlobalPaths = void 0;
exports.default = nodeModulesPaths;
function path() {
  const data = _interopRequireWildcard(require('path'));
  path = function () {
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
 *
 * Adapted from: https://github.com/substack/node-resolve
 */

function nodeModulesPaths(basedir, options) {
  const modules =
    options && options.moduleDirectory
      ? Array.from(options.moduleDirectory)
      : ['node_modules'];

  // ensure that `basedir` is an absolute path at this point,
  // resolving against the process' current working directory
  const basedirAbs = path().resolve(basedir);
  let prefix = '/';
  if (/^([A-Za-z]:)/.test(basedirAbs)) {
    prefix = '';
  } else if (/^\\\\/.test(basedirAbs)) {
    prefix = '\\\\';
  }

  // The node resolution algorithm (as implemented by NodeJS and TypeScript)
  // traverses parents of the physical path, not the symlinked path
  let physicalBasedir;
  try {
    physicalBasedir = (0, _jestUtil().tryRealpath)(basedirAbs);
  } catch {
    // realpath can throw, e.g. on mapped drives
    physicalBasedir = basedirAbs;
  }
  const paths = [physicalBasedir];
  let parsed = path().parse(physicalBasedir);
  while (parsed.dir !== paths[paths.length - 1]) {
    paths.push(parsed.dir);
    parsed = path().parse(parsed.dir);
  }
  const dirs = paths.reduce((dirs, aPath) => {
    for (const moduleDir of modules) {
      if (path().isAbsolute(moduleDir)) {
        if (aPath === basedirAbs && moduleDir) {
          dirs.push(moduleDir);
        }
      } else {
        dirs.push(path().join(prefix, aPath, moduleDir));
      }
    }
    return dirs;
  }, []);
  if (options.paths) {
    dirs.push(...options.paths);
  }
  return dirs;
}
function findGlobalPaths() {
  const {root} = path().parse(process.cwd());
  const globalPath = path().join(root, 'node_modules');
  const resolvePaths = require.resolve.paths('/');
  if (resolvePaths) {
    // the global paths start one after the root node_modules
    const rootIndex = resolvePaths.indexOf(globalPath);
    return rootIndex > -1 ? resolvePaths.slice(rootIndex + 1) : [];
  }
  return [];
}
const GlobalPaths = findGlobalPaths();
exports.GlobalPaths = GlobalPaths;

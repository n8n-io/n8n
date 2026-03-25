'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.clearFsCache = clearFsCache;
exports.findClosestPackageJson = findClosestPackageJson;
exports.isDirectory = isDirectory;
exports.isFile = isFile;
exports.readPackageCached = readPackageCached;
exports.realpathSync = realpathSync;
function _path() {
  const data = require('path');
  _path = function () {
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

function clearFsCache() {
  checkedPaths.clear();
  checkedRealpathPaths.clear();
  packageContents.clear();
}
var IPathType = /*#__PURE__*/ (function (IPathType) {
  IPathType[(IPathType['FILE'] = 1)] = 'FILE';
  IPathType[(IPathType['DIRECTORY'] = 2)] = 'DIRECTORY';
  IPathType[(IPathType['OTHER'] = 3)] = 'OTHER';
  return IPathType;
})(IPathType || {});
const checkedPaths = new Map();
function statSyncCached(path) {
  const result = checkedPaths.get(path);
  if (result != null) {
    return result;
  }
  let stat;
  try {
    // @ts-expect-error TS2554 - throwIfNoEntry is only available in recent version of node, but inclusion of the option is a backward compatible no-op.
    stat = fs().statSync(path, {
      throwIfNoEntry: false
    });
  } catch (e) {
    if (!(e && (e.code === 'ENOENT' || e.code === 'ENOTDIR'))) {
      throw e;
    }
  }
  if (stat) {
    if (stat.isFile() || stat.isFIFO()) {
      checkedPaths.set(path, IPathType.FILE);
      return IPathType.FILE;
    } else if (stat.isDirectory()) {
      checkedPaths.set(path, IPathType.DIRECTORY);
      return IPathType.DIRECTORY;
    }
  }
  checkedPaths.set(path, IPathType.OTHER);
  return IPathType.OTHER;
}
const checkedRealpathPaths = new Map();
function realpathCached(path) {
  let result = checkedRealpathPaths.get(path);
  if (result != null) {
    return result;
  }
  result = (0, _jestUtil().tryRealpath)(path);
  checkedRealpathPaths.set(path, result);
  if (path !== result) {
    // also cache the result in case it's ever referenced directly - no reason to `realpath` that as well
    checkedRealpathPaths.set(result, result);
  }
  return result;
}
const packageContents = new Map();
function readPackageCached(path) {
  let result = packageContents.get(path);
  if (result != null) {
    return result;
  }
  result = JSON.parse(fs().readFileSync(path, 'utf8'));
  packageContents.set(path, result);
  return result;
}

// adapted from
// https://github.com/lukeed/escalade/blob/2477005062cdbd8407afc90d3f48f4930354252b/src/sync.js
// to use cached `fs` calls
function findClosestPackageJson(start) {
  let dir = (0, _path().resolve)('.', start);
  if (!isDirectory(dir)) {
    dir = (0, _path().dirname)(dir);
  }
  while (true) {
    const pkgJsonFile = (0, _path().resolve)(dir, './package.json');
    const hasPackageJson = isFile(pkgJsonFile);
    if (hasPackageJson) {
      return pkgJsonFile;
    }
    const prevDir = dir;
    dir = (0, _path().dirname)(dir);
    if (prevDir === dir) {
      return undefined;
    }
  }
}

/*
 * helper functions
 */
function isFile(file) {
  return statSyncCached(file) === IPathType.FILE;
}
function isDirectory(dir) {
  return statSyncCached(dir) === IPathType.DIRECTORY;
}
function realpathSync(file) {
  return realpathCached(file);
}

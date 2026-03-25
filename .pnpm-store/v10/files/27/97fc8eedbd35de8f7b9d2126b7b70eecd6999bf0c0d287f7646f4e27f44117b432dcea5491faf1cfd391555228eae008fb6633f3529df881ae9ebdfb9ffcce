'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.relative = relative;
exports.resolve = resolve;
function path() {
  const data = _interopRequireWildcard(require('path'));
  path = function () {
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

// rootDir and filename must be absolute paths (resolved)
function relative(rootDir, filename) {
  return filename.indexOf(rootDir + path().sep) === 0
    ? filename.substring(rootDir.length + 1)
    : path().relative(rootDir, filename);
}
const INDIRECTION_FRAGMENT = `..${path().sep}`;

// rootDir must be an absolute path and relativeFilename must be simple
// (e.g.: foo/bar or ../foo/bar, but never ./foo or foo/../bar)
function resolve(rootDir, relativeFilename) {
  return relativeFilename.indexOf(INDIRECTION_FRAGMENT) === 0
    ? path().resolve(rootDir, relativeFilename)
    : rootDir + path().sep + relativeFilename;
}

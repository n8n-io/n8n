'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = trimAndFormatPath;
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
function _slash() {
  const data = _interopRequireDefault(require('slash'));
  _slash = function () {
    return data;
  };
  return data;
}
var _relativePath = _interopRequireDefault(require('./relativePath'));
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

function trimAndFormatPath(pad, config, testPath, columns) {
  const maxLength = columns - pad;
  const relative = (0, _relativePath.default)(config, testPath);
  const {basename} = relative;
  let {dirname} = relative;

  // length is ok
  if ((dirname + path().sep + basename).length <= maxLength) {
    return (0, _slash().default)(
      _chalk().default.dim(dirname + path().sep) +
        _chalk().default.bold(basename)
    );
  }

  // we can fit trimmed dirname and full basename
  const basenameLength = basename.length;
  if (basenameLength + 4 < maxLength) {
    const dirnameLength = maxLength - 4 - basenameLength;
    dirname = `...${dirname.slice(
      dirname.length - dirnameLength,
      dirname.length
    )}`;
    return (0, _slash().default)(
      _chalk().default.dim(dirname + path().sep) +
        _chalk().default.bold(basename)
    );
  }
  if (basenameLength + 4 === maxLength) {
    return (0, _slash().default)(
      _chalk().default.dim(`...${path().sep}`) + _chalk().default.bold(basename)
    );
  }

  // can't fit dirname, but can fit trimmed basename
  return (0, _slash().default)(
    _chalk().default.bold(
      `...${basename.slice(basename.length - maxLength - 4, basename.length)}`
    )
  );
}

'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = void 0;
function path() {
  const data = _interopRequireWildcard(require('path'));
  path = function () {
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

class ModuleNotFoundError extends Error {
  code = 'MODULE_NOT_FOUND';
  hint;
  requireStack;
  siblingWithSimilarExtensionFound;
  moduleName;
  _originalMessage;
  constructor(message, moduleName) {
    super(message);
    this._originalMessage = message;
    this.moduleName = moduleName;
  }
  buildMessage(rootDir) {
    if (!this._originalMessage) {
      this._originalMessage = this.message || '';
    }
    let message = this._originalMessage;
    if (this.requireStack?.length && this.requireStack.length > 1) {
      message += `

Require stack:
  ${this.requireStack
    .map(p => p.replace(`${rootDir}${path().sep}`, ''))
    .map(_slash().default)
    .join('\n  ')}
`;
    }
    if (this.hint) {
      message += this.hint;
    }
    this.message = message;
  }
  static duckType(error) {
    error.buildMessage = ModuleNotFoundError.prototype.buildMessage;
    return error;
  }
}
exports.default = ModuleNotFoundError;

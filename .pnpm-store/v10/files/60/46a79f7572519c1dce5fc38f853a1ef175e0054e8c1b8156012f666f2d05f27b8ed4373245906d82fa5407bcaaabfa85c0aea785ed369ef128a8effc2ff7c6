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
function _util() {
  const data = require('util');
  _util = function () {
    return data;
  };
  return data;
}
function _execa() {
  const data = _interopRequireDefault(require('execa'));
  _execa = function () {
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
 *
 */

/**
 * Disable any configuration settings that might change Sapling's default output.
 * More info in `sl help environment`.  _HG_PLAIN is intentional
 */
const env = {
  ...process.env,
  HGPLAIN: '1'
};
const adapter = {
  findChangedFiles: async (cwd, options) => {
    const includePaths = options.includePaths ?? [];
    const args = ['status', '-amnu'];
    if (options.withAncestor === true) {
      args.push('--rev', 'first(min(!public() & ::.)^+.^)');
    } else if (
      options.changedSince != null &&
      options.changedSince.length > 0
    ) {
      args.push('--rev', `ancestor(., ${options.changedSince})`);
    } else if (options.lastCommit === true) {
      args.push('--change', '.');
    }
    args.push(...includePaths);
    let result;
    try {
      result = await (0, _execa().default)('sl', args, {
        cwd,
        env
      });
    } catch (e) {
      if (_util().types.isNativeError(e)) {
        const err = e;
        // TODO: Should we keep the original `message`?
        err.message = err.stderr;
      }
      throw e;
    }
    return result.stdout
      .split('\n')
      .filter(s => s !== '')
      .map(changedPath => path().resolve(cwd, changedPath));
  },
  getRoot: async cwd => {
    try {
      const result = await (0, _execa().default)('sl', ['root'], {
        cwd,
        env
      });
      return result.stdout;
    } catch {
      return null;
    }
  }
};
var _default = adapter;
exports.default = _default;

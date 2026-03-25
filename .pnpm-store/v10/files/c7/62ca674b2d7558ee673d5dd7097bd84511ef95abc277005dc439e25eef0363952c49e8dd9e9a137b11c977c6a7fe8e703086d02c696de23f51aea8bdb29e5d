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

const findChangedFilesUsingCommand = async (args, cwd) => {
  let result;
  try {
    result = await (0, _execa().default)('git', args, {
      cwd
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
};
const adapter = {
  findChangedFiles: async (cwd, options) => {
    const changedSince =
      options.withAncestor === true ? 'HEAD^' : options.changedSince;
    const includePaths = (options.includePaths ?? []).map(absoluteRoot =>
      path().normalize(path().relative(cwd, absoluteRoot))
    );
    if (options.lastCommit === true) {
      return findChangedFilesUsingCommand(
        ['show', '--name-only', '--pretty=format:', 'HEAD', '--'].concat(
          includePaths
        ),
        cwd
      );
    }
    if (changedSince != null && changedSince.length > 0) {
      const [committed, staged, unstaged] = await Promise.all([
        findChangedFilesUsingCommand(
          ['diff', '--name-only', `${changedSince}...HEAD`, '--'].concat(
            includePaths
          ),
          cwd
        ),
        findChangedFilesUsingCommand(
          ['diff', '--cached', '--name-only', '--'].concat(includePaths),
          cwd
        ),
        findChangedFilesUsingCommand(
          [
            'ls-files',
            '--other',
            '--modified',
            '--exclude-standard',
            '--'
          ].concat(includePaths),
          cwd
        )
      ]);
      return [...committed, ...staged, ...unstaged];
    }
    const [staged, unstaged] = await Promise.all([
      findChangedFilesUsingCommand(
        ['diff', '--cached', '--name-only', '--'].concat(includePaths),
        cwd
      ),
      findChangedFilesUsingCommand(
        [
          'ls-files',
          '--other',
          '--modified',
          '--exclude-standard',
          '--'
        ].concat(includePaths),
        cwd
      )
    ]);
    return [...staged, ...unstaged];
  },
  getRoot: async cwd => {
    const options = ['rev-parse', '--show-cdup'];
    try {
      const result = await (0, _execa().default)('git', options, {
        cwd
      });
      return path().resolve(cwd, result.stdout);
    } catch {
      return null;
    }
  }
};
var _default = adapter;
exports.default = _default;

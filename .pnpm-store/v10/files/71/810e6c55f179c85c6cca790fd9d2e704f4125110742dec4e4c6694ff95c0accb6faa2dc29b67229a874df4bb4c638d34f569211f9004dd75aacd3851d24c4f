'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = getChangedFilesPromise;
function _chalk() {
  const data = _interopRequireDefault(require('chalk'));
  _chalk = function () {
    return data;
  };
  return data;
}
function _jestChangedFiles() {
  const data = require('jest-changed-files');
  _jestChangedFiles = function () {
    return data;
  };
  return data;
}
function _jestMessageUtil() {
  const data = require('jest-message-util');
  _jestMessageUtil = function () {
    return data;
  };
  return data;
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

function getChangedFilesPromise(globalConfig, configs) {
  if (globalConfig.onlyChanged) {
    const allRootsForAllProjects = configs.reduce((roots, config) => {
      if (config.roots) {
        roots.push(...config.roots);
      }
      return roots;
    }, []);
    return (0, _jestChangedFiles().getChangedFilesForRoots)(
      allRootsForAllProjects,
      {
        changedSince: globalConfig.changedSince,
        lastCommit: globalConfig.lastCommit,
        withAncestor: globalConfig.changedFilesWithAncestor
      }
    ).catch(e => {
      const message = (0, _jestMessageUtil().formatExecError)(e, configs[0], {
        noStackTrace: true
      })
        .split('\n')
        .filter(line => !line.includes('Command failed:'))
        .join('\n');
      console.error(_chalk().default.red(`\n\n${message}`));
      process.exit(1);
    });
  }
  return undefined;
}

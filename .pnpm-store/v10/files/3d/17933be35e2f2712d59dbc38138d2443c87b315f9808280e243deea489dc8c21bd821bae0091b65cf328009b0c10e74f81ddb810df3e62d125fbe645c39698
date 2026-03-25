'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.getChangedFilesForRoots = exports.findRepos = void 0;
function _pLimit() {
  const data = _interopRequireDefault(require('p-limit'));
  _pLimit = function () {
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
var _git = _interopRequireDefault(require('./git'));
var _hg = _interopRequireDefault(require('./hg'));
var _sl = _interopRequireDefault(require('./sl'));
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {default: obj};
}
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// This is an arbitrary number. The main goal is to prevent projects with
// many roots (50+) from spawning too many processes at once.
const mutex = (0, _pLimit().default)(5);
const findGitRoot = dir => mutex(() => _git.default.getRoot(dir));
const findHgRoot = dir => mutex(() => _hg.default.getRoot(dir));
const findSlRoot = dir => mutex(() => _sl.default.getRoot(dir));
const getChangedFilesForRoots = async (roots, options) => {
  const repos = await findRepos(roots);
  const changedFilesOptions = {
    includePaths: roots,
    ...options
  };
  const gitPromises = Array.from(repos.git, repo =>
    _git.default.findChangedFiles(repo, changedFilesOptions)
  );
  const hgPromises = Array.from(repos.hg, repo =>
    _hg.default.findChangedFiles(repo, changedFilesOptions)
  );
  const slPromises = Array.from(repos.sl, repo =>
    _sl.default.findChangedFiles(repo, changedFilesOptions)
  );
  const changedFiles = (
    await Promise.all([...gitPromises, ...hgPromises, ...slPromises])
  ).reduce((allFiles, changedFilesInTheRepo) => {
    for (const file of changedFilesInTheRepo) {
      allFiles.add(file);
    }
    return allFiles;
  }, new Set());
  return {
    changedFiles,
    repos
  };
};
exports.getChangedFilesForRoots = getChangedFilesForRoots;
const findRepos = async roots => {
  const [gitRepos, hgRepos, slRepos] = await Promise.all([
    Promise.all(roots.map(findGitRoot)),
    Promise.all(roots.map(findHgRoot)),
    Promise.all(roots.map(findSlRoot))
  ]);
  return {
    git: new Set(gitRepos.filter(_jestUtil().isNonNullable)),
    hg: new Set(hgRepos.filter(_jestUtil().isNonNullable)),
    sl: new Set(slRepos.filter(_jestUtil().isNonNullable))
  };
};
exports.findRepos = findRepos;

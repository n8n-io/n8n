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

function notEmpty(value) {
  return value != null;
}

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
  const gitPromises = Array.from(repos.git).map(repo =>
    _git.default.findChangedFiles(repo, changedFilesOptions)
  );
  const hgPromises = Array.from(repos.hg).map(repo =>
    _hg.default.findChangedFiles(repo, changedFilesOptions)
  );
  const slPromises = Array.from(repos.sl).map(repo =>
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
  const gitRepos = await Promise.all(
    roots.reduce((promises, root) => promises.concat(findGitRoot(root)), [])
  );
  const hgRepos = await Promise.all(
    roots.reduce((promises, root) => promises.concat(findHgRoot(root)), [])
  );
  const slRepos = await Promise.all(roots.map(findSlRoot));
  return {
    git: new Set(gitRepos.filter(notEmpty)),
    hg: new Set(hgRepos.filter(notEmpty)),
    sl: new Set(slRepos.filter(notEmpty))
  };
};
exports.findRepos = findRepos;

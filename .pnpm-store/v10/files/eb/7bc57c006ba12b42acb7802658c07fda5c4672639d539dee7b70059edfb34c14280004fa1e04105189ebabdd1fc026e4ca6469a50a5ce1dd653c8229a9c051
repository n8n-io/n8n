'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.clearCachedLookups = clearCachedLookups;
exports.default = cachedShouldLoadAsEsm;
function _path() {
  const data = require('path');
  _path = function () {
    return data;
  };
  return data;
}
function _vm() {
  const data = require('vm');
  _vm = function () {
    return data;
  };
  return data;
}
var _fileWalkers = require('./fileWalkers');
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// @ts-expect-error: experimental, not added to the types

const runtimeSupportsVmModules = typeof _vm().SyntheticModule === 'function';
const cachedFileLookups = new Map();
const cachedDirLookups = new Map();
const cachedChecks = new Map();
function clearCachedLookups() {
  cachedFileLookups.clear();
  cachedDirLookups.clear();
  cachedChecks.clear();
}
function cachedShouldLoadAsEsm(path, extensionsToTreatAsEsm) {
  if (!runtimeSupportsVmModules) {
    return false;
  }
  let cachedLookup = cachedFileLookups.get(path);
  if (cachedLookup === undefined) {
    cachedLookup = shouldLoadAsEsm(path, extensionsToTreatAsEsm);
    cachedFileLookups.set(path, cachedLookup);
  }
  return cachedLookup;
}

// this is a bad version of what https://github.com/nodejs/modules/issues/393 would provide
function shouldLoadAsEsm(path, extensionsToTreatAsEsm) {
  const extension = (0, _path().extname)(path);
  if (extension === '.mjs') {
    return true;
  }
  if (extension === '.cjs') {
    return false;
  }
  if (extension !== '.js') {
    return extensionsToTreatAsEsm.includes(extension);
  }
  const cwd = (0, _path().dirname)(path);
  let cachedLookup = cachedDirLookups.get(cwd);
  if (cachedLookup === undefined) {
    cachedLookup = cachedPkgCheck(cwd);
    cachedFileLookups.set(cwd, cachedLookup);
  }
  return cachedLookup;
}
function cachedPkgCheck(cwd) {
  const pkgPath = (0, _fileWalkers.findClosestPackageJson)(cwd);
  if (!pkgPath) {
    return false;
  }
  let hasModuleField = cachedChecks.get(pkgPath);
  if (hasModuleField != null) {
    return hasModuleField;
  }
  try {
    const pkg = (0, _fileWalkers.readPackageCached)(pkgPath);
    hasModuleField = pkg.type === 'module';
  } catch {
    hasModuleField = false;
  }
  cachedChecks.set(pkgPath, hasModuleField);
  return hasModuleField;
}

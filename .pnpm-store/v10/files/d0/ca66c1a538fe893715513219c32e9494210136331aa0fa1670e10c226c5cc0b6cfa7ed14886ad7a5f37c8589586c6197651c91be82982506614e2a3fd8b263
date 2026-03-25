'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.findSiblingsWithFileExtension =
  exports.decodePossibleOutsideJestVmPath =
  exports.createOutsideJestVmPath =
    void 0;
function path() {
  const data = _interopRequireWildcard(require('path'));
  path = function () {
    return data;
  };
  return data;
}
function _glob() {
  const data = _interopRequireDefault(require('glob'));
  _glob = function () {
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

const OUTSIDE_JEST_VM_PROTOCOL = 'jest-main:';
// String manipulation is easier here, fileURLToPath is only in newer Nodes,
// plus setting non-standard protocols on URL objects is difficult.
const createOutsideJestVmPath = path =>
  `${OUTSIDE_JEST_VM_PROTOCOL}//${encodeURIComponent(path)}`;
exports.createOutsideJestVmPath = createOutsideJestVmPath;
const decodePossibleOutsideJestVmPath = outsideJestVmPath => {
  if (outsideJestVmPath.startsWith(OUTSIDE_JEST_VM_PROTOCOL)) {
    return decodeURIComponent(
      outsideJestVmPath.replace(
        new RegExp(`^${OUTSIDE_JEST_VM_PROTOCOL}//`),
        ''
      )
    );
  }
  return undefined;
};
exports.decodePossibleOutsideJestVmPath = decodePossibleOutsideJestVmPath;
const findSiblingsWithFileExtension = (
  moduleFileExtensions,
  from,
  moduleName
) => {
  if (!path().isAbsolute(moduleName) && path().extname(moduleName) === '') {
    const dirname = path().dirname(from);
    const pathToModule = path().resolve(dirname, moduleName);
    try {
      const slashedDirname = (0, _slash().default)(dirname);
      const matches = _glob()
        .default.sync(`${pathToModule}.*`)
        .map(match => (0, _slash().default)(match))
        .map(match => {
          const relativePath = path().posix.relative(slashedDirname, match);
          return path().posix.dirname(match) === slashedDirname
            ? `./${relativePath}`
            : relativePath;
        })
        .map(match => `\t'${match}'`)
        .join('\n');
      if (matches) {
        const foundMessage = `\n\nHowever, Jest was able to find:\n${matches}`;
        const mappedModuleFileExtensions = moduleFileExtensions
          .map(ext => `'${ext}'`)
          .join(', ');
        return (
          `${foundMessage}\n\nYou might want to include a file extension in your import, or update your 'moduleFileExtensions', which is currently ` +
          `[${mappedModuleFileExtensions}].\n\nSee https://jestjs.io/docs/configuration#modulefileextensions-arraystring`
        );
      }
    } catch {}
  }
  return '';
};
exports.findSiblingsWithFileExtension = findSiblingsWithFileExtension;

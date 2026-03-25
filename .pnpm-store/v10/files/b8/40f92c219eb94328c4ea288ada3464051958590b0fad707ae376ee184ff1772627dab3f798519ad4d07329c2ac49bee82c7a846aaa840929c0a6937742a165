'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.isSnapshotPath =
  exports.buildSnapshotResolver =
  exports.EXTENSION =
  exports.DOT_EXTENSION =
    void 0;
var path = _interopRequireWildcard(require('path'));
var _chalk = _interopRequireDefault(require('chalk'));
var _transform = require('@jest/transform');
var _jestUtil = require('jest-util');
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

const EXTENSION = 'snap';
exports.EXTENSION = EXTENSION;
const DOT_EXTENSION = `.${EXTENSION}`;
exports.DOT_EXTENSION = DOT_EXTENSION;
const isSnapshotPath = path => path.endsWith(DOT_EXTENSION);
exports.isSnapshotPath = isSnapshotPath;
const cache = new Map();
const buildSnapshotResolver = async (
  config,
  localRequire = (0, _transform.createTranspilingRequire)(config)
) => {
  const key = config.rootDir;
  const resolver =
    cache.get(key) ??
    (await createSnapshotResolver(await localRequire, config.snapshotResolver));
  cache.set(key, resolver);
  return resolver;
};
exports.buildSnapshotResolver = buildSnapshotResolver;
async function createSnapshotResolver(localRequire, snapshotResolverPath) {
  return typeof snapshotResolverPath === 'string'
    ? createCustomSnapshotResolver(snapshotResolverPath, localRequire)
    : createDefaultSnapshotResolver();
}
function createDefaultSnapshotResolver() {
  return {
    resolveSnapshotPath: testPath =>
      path.join(
        path.join(path.dirname(testPath), '__snapshots__'),
        path.basename(testPath) + DOT_EXTENSION
      ),
    resolveTestPath: snapshotPath =>
      path.resolve(
        path.dirname(snapshotPath),
        '..',
        path.basename(snapshotPath, DOT_EXTENSION)
      ),
    testPathForConsistencyCheck: path.posix.join(
      'consistency_check',
      '__tests__',
      'example.test.js'
    )
  };
}
async function createCustomSnapshotResolver(
  snapshotResolverPath,
  localRequire
) {
  const custom = (0, _jestUtil.interopRequireDefault)(
    await localRequire(snapshotResolverPath)
  ).default;
  const keys = [
    ['resolveSnapshotPath', 'function'],
    ['resolveTestPath', 'function'],
    ['testPathForConsistencyCheck', 'string']
  ];
  keys.forEach(([propName, requiredType]) => {
    if (typeof custom[propName] !== requiredType) {
      throw new TypeError(mustImplement(propName, requiredType));
    }
  });
  const customResolver = {
    resolveSnapshotPath: testPath =>
      custom.resolveSnapshotPath(testPath, DOT_EXTENSION),
    resolveTestPath: snapshotPath =>
      custom.resolveTestPath(snapshotPath, DOT_EXTENSION),
    testPathForConsistencyCheck: custom.testPathForConsistencyCheck
  };
  verifyConsistentTransformations(customResolver);
  return customResolver;
}
function mustImplement(propName, requiredType) {
  return `${_chalk.default.bold(
    `Custom snapshot resolver must implement a \`${propName}\` as a ${requiredType}.`
  )}\nDocumentation: https://jestjs.io/docs/configuration#snapshotresolver-string`;
}
function verifyConsistentTransformations(custom) {
  const resolvedSnapshotPath = custom.resolveSnapshotPath(
    custom.testPathForConsistencyCheck
  );
  const resolvedTestPath = custom.resolveTestPath(resolvedSnapshotPath);
  if (resolvedTestPath !== custom.testPathForConsistencyCheck) {
    throw new Error(
      _chalk.default.bold(
        `Custom snapshot resolver functions must transform paths consistently, i.e. expects resolveTestPath(resolveSnapshotPath('${custom.testPathForConsistencyCheck}')) === ${resolvedTestPath}`
      )
    );
  }
}

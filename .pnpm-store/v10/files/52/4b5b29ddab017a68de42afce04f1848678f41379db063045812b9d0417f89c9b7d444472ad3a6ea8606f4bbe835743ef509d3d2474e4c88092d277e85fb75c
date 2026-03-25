'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = isValidPath;
function _jestSnapshot() {
  const data = require('jest-snapshot');
  _jestSnapshot = function () {
    return data;
  };
  return data;
}
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

function isValidPath(globalConfig, filePath) {
  return (
    !filePath.includes(globalConfig.coverageDirectory) &&
    !(0, _jestSnapshot().isSnapshotPath)(filePath)
  );
}

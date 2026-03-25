'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = void 0;
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const modifyPackageJson = ({projectPackageJson, shouldModifyScripts}) => {
  if (shouldModifyScripts) {
    projectPackageJson.scripts
      ? (projectPackageJson.scripts.test = 'jest')
      : (projectPackageJson.scripts = {
          test: 'jest'
        });
  }
  delete projectPackageJson.jest;
  return `${JSON.stringify(projectPackageJson, null, 2)}\n`;
};
var _default = modifyPackageJson;
exports.default = _default;

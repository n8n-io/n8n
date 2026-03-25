'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = createContext;
function _jestRuntime() {
  const data = _interopRequireDefault(require('jest-runtime'));
  _jestRuntime = function () {
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

function createContext(config, {hasteFS, moduleMap}) {
  return {
    config,
    hasteFS,
    moduleMap,
    resolver: _jestRuntime().default.createResolver(config, moduleMap)
  };
}

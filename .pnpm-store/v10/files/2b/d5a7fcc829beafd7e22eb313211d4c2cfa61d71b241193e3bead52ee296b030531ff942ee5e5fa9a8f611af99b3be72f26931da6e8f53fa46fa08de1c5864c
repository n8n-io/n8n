'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = isBuiltinModule;
function _module() {
  const data = _interopRequireDefault(require('module'));
  _module = function () {
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

const BUILTIN_MODULES = new Set(_module().default.builtinModules);
function isBuiltinModule(module) {
  return BUILTIN_MODULES.has(module);
}

'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = getWatermarks;
function _istanbulLibReport() {
  const data = _interopRequireDefault(require('istanbul-lib-report'));
  _istanbulLibReport = function () {
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

function getWatermarks(config) {
  const defaultWatermarks = _istanbulLibReport().default.getDefaultWatermarks();
  const {coverageThreshold} = config;
  if (!coverageThreshold || !coverageThreshold.global) {
    return defaultWatermarks;
  }
  const keys = ['branches', 'functions', 'lines', 'statements'];
  return keys.reduce((watermarks, key) => {
    const value = coverageThreshold.global[key];
    if (value !== undefined) {
      watermarks[key][1] = value;
    }
    return watermarks;
  }, defaultWatermarks);
}

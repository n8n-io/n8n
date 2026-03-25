'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.getDisplayNameColor = void 0;
function _crypto() {
  const data = require('crypto');
  _crypto = function () {
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

const colors = ['red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'];
const getDisplayNameColor = seed => {
  if (seed === undefined) {
    return 'white';
  }
  const hash = (0, _crypto().createHash)('sha256');
  hash.update(seed);
  const num = hash.digest().readUInt32LE(0);
  return colors[num % colors.length];
};
exports.getDisplayNameColor = getDisplayNameColor;

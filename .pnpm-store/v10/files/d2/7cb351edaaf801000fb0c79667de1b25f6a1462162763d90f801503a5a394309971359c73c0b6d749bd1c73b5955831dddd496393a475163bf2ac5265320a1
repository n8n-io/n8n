'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = formatTime;
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

function formatTime(time, prefixPower = -3, padLeftLength = 0) {
  const prefixes = ['n', 'μ', 'm', ''];
  const prefixIndex = Math.max(
    0,
    Math.min(
      Math.trunc(prefixPower / 3) + prefixes.length - 1,
      prefixes.length - 1
    )
  );
  return `${String(time).padStart(padLeftLength)} ${prefixes[prefixIndex]}s`;
}

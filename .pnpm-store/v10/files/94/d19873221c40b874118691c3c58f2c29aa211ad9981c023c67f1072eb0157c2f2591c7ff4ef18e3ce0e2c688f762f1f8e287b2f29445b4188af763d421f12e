'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = isPromise;
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

function isPromise(candidate) {
  return (
    candidate != null &&
    (typeof candidate === 'object' || typeof candidate === 'function') &&
    typeof candidate.then === 'function'
  );
}

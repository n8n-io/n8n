'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = scroll;
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

function scroll(size, {offset, max}) {
  let start = 0;
  let index = Math.min(offset, size);
  const halfScreen = max / 2;
  if (index <= halfScreen) {
    start = 0;
  } else {
    if (size >= max) {
      start = Math.min(index - halfScreen - 1, size - max);
    }
    index = Math.min(index - start, size);
  }
  return {
    end: Math.min(size, start + max),
    index,
    start
  };
}

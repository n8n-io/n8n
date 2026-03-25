'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = shuffleArray;
exports.rngBuilder = void 0;
var _pureRand = require('pure-rand');
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// Generates [from, to] inclusive

const rngBuilder = seed => {
  const gen = (0, _pureRand.xoroshiro128plus)(seed);
  return {
    next: (from, to) =>
      (0, _pureRand.unsafeUniformIntDistribution)(from, to, gen)
  };
};

// Fisher-Yates shuffle
// This is performed in-place
exports.rngBuilder = rngBuilder;
function shuffleArray(array, random) {
  const length = array.length;
  if (length === 0) {
    return [];
  }
  for (let i = 0; i < length; i++) {
    const n = random.next(i, length - 1);
    const value = array[i];
    array[i] = array[n];
    array[n] = value;
  }
  return array;
}

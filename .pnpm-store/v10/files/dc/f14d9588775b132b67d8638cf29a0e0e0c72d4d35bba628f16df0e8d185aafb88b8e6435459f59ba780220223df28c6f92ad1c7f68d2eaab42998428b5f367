'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.parseShardPair = void 0;
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const parseShardPair = pair => {
  const shardPair = pair
    .split('/')
    .filter(d => /^\d+$/.test(d))
    .map(d => parseInt(d, 10))
    .filter(shard => !Number.isNaN(shard));
  const [shardIndex, shardCount] = shardPair;
  if (shardPair.length !== 2) {
    throw new Error(
      'The shard option requires a string in the format of <n>/<m>.'
    );
  }
  if (shardIndex === 0 || shardCount === 0) {
    throw new Error(
      'The shard option requires 1-based values, received 0 or lower in the pair.'
    );
  }
  if (shardIndex > shardCount) {
    throw new Error(
      'The shard option <n>/<m> requires <n> to be lower or equal than <m>.'
    );
  }
  return {
    shardCount,
    shardIndex
  };
};
exports.parseShardPair = parseShardPair;

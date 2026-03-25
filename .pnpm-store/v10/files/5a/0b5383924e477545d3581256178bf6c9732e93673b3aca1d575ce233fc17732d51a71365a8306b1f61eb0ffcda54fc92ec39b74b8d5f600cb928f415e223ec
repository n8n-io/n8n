/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const jestPreset = {
  plugins: [require.resolve('babel-plugin-jest-hoist')],
  presets: [require.resolve('babel-preset-current-node-syntax')],
};

// @babel/core requires us to export a function
module.exports = () => jestPreset;

'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.jestExpect = void 0;
function _expect() {
  const data = require('expect');
  _expect = function () {
    return data;
  };
  return data;
}
function _jestSnapshot() {
  const data = require('jest-snapshot');
  _jestSnapshot = function () {
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

function createJestExpect() {
  _expect().expect.extend({
    toMatchInlineSnapshot: _jestSnapshot().toMatchInlineSnapshot,
    toMatchSnapshot: _jestSnapshot().toMatchSnapshot,
    toThrowErrorMatchingInlineSnapshot:
      _jestSnapshot().toThrowErrorMatchingInlineSnapshot,
    toThrowErrorMatchingSnapshot: _jestSnapshot().toThrowErrorMatchingSnapshot
  });
  _expect().expect.addSnapshotSerializer = _jestSnapshot().addSerializer;
  return _expect().expect;
}
const jestExpect = createJestExpect();
exports.jestExpect = jestExpect;

'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.SnapshotFormat = void 0;
function _typebox() {
  const data = require('@sinclair/typebox');
  _typebox = function () {
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

const RawSnapshotFormat = _typebox().Type.Partial(
  _typebox().Type.Object({
    callToJSON: _typebox().Type.Readonly(_typebox().Type.Boolean()),
    compareKeys: _typebox().Type.Readonly(_typebox().Type.Null()),
    escapeRegex: _typebox().Type.Readonly(_typebox().Type.Boolean()),
    escapeString: _typebox().Type.Readonly(_typebox().Type.Boolean()),
    highlight: _typebox().Type.Readonly(_typebox().Type.Boolean()),
    indent: _typebox().Type.Readonly(
      _typebox().Type.Number({
        minimum: 0
      })
    ),
    maxDepth: _typebox().Type.Readonly(
      _typebox().Type.Number({
        minimum: 0
      })
    ),
    maxWidth: _typebox().Type.Readonly(
      _typebox().Type.Number({
        minimum: 0
      })
    ),
    min: _typebox().Type.Readonly(_typebox().Type.Boolean()),
    printBasicPrototype: _typebox().Type.Readonly(_typebox().Type.Boolean()),
    printFunctionName: _typebox().Type.Readonly(_typebox().Type.Boolean()),
    theme: _typebox().Type.Readonly(
      _typebox().Type.Partial(
        _typebox().Type.Object({
          comment: _typebox().Type.Readonly(_typebox().Type.String()),
          content: _typebox().Type.Readonly(_typebox().Type.String()),
          prop: _typebox().Type.Readonly(_typebox().Type.String()),
          tag: _typebox().Type.Readonly(_typebox().Type.String()),
          value: _typebox().Type.Readonly(_typebox().Type.String())
        })
      )
    )
  })
);
const SnapshotFormat = _typebox().Type.Strict(RawSnapshotFormat);
exports.SnapshotFormat = SnapshotFormat;

'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.makeInvalidTransformerError =
  exports.makeInvalidSyncTransformerError =
  exports.makeInvalidSourceMapWarning =
  exports.makeInvalidReturnValueError =
    void 0;
function _chalk() {
  const data = _interopRequireDefault(require('chalk'));
  _chalk = function () {
    return data;
  };
  return data;
}
function _slash() {
  const data = _interopRequireDefault(require('slash'));
  _slash = function () {
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

const BULLET = '\u25cf ';
const DOCUMENTATION_NOTE = `  ${_chalk().default.bold(
  'Code Transformation Documentation:'
)}
  https://jestjs.io/docs/code-transformation
`;
const UPGRADE_NOTE = `  ${_chalk().default.bold(
  'This error may be caused by a breaking change in Jest 28:'
)}
  https://jestjs.io/docs/28.x/upgrading-to-jest28#transformer
`;
const makeInvalidReturnValueError = transformPath =>
  _chalk().default.red(
    [
      _chalk().default.bold(`${BULLET}Invalid return value:`),
      '  `process()` or/and `processAsync()` method of code transformer found at ',
      `  "${(0, _slash().default)(transformPath)}" `,
      '  should return an object or a Promise resolving to an object. The object ',
      '  must have `code` property with a string of processed code.',
      ''
    ].join('\n') +
      UPGRADE_NOTE +
      DOCUMENTATION_NOTE
  );
exports.makeInvalidReturnValueError = makeInvalidReturnValueError;
const makeInvalidSourceMapWarning = (filename, transformPath) =>
  _chalk().default.yellow(
    [
      _chalk().default.bold(`${BULLET}Invalid source map:`),
      `  The source map for "${(0, _slash().default)(
        filename
      )}" returned by "${(0, _slash().default)(transformPath)}" is invalid.`,
      '  Proceeding without source mapping for that file.'
    ].join('\n')
  );
exports.makeInvalidSourceMapWarning = makeInvalidSourceMapWarning;
const makeInvalidSyncTransformerError = transformPath =>
  _chalk().default.red(
    [
      _chalk().default.bold(`${BULLET}Invalid synchronous transformer module:`),
      `  "${(0, _slash().default)(
        transformPath
      )}" specified in the "transform" object of Jest configuration`,
      '  must export a `process` function.',
      ''
    ].join('\n') + DOCUMENTATION_NOTE
  );
exports.makeInvalidSyncTransformerError = makeInvalidSyncTransformerError;
const makeInvalidTransformerError = transformPath =>
  _chalk().default.red(
    [
      _chalk().default.bold(`${BULLET}Invalid transformer module:`),
      `  "${(0, _slash().default)(
        transformPath
      )}" specified in the "transform" object of Jest configuration`,
      '  must export a `process` or `processAsync` or `createTransformer` function.',
      ''
    ].join('\n') + DOCUMENTATION_NOTE
  );
exports.makeInvalidTransformerError = makeInvalidTransformerError;

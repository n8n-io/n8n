'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.normalizeDiffOptions = exports.noColor = void 0;
var _chalk = _interopRequireDefault(require('chalk'));
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {default: obj};
}
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const noColor = string => string;
exports.noColor = noColor;
const DIFF_CONTEXT_DEFAULT = 5;
const OPTIONS_DEFAULT = {
  aAnnotation: 'Expected',
  aColor: _chalk.default.green,
  aIndicator: '-',
  bAnnotation: 'Received',
  bColor: _chalk.default.red,
  bIndicator: '+',
  changeColor: _chalk.default.inverse,
  changeLineTrailingSpaceColor: noColor,
  commonColor: _chalk.default.dim,
  commonIndicator: ' ',
  commonLineTrailingSpaceColor: noColor,
  compareKeys: undefined,
  contextLines: DIFF_CONTEXT_DEFAULT,
  emptyFirstOrLastLinePlaceholder: '',
  expand: true,
  includeChangeCounts: false,
  omitAnnotationLines: false,
  patchColor: _chalk.default.yellow
};
const getCompareKeys = compareKeys =>
  compareKeys && typeof compareKeys === 'function'
    ? compareKeys
    : OPTIONS_DEFAULT.compareKeys;
const getContextLines = contextLines =>
  typeof contextLines === 'number' &&
  Number.isSafeInteger(contextLines) &&
  contextLines >= 0
    ? contextLines
    : DIFF_CONTEXT_DEFAULT;

// Pure function returns options with all properties.
const normalizeDiffOptions = (options = {}) => ({
  ...OPTIONS_DEFAULT,
  ...options,
  compareKeys: getCompareKeys(options.compareKeys),
  contextLines: getContextLines(options.contextLines)
});
exports.normalizeDiffOptions = normalizeDiffOptions;

'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = array;
function util() {
  const data = _interopRequireWildcard(require('util'));
  util = function () {
    return data;
  };
  return data;
}
function _prettyFormat() {
  const data = require('pretty-format');
  _prettyFormat = function () {
    return data;
  };
  return data;
}
var _interpolation = require('./interpolation');
function _getRequireWildcardCache(nodeInterop) {
  if (typeof WeakMap !== 'function') return null;
  var cacheBabelInterop = new WeakMap();
  var cacheNodeInterop = new WeakMap();
  return (_getRequireWildcardCache = function (nodeInterop) {
    return nodeInterop ? cacheNodeInterop : cacheBabelInterop;
  })(nodeInterop);
}
function _interopRequireWildcard(obj, nodeInterop) {
  if (!nodeInterop && obj && obj.__esModule) {
    return obj;
  }
  if (obj === null || (typeof obj !== 'object' && typeof obj !== 'function')) {
    return {default: obj};
  }
  var cache = _getRequireWildcardCache(nodeInterop);
  if (cache && cache.has(obj)) {
    return cache.get(obj);
  }
  var newObj = {};
  var hasPropertyDescriptor =
    Object.defineProperty && Object.getOwnPropertyDescriptor;
  for (var key in obj) {
    if (key !== 'default' && Object.prototype.hasOwnProperty.call(obj, key)) {
      var desc = hasPropertyDescriptor
        ? Object.getOwnPropertyDescriptor(obj, key)
        : null;
      if (desc && (desc.get || desc.set)) {
        Object.defineProperty(newObj, key, desc);
      } else {
        newObj[key] = obj[key];
      }
    }
  }
  newObj.default = obj;
  if (cache) {
    cache.set(obj, newObj);
  }
  return newObj;
}
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

const SUPPORTED_PLACEHOLDERS = /%[sdifjoOp#]/g;
const PRETTY_PLACEHOLDER = '%p';
const INDEX_PLACEHOLDER = '%#';
const PLACEHOLDER_PREFIX = '%';
const ESCAPED_PLACEHOLDER_PREFIX = /%%/g;
const JEST_EACH_PLACEHOLDER_ESCAPE = '@@__JEST_EACH_PLACEHOLDER_ESCAPE__@@';
function array(title, arrayTable) {
  if (isTemplates(title, arrayTable)) {
    return arrayTable.map((template, index) => ({
      arguments: [template],
      title: (0, _interpolation.interpolateVariables)(
        title,
        template,
        index
      ).replace(ESCAPED_PLACEHOLDER_PREFIX, PLACEHOLDER_PREFIX)
    }));
  }
  return normaliseTable(arrayTable).map((row, index) => ({
    arguments: row,
    title: formatTitle(title, row, index)
  }));
}
const isTemplates = (title, arrayTable) =>
  !SUPPORTED_PLACEHOLDERS.test(interpolateEscapedPlaceholders(title)) &&
  !isTable(arrayTable) &&
  arrayTable.every(col => col != null && typeof col === 'object');
const normaliseTable = table => (isTable(table) ? table : table.map(colToRow));
const isTable = table => table.every(Array.isArray);
const colToRow = col => [col];
const formatTitle = (title, row, rowIndex) =>
  row
    .reduce((formattedTitle, value) => {
      const [placeholder] = getMatchingPlaceholders(formattedTitle);
      const normalisedValue = normalisePlaceholderValue(value);
      if (!placeholder) return formattedTitle;
      if (placeholder === PRETTY_PLACEHOLDER)
        return interpolatePrettyPlaceholder(formattedTitle, normalisedValue);
      return util().format(formattedTitle, normalisedValue);
    }, interpolateTitleIndex(interpolateEscapedPlaceholders(title), rowIndex))
    .replace(new RegExp(JEST_EACH_PLACEHOLDER_ESCAPE, 'g'), PLACEHOLDER_PREFIX);
const normalisePlaceholderValue = value =>
  typeof value === 'string'
    ? value.replace(
        new RegExp(PLACEHOLDER_PREFIX, 'g'),
        JEST_EACH_PLACEHOLDER_ESCAPE
      )
    : value;
const getMatchingPlaceholders = title =>
  title.match(SUPPORTED_PLACEHOLDERS) || [];
const interpolateEscapedPlaceholders = title =>
  title.replace(ESCAPED_PLACEHOLDER_PREFIX, JEST_EACH_PLACEHOLDER_ESCAPE);
const interpolateTitleIndex = (title, index) =>
  title.replace(INDEX_PLACEHOLDER, index.toString());
const interpolatePrettyPlaceholder = (title, value) =>
  title.replace(
    PRETTY_PLACEHOLDER,
    (0, _prettyFormat().format)(value, {
      maxDepth: 1,
      min: true
    })
  );

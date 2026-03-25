'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.getPath = getPath;
exports.interpolateVariables = void 0;
function _jestGetType() {
  const data = require('jest-get-type');
  _jestGetType = function () {
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
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

const interpolateVariables = (title, template, index) =>
  title
    .replace(
      new RegExp(`\\$(${Object.keys(template).join('|')})[.\\w]*`, 'g'),
      match => {
        const keyPath = match.slice(1).split('.');
        const value = getPath(template, keyPath);
        return (0, _jestGetType().isPrimitive)(value)
          ? String(value)
          : (0, _prettyFormat().format)(value, {
              maxDepth: 1,
              min: true
            });
      }
    )
    .replace('$#', `${index}`);

/* eslint import/export: 0*/
exports.interpolateVariables = interpolateVariables;
function getPath(template, [head, ...tail]) {
  if (!head || !Object.prototype.hasOwnProperty.call(template, head))
    return template;
  return getPath(template[head], tail);
}

'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = template;
var _interpolation = require('./interpolation');
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

function template(title, headings, row) {
  const table = convertRowToTable(row, headings);
  const templates = convertTableToTemplates(table, headings);
  return templates.map((template, index) => ({
    arguments: [template],
    title: (0, _interpolation.interpolateVariables)(title, template, index)
  }));
}
const convertRowToTable = (row, headings) =>
  Array.from({
    length: row.length / headings.length
  }).map((_, index) =>
    row.slice(
      index * headings.length,
      index * headings.length + headings.length
    )
  );
const convertTableToTemplates = (table, headings) =>
  table.map(row =>
    row.reduce(
      (acc, value, index) =>
        Object.assign(acc, {
          [headings[index]]: value
        }),
      {}
    )
  );

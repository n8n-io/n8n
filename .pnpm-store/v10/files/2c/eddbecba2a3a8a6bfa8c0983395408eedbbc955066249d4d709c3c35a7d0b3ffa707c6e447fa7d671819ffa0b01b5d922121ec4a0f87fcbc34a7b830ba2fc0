/**
   * table-core
   *
   * Copyright (c) TanStack
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE.md file in the root directory of this source tree.
   *
   * @license MIT
   */
'use strict';

var row = require('../core/row.js');

function filterRows(rows, filterRowImpl, table) {
  if (table.options.filterFromLeafRows) {
    return filterRowModelFromLeafs(rows, filterRowImpl, table);
  }
  return filterRowModelFromRoot(rows, filterRowImpl, table);
}
function filterRowModelFromLeafs(rowsToFilter, filterRow, table) {
  var _table$options$maxLea;
  const newFilteredFlatRows = [];
  const newFilteredRowsById = {};
  const maxDepth = (_table$options$maxLea = table.options.maxLeafRowFilterDepth) != null ? _table$options$maxLea : 100;
  const recurseFilterRows = function (rowsToFilter, depth) {
    if (depth === void 0) {
      depth = 0;
    }
    const rows = [];

    // Filter from children up first
    for (let i = 0; i < rowsToFilter.length; i++) {
      var _row$subRows;
      let row$1 = rowsToFilter[i];
      const newRow = row.createRow(table, row$1.id, row$1.original, row$1.index, row$1.depth, undefined, row$1.parentId);
      newRow.columnFilters = row$1.columnFilters;
      if ((_row$subRows = row$1.subRows) != null && _row$subRows.length && depth < maxDepth) {
        newRow.subRows = recurseFilterRows(row$1.subRows, depth + 1);
        row$1 = newRow;
        if (filterRow(row$1) && !newRow.subRows.length) {
          rows.push(row$1);
          newFilteredRowsById[row$1.id] = row$1;
          newFilteredFlatRows.push(row$1);
          continue;
        }
        if (filterRow(row$1) || newRow.subRows.length) {
          rows.push(row$1);
          newFilteredRowsById[row$1.id] = row$1;
          newFilteredFlatRows.push(row$1);
          continue;
        }
      } else {
        row$1 = newRow;
        if (filterRow(row$1)) {
          rows.push(row$1);
          newFilteredRowsById[row$1.id] = row$1;
          newFilteredFlatRows.push(row$1);
        }
      }
    }
    return rows;
  };
  return {
    rows: recurseFilterRows(rowsToFilter),
    flatRows: newFilteredFlatRows,
    rowsById: newFilteredRowsById
  };
}
function filterRowModelFromRoot(rowsToFilter, filterRow, table) {
  var _table$options$maxLea2;
  const newFilteredFlatRows = [];
  const newFilteredRowsById = {};
  const maxDepth = (_table$options$maxLea2 = table.options.maxLeafRowFilterDepth) != null ? _table$options$maxLea2 : 100;

  // Filters top level and nested rows
  const recurseFilterRows = function (rowsToFilter, depth) {
    if (depth === void 0) {
      depth = 0;
    }
    // Filter from parents downward first

    const rows = [];

    // Apply the filter to any subRows
    for (let i = 0; i < rowsToFilter.length; i++) {
      let row$1 = rowsToFilter[i];
      const pass = filterRow(row$1);
      if (pass) {
        var _row$subRows2;
        if ((_row$subRows2 = row$1.subRows) != null && _row$subRows2.length && depth < maxDepth) {
          const newRow = row.createRow(table, row$1.id, row$1.original, row$1.index, row$1.depth, undefined, row$1.parentId);
          newRow.subRows = recurseFilterRows(row$1.subRows, depth + 1);
          row$1 = newRow;
        }
        rows.push(row$1);
        newFilteredFlatRows.push(row$1);
        newFilteredRowsById[row$1.id] = row$1;
      }
    }
    return rows;
  };
  return {
    rows: recurseFilterRows(rowsToFilter),
    flatRows: newFilteredFlatRows,
    rowsById: newFilteredRowsById
  };
}

exports.filterRows = filterRows;
//# sourceMappingURL=filterRowsUtils.js.map

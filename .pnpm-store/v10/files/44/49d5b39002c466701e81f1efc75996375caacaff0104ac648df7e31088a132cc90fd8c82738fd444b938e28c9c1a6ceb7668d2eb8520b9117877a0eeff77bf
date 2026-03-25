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
var utils = require('../utils.js');

function getCoreRowModel() {
  return table => utils.memo(() => [table.options.data], data => {
    const rowModel = {
      rows: [],
      flatRows: [],
      rowsById: {}
    };
    const accessRows = function (originalRows, depth, parentRow) {
      if (depth === void 0) {
        depth = 0;
      }
      const rows = [];
      for (let i = 0; i < originalRows.length; i++) {
        // This could be an expensive check at scale, so we should move it somewhere else, but where?
        // if (!id) {
        //   if (process.env.NODE_ENV !== 'production') {
        //     throw new Error(`getRowId expected an ID, but got ${id}`)
        //   }
        // }

        // Make the row
        const row$1 = row.createRow(table, table._getRowId(originalRows[i], i, parentRow), originalRows[i], i, depth, undefined, parentRow == null ? void 0 : parentRow.id);

        // Keep track of every row in a flat array
        rowModel.flatRows.push(row$1);
        // Also keep track of every row by its ID
        rowModel.rowsById[row$1.id] = row$1;
        // Push table row into parent
        rows.push(row$1);

        // Get the original subrows
        if (table.options.getSubRows) {
          var _row$originalSubRows;
          row$1.originalSubRows = table.options.getSubRows(originalRows[i], i);

          // Then recursively access them
          if ((_row$originalSubRows = row$1.originalSubRows) != null && _row$originalSubRows.length) {
            row$1.subRows = accessRows(row$1.originalSubRows, depth + 1, row$1);
          }
        }
      }
      return rows;
    };
    rowModel.rows = accessRows(data);
    return rowModel;
  }, utils.getMemoOptions(table.options, 'debugTable', 'getRowModel', () => table._autoResetPageIndex()));
}

exports.getCoreRowModel = getCoreRowModel;
//# sourceMappingURL=getCoreRowModel.js.map

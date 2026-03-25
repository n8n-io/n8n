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

var utils = require('../utils.js');

function getFacetedMinMaxValues() {
  return (table, columnId) => utils.memo(() => {
    var _table$getColumn;
    return [(_table$getColumn = table.getColumn(columnId)) == null ? void 0 : _table$getColumn.getFacetedRowModel()];
  }, facetedRowModel => {
    if (!facetedRowModel) return undefined;
    const uniqueValues = facetedRowModel.flatRows.flatMap(flatRow => {
      var _flatRow$getUniqueVal;
      return (_flatRow$getUniqueVal = flatRow.getUniqueValues(columnId)) != null ? _flatRow$getUniqueVal : [];
    }).map(Number).filter(value => !Number.isNaN(value));
    if (!uniqueValues.length) return;
    let facetedMinValue = uniqueValues[0];
    let facetedMaxValue = uniqueValues[uniqueValues.length - 1];
    for (const value of uniqueValues) {
      if (value < facetedMinValue) facetedMinValue = value;else if (value > facetedMaxValue) facetedMaxValue = value;
    }
    return [facetedMinValue, facetedMaxValue];
  }, utils.getMemoOptions(table.options, 'debugTable', 'getFacetedMinMaxValues'));
}

exports.getFacetedMinMaxValues = getFacetedMinMaxValues;
//# sourceMappingURL=getFacetedMinMaxValues.js.map

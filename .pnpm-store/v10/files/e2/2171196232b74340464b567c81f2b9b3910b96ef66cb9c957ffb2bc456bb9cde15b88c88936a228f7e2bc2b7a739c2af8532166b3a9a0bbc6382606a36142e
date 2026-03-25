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

var sortingFns = require('../sortingFns.js');
var utils = require('../utils.js');

//

const RowSorting = {
  getInitialState: state => {
    return {
      sorting: [],
      ...state
    };
  },
  getDefaultColumnDef: () => {
    return {
      sortingFn: 'auto',
      sortUndefined: 1
    };
  },
  getDefaultOptions: table => {
    return {
      onSortingChange: utils.makeStateUpdater('sorting', table),
      isMultiSortEvent: e => {
        return e.shiftKey;
      }
    };
  },
  createColumn: (column, table) => {
    column.getAutoSortingFn = () => {
      const firstRows = table.getFilteredRowModel().flatRows.slice(10);
      let isString = false;
      for (const row of firstRows) {
        const value = row == null ? void 0 : row.getValue(column.id);
        if (Object.prototype.toString.call(value) === '[object Date]') {
          return sortingFns.sortingFns.datetime;
        }
        if (typeof value === 'string') {
          isString = true;
          if (value.split(sortingFns.reSplitAlphaNumeric).length > 1) {
            return sortingFns.sortingFns.alphanumeric;
          }
        }
      }
      if (isString) {
        return sortingFns.sortingFns.text;
      }
      return sortingFns.sortingFns.basic;
    };
    column.getAutoSortDir = () => {
      const firstRow = table.getFilteredRowModel().flatRows[0];
      const value = firstRow == null ? void 0 : firstRow.getValue(column.id);
      if (typeof value === 'string') {
        return 'asc';
      }
      return 'desc';
    };
    column.getSortingFn = () => {
      var _table$options$sortin, _table$options$sortin2;
      if (!column) {
        throw new Error();
      }
      return utils.isFunction(column.columnDef.sortingFn) ? column.columnDef.sortingFn : column.columnDef.sortingFn === 'auto' ? column.getAutoSortingFn() : (_table$options$sortin = (_table$options$sortin2 = table.options.sortingFns) == null ? void 0 : _table$options$sortin2[column.columnDef.sortingFn]) != null ? _table$options$sortin : sortingFns.sortingFns[column.columnDef.sortingFn];
    };
    column.toggleSorting = (desc, multi) => {
      // if (column.columns.length) {
      //   column.columns.forEach((c, i) => {
      //     if (c.id) {
      //       table.toggleColumnSorting(c.id, undefined, multi || !!i)
      //     }
      //   })
      //   return
      // }

      // this needs to be outside of table.setSorting to be in sync with rerender
      const nextSortingOrder = column.getNextSortingOrder();
      const hasManualValue = typeof desc !== 'undefined' && desc !== null;
      table.setSorting(old => {
        // Find any existing sorting for this column
        const existingSorting = old == null ? void 0 : old.find(d => d.id === column.id);
        const existingIndex = old == null ? void 0 : old.findIndex(d => d.id === column.id);
        let newSorting = [];

        // What should we do with this sort action?
        let sortAction;
        let nextDesc = hasManualValue ? desc : nextSortingOrder === 'desc';

        // Multi-mode
        if (old != null && old.length && column.getCanMultiSort() && multi) {
          if (existingSorting) {
            sortAction = 'toggle';
          } else {
            sortAction = 'add';
          }
        } else {
          // Normal mode
          if (old != null && old.length && existingIndex !== old.length - 1) {
            sortAction = 'replace';
          } else if (existingSorting) {
            sortAction = 'toggle';
          } else {
            sortAction = 'replace';
          }
        }

        // Handle toggle states that will remove the sorting
        if (sortAction === 'toggle') {
          // If we are "actually" toggling (not a manual set value), should we remove the sorting?
          if (!hasManualValue) {
            // Is our intention to remove?
            if (!nextSortingOrder) {
              sortAction = 'remove';
            }
          }
        }
        if (sortAction === 'add') {
          var _table$options$maxMul;
          newSorting = [...old, {
            id: column.id,
            desc: nextDesc
          }];
          // Take latest n columns
          newSorting.splice(0, newSorting.length - ((_table$options$maxMul = table.options.maxMultiSortColCount) != null ? _table$options$maxMul : Number.MAX_SAFE_INTEGER));
        } else if (sortAction === 'toggle') {
          // This flips (or sets) the
          newSorting = old.map(d => {
            if (d.id === column.id) {
              return {
                ...d,
                desc: nextDesc
              };
            }
            return d;
          });
        } else if (sortAction === 'remove') {
          newSorting = old.filter(d => d.id !== column.id);
        } else {
          newSorting = [{
            id: column.id,
            desc: nextDesc
          }];
        }
        return newSorting;
      });
    };
    column.getFirstSortDir = () => {
      var _ref, _column$columnDef$sor;
      const sortDescFirst = (_ref = (_column$columnDef$sor = column.columnDef.sortDescFirst) != null ? _column$columnDef$sor : table.options.sortDescFirst) != null ? _ref : column.getAutoSortDir() === 'desc';
      return sortDescFirst ? 'desc' : 'asc';
    };
    column.getNextSortingOrder = multi => {
      var _table$options$enable, _table$options$enable2;
      const firstSortDirection = column.getFirstSortDir();
      const isSorted = column.getIsSorted();
      if (!isSorted) {
        return firstSortDirection;
      }
      if (isSorted !== firstSortDirection && ((_table$options$enable = table.options.enableSortingRemoval) != null ? _table$options$enable : true) && (
      // If enableSortRemove, enable in general
      multi ? (_table$options$enable2 = table.options.enableMultiRemove) != null ? _table$options$enable2 : true : true) // If multi, don't allow if enableMultiRemove))
      ) {
        return false;
      }
      return isSorted === 'desc' ? 'asc' : 'desc';
    };
    column.getCanSort = () => {
      var _column$columnDef$ena, _table$options$enable3;
      return ((_column$columnDef$ena = column.columnDef.enableSorting) != null ? _column$columnDef$ena : true) && ((_table$options$enable3 = table.options.enableSorting) != null ? _table$options$enable3 : true) && !!column.accessorFn;
    };
    column.getCanMultiSort = () => {
      var _ref2, _column$columnDef$ena2;
      return (_ref2 = (_column$columnDef$ena2 = column.columnDef.enableMultiSort) != null ? _column$columnDef$ena2 : table.options.enableMultiSort) != null ? _ref2 : !!column.accessorFn;
    };
    column.getIsSorted = () => {
      var _table$getState$sorti;
      const columnSort = (_table$getState$sorti = table.getState().sorting) == null ? void 0 : _table$getState$sorti.find(d => d.id === column.id);
      return !columnSort ? false : columnSort.desc ? 'desc' : 'asc';
    };
    column.getSortIndex = () => {
      var _table$getState$sorti2, _table$getState$sorti3;
      return (_table$getState$sorti2 = (_table$getState$sorti3 = table.getState().sorting) == null ? void 0 : _table$getState$sorti3.findIndex(d => d.id === column.id)) != null ? _table$getState$sorti2 : -1;
    };
    column.clearSorting = () => {
      //clear sorting for just 1 column
      table.setSorting(old => old != null && old.length ? old.filter(d => d.id !== column.id) : []);
    };
    column.getToggleSortingHandler = () => {
      const canSort = column.getCanSort();
      return e => {
        if (!canSort) return;
        e.persist == null || e.persist();
        column.toggleSorting == null || column.toggleSorting(undefined, column.getCanMultiSort() ? table.options.isMultiSortEvent == null ? void 0 : table.options.isMultiSortEvent(e) : false);
      };
    };
  },
  createTable: table => {
    table.setSorting = updater => table.options.onSortingChange == null ? void 0 : table.options.onSortingChange(updater);
    table.resetSorting = defaultState => {
      var _table$initialState$s, _table$initialState;
      table.setSorting(defaultState ? [] : (_table$initialState$s = (_table$initialState = table.initialState) == null ? void 0 : _table$initialState.sorting) != null ? _table$initialState$s : []);
    };
    table.getPreSortedRowModel = () => table.getGroupedRowModel();
    table.getSortedRowModel = () => {
      if (!table._getSortedRowModel && table.options.getSortedRowModel) {
        table._getSortedRowModel = table.options.getSortedRowModel(table);
      }
      if (table.options.manualSorting || !table._getSortedRowModel) {
        return table.getPreSortedRowModel();
      }
      return table._getSortedRowModel();
    };
  }
};

exports.RowSorting = RowSorting;
//# sourceMappingURL=RowSorting.js.map

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
var column = require('./column.js');
var headers = require('./headers.js');
var ColumnFaceting = require('../features/ColumnFaceting.js');
var ColumnFiltering = require('../features/ColumnFiltering.js');
var ColumnGrouping = require('../features/ColumnGrouping.js');
var ColumnOrdering = require('../features/ColumnOrdering.js');
var ColumnPinning = require('../features/ColumnPinning.js');
var ColumnSizing = require('../features/ColumnSizing.js');
var ColumnVisibility = require('../features/ColumnVisibility.js');
var GlobalFaceting = require('../features/GlobalFaceting.js');
var GlobalFiltering = require('../features/GlobalFiltering.js');
var RowExpanding = require('../features/RowExpanding.js');
var RowPagination = require('../features/RowPagination.js');
var RowPinning = require('../features/RowPinning.js');
var RowSelection = require('../features/RowSelection.js');
var RowSorting = require('../features/RowSorting.js');

const builtInFeatures = [headers.Headers, ColumnVisibility.ColumnVisibility, ColumnOrdering.ColumnOrdering, ColumnPinning.ColumnPinning, ColumnFaceting.ColumnFaceting, ColumnFiltering.ColumnFiltering, GlobalFaceting.GlobalFaceting,
//depends on ColumnFaceting
GlobalFiltering.GlobalFiltering,
//depends on ColumnFiltering
RowSorting.RowSorting, ColumnGrouping.ColumnGrouping,
//depends on RowSorting
RowExpanding.RowExpanding, RowPagination.RowPagination, RowPinning.RowPinning, RowSelection.RowSelection, ColumnSizing.ColumnSizing];

//

function createTable(options) {
  var _options$_features, _options$initialState;
  if (process.env.NODE_ENV !== 'production' && (options.debugAll || options.debugTable)) {
    console.info('Creating Table Instance...');
  }
  const _features = [...builtInFeatures, ...((_options$_features = options._features) != null ? _options$_features : [])];
  let table = {
    _features
  };
  const defaultOptions = table._features.reduce((obj, feature) => {
    return Object.assign(obj, feature.getDefaultOptions == null ? void 0 : feature.getDefaultOptions(table));
  }, {});
  const mergeOptions = options => {
    if (table.options.mergeOptions) {
      return table.options.mergeOptions(defaultOptions, options);
    }
    return {
      ...defaultOptions,
      ...options
    };
  };
  const coreInitialState = {};
  let initialState = {
    ...coreInitialState,
    ...((_options$initialState = options.initialState) != null ? _options$initialState : {})
  };
  table._features.forEach(feature => {
    var _feature$getInitialSt;
    initialState = (_feature$getInitialSt = feature.getInitialState == null ? void 0 : feature.getInitialState(initialState)) != null ? _feature$getInitialSt : initialState;
  });
  const queued = [];
  let queuedTimeout = false;
  const coreInstance = {
    _features,
    options: {
      ...defaultOptions,
      ...options
    },
    initialState,
    _queue: cb => {
      queued.push(cb);
      if (!queuedTimeout) {
        queuedTimeout = true;

        // Schedule a microtask to run the queued callbacks after
        // the current call stack (render, etc) has finished.
        Promise.resolve().then(() => {
          while (queued.length) {
            queued.shift()();
          }
          queuedTimeout = false;
        }).catch(error => setTimeout(() => {
          throw error;
        }));
      }
    },
    reset: () => {
      table.setState(table.initialState);
    },
    setOptions: updater => {
      const newOptions = utils.functionalUpdate(updater, table.options);
      table.options = mergeOptions(newOptions);
    },
    getState: () => {
      return table.options.state;
    },
    setState: updater => {
      table.options.onStateChange == null || table.options.onStateChange(updater);
    },
    _getRowId: (row, index, parent) => {
      var _table$options$getRow;
      return (_table$options$getRow = table.options.getRowId == null ? void 0 : table.options.getRowId(row, index, parent)) != null ? _table$options$getRow : `${parent ? [parent.id, index].join('.') : index}`;
    },
    getCoreRowModel: () => {
      if (!table._getCoreRowModel) {
        table._getCoreRowModel = table.options.getCoreRowModel(table);
      }
      return table._getCoreRowModel();
    },
    // The final calls start at the bottom of the model,
    // expanded rows, which then work their way up

    getRowModel: () => {
      return table.getPaginationRowModel();
    },
    //in next version, we should just pass in the row model as the optional 2nd arg
    getRow: (id, searchAll) => {
      let row = (searchAll ? table.getPrePaginationRowModel() : table.getRowModel()).rowsById[id];
      if (!row) {
        row = table.getCoreRowModel().rowsById[id];
        if (!row) {
          if (process.env.NODE_ENV !== 'production') {
            throw new Error(`getRow could not find row with ID: ${id}`);
          }
          throw new Error();
        }
      }
      return row;
    },
    _getDefaultColumnDef: utils.memo(() => [table.options.defaultColumn], defaultColumn => {
      var _defaultColumn;
      defaultColumn = (_defaultColumn = defaultColumn) != null ? _defaultColumn : {};
      return {
        header: props => {
          const resolvedColumnDef = props.header.column.columnDef;
          if (resolvedColumnDef.accessorKey) {
            return resolvedColumnDef.accessorKey;
          }
          if (resolvedColumnDef.accessorFn) {
            return resolvedColumnDef.id;
          }
          return null;
        },
        // footer: props => props.header.column.id,
        cell: props => {
          var _props$renderValue$to, _props$renderValue;
          return (_props$renderValue$to = (_props$renderValue = props.renderValue()) == null || _props$renderValue.toString == null ? void 0 : _props$renderValue.toString()) != null ? _props$renderValue$to : null;
        },
        ...table._features.reduce((obj, feature) => {
          return Object.assign(obj, feature.getDefaultColumnDef == null ? void 0 : feature.getDefaultColumnDef());
        }, {}),
        ...defaultColumn
      };
    }, utils.getMemoOptions(options, 'debugColumns', '_getDefaultColumnDef')),
    _getColumnDefs: () => table.options.columns,
    getAllColumns: utils.memo(() => [table._getColumnDefs()], columnDefs => {
      const recurseColumns = function (columnDefs, parent, depth) {
        if (depth === void 0) {
          depth = 0;
        }
        return columnDefs.map(columnDef => {
          const column$1 = column.createColumn(table, columnDef, depth, parent);
          const groupingColumnDef = columnDef;
          column$1.columns = groupingColumnDef.columns ? recurseColumns(groupingColumnDef.columns, column$1, depth + 1) : [];
          return column$1;
        });
      };
      return recurseColumns(columnDefs);
    }, utils.getMemoOptions(options, 'debugColumns', 'getAllColumns')),
    getAllFlatColumns: utils.memo(() => [table.getAllColumns()], allColumns => {
      return allColumns.flatMap(column => {
        return column.getFlatColumns();
      });
    }, utils.getMemoOptions(options, 'debugColumns', 'getAllFlatColumns')),
    _getAllFlatColumnsById: utils.memo(() => [table.getAllFlatColumns()], flatColumns => {
      return flatColumns.reduce((acc, column) => {
        acc[column.id] = column;
        return acc;
      }, {});
    }, utils.getMemoOptions(options, 'debugColumns', 'getAllFlatColumnsById')),
    getAllLeafColumns: utils.memo(() => [table.getAllColumns(), table._getOrderColumnsFn()], (allColumns, orderColumns) => {
      let leafColumns = allColumns.flatMap(column => column.getLeafColumns());
      return orderColumns(leafColumns);
    }, utils.getMemoOptions(options, 'debugColumns', 'getAllLeafColumns')),
    getColumn: columnId => {
      const column = table._getAllFlatColumnsById()[columnId];
      if (process.env.NODE_ENV !== 'production' && !column) {
        console.error(`[Table] Column with id '${columnId}' does not exist.`);
      }
      return column;
    }
  };
  Object.assign(table, coreInstance);
  for (let index = 0; index < table._features.length; index++) {
    const feature = table._features[index];
    feature == null || feature.createTable == null || feature.createTable(table);
  }
  return table;
}

exports.createTable = createTable;
//# sourceMappingURL=table.js.map

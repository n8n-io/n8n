import { getMemoOptions, makeStateUpdater, memo } from '../utils'

import {
  Column,
  OnChangeFn,
  RowData,
  Table,
  TableFeature,
  Updater,
} from '../types'

import { orderColumns } from './ColumnGrouping'
import { ColumnPinningPosition, _getVisibleLeafColumns } from '..'

export interface ColumnOrderTableState {
  columnOrder: ColumnOrderState
}

export type ColumnOrderState = string[]

export interface ColumnOrderOptions {
  /**
   * If provided, this function will be called with an `updaterFn` when `state.columnOrder` changes. This overrides the default internal state management, so you will need to persist the state change either fully or partially outside of the table.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-ordering#oncolumnorderchange)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-ordering)
   */
  onColumnOrderChange?: OnChangeFn<ColumnOrderState>
}

export interface ColumnOrderColumn {
  /**
   * Returns the index of the column in the order of the visible columns. Optionally pass a `position` parameter to get the index of the column in a sub-section of the table
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-ordering#getindex)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-ordering)
   */
  getIndex: (position?: ColumnPinningPosition | 'center') => number
  /**
   * Returns `true` if the column is the first column in the order of the visible columns. Optionally pass a `position` parameter to check if the column is the first in a sub-section of the table.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-ordering#getisfirstcolumn)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-ordering)
   */
  getIsFirstColumn: (position?: ColumnPinningPosition | 'center') => boolean
  /**
   * Returns `true` if the column is the last column in the order of the visible columns. Optionally pass a `position` parameter to check if the column is the last in a sub-section of the table.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-ordering#getislastcolumn)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-ordering)
   */
  getIsLastColumn: (position?: ColumnPinningPosition | 'center') => boolean
}

export interface ColumnOrderDefaultOptions {
  onColumnOrderChange: OnChangeFn<ColumnOrderState>
}

export interface ColumnOrderInstance<TData extends RowData> {
  _getOrderColumnsFn: () => (
    columns: Column<TData, unknown>[]
  ) => Column<TData, unknown>[]
  /**
   * Resets the **columnOrder** state to `initialState.columnOrder`, or `true` can be passed to force a default blank state reset to `[]`.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-ordering#resetcolumnorder)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-ordering)
   */
  resetColumnOrder: (defaultState?: boolean) => void
  /**
   * Sets or updates the `state.columnOrder` state.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-ordering#setcolumnorder)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-ordering)
   */
  setColumnOrder: (updater: Updater<ColumnOrderState>) => void
}

//

export const ColumnOrdering: TableFeature = {
  getInitialState: (state): ColumnOrderTableState => {
    return {
      columnOrder: [],
      ...state,
    }
  },

  getDefaultOptions: <TData extends RowData>(
    table: Table<TData>
  ): ColumnOrderDefaultOptions => {
    return {
      onColumnOrderChange: makeStateUpdater('columnOrder', table),
    }
  },

  createColumn: <TData extends RowData>(
    column: Column<TData, unknown>,
    table: Table<TData>
  ): void => {
    column.getIndex = memo(
      position => [_getVisibleLeafColumns(table, position)],
      columns => columns.findIndex(d => d.id === column.id),
      getMemoOptions(table.options, 'debugColumns', 'getIndex')
    )
    column.getIsFirstColumn = position => {
      const columns = _getVisibleLeafColumns(table, position)
      return columns[0]?.id === column.id
    }
    column.getIsLastColumn = position => {
      const columns = _getVisibleLeafColumns(table, position)
      return columns[columns.length - 1]?.id === column.id
    }
  },

  createTable: <TData extends RowData>(table: Table<TData>): void => {
    table.setColumnOrder = updater =>
      table.options.onColumnOrderChange?.(updater)
    table.resetColumnOrder = defaultState => {
      table.setColumnOrder(
        defaultState ? [] : table.initialState.columnOrder ?? []
      )
    }
    table._getOrderColumnsFn = memo(
      () => [
        table.getState().columnOrder,
        table.getState().grouping,
        table.options.groupedColumnMode,
      ],
      (columnOrder, grouping, groupedColumnMode) =>
        (columns: Column<TData, unknown>[]) => {
          // Sort grouped columns to the start of the column list
          // before the headers are built
          let orderedColumns: Column<TData, unknown>[] = []

          // If there is no order, return the normal columns
          if (!columnOrder?.length) {
            orderedColumns = columns
          } else {
            const columnOrderCopy = [...columnOrder]

            // If there is an order, make a copy of the columns
            const columnsCopy = [...columns]

            // And make a new ordered array of the columns

            // Loop over the columns and place them in order into the new array
            while (columnsCopy.length && columnOrderCopy.length) {
              const targetColumnId = columnOrderCopy.shift()
              const foundIndex = columnsCopy.findIndex(
                d => d.id === targetColumnId
              )
              if (foundIndex > -1) {
                orderedColumns.push(columnsCopy.splice(foundIndex, 1)[0]!)
              }
            }

            // If there are any columns left, add them to the end
            orderedColumns = [...orderedColumns, ...columnsCopy]
          }

          return orderColumns(orderedColumns, grouping, groupedColumnMode)
        },
      getMemoOptions(table.options, 'debugTable', '_getOrderColumnsFn')
    )
  },
}

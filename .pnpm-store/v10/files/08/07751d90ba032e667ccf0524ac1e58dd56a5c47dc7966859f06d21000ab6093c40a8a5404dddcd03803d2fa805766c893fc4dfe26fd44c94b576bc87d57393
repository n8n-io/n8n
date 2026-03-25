import { FilterFn, FilterFnOption } from '..'
import { BuiltInFilterFn, filterFns } from '../filterFns'
import {
  Column,
  OnChangeFn,
  Table,
  Updater,
  RowData,
  TableFeature,
} from '../types'
import { isFunction, makeStateUpdater } from '../utils'

export interface GlobalFilterTableState {
  globalFilter: any
}

export interface GlobalFilterColumnDef {
  /**
   * Enables/disables the **global** filter for this column.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/global-filtering#enableglobalfilter)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/global-filtering)
   */
  enableGlobalFilter?: boolean
}

export interface GlobalFilterColumn {
  /**
   * Returns whether or not the column can be **globally** filtered. Set to `false` to disable a column from being scanned during global filtering.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/global-filtering#getcanglobalfilter)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/global-filtering)
   */
  getCanGlobalFilter: () => boolean
}

export interface GlobalFilterOptions<TData extends RowData> {
  /**
   * Enables/disables **global** filtering for all columns.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/global-filtering#enableglobalfilter)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/global-filtering)
   */
  enableGlobalFilter?: boolean
  /**
   * If provided, this function will be called with the column and should return `true` or `false` to indicate whether this column should be used for global filtering.
   *
   * This is useful if the column can contain data that is not `string` or `number` (i.e. `undefined`).
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/global-filtering#getcolumncanglobalfilter)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/global-filtering)
   */
  getColumnCanGlobalFilter?: (column: Column<TData, unknown>) => boolean
  /**
   * The filter function to use for global filtering.
   * - A `string` referencing a built-in filter function
   * - A `string` that references a custom filter functions provided via the `tableOptions.filterFns` option
   * - A custom filter function
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/global-filtering#globalfilterfn)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/global-filtering)
   */
  globalFilterFn?: FilterFnOption<TData>
  /**
   * If provided, this function will be called with an `updaterFn` when `state.globalFilter` changes. This overrides the default internal state management, so you will need to persist the state change either fully or partially outside of the table.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/global-filtering#onglobalfilterchange)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/global-filtering)
   */
  onGlobalFilterChange?: OnChangeFn<any>
}

export interface GlobalFilterInstance<TData extends RowData> {
  /**
   * Currently, this function returns the built-in `includesString` filter function. In future releases, it may return more dynamic filter functions based on the nature of the data provided.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/global-filtering#getglobalautofilterfn)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/global-filtering)
   */
  getGlobalAutoFilterFn: () => FilterFn<TData> | undefined
  /**
   * Returns the filter function (either user-defined or automatic, depending on configuration) for the global filter.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/global-filtering#getglobalfilterfn)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/global-filtering)
   */
  getGlobalFilterFn: () => FilterFn<TData> | undefined
  /**
   * Resets the **globalFilter** state to `initialState.globalFilter`, or `true` can be passed to force a default blank state reset to `undefined`.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/global-filtering#resetglobalfilter)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/global-filtering)
   */
  resetGlobalFilter: (defaultState?: boolean) => void
  /**
   * Sets or updates the `state.globalFilter` state.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/global-filtering#setglobalfilter)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/global-filtering)
   */
  setGlobalFilter: (updater: Updater<any>) => void
}

//

export const GlobalFiltering: TableFeature = {
  getInitialState: (state): GlobalFilterTableState => {
    return {
      globalFilter: undefined,
      ...state,
    }
  },

  getDefaultOptions: <TData extends RowData>(
    table: Table<TData>
  ): GlobalFilterOptions<TData> => {
    return {
      onGlobalFilterChange: makeStateUpdater('globalFilter', table),
      globalFilterFn: 'auto',
      getColumnCanGlobalFilter: column => {
        const value = table
          .getCoreRowModel()
          .flatRows[0]?._getAllCellsByColumnId()
          [column.id]?.getValue()

        return typeof value === 'string' || typeof value === 'number'
      },
    } as GlobalFilterOptions<TData>
  },

  createColumn: <TData extends RowData>(
    column: Column<TData, unknown>,
    table: Table<TData>
  ): void => {
    column.getCanGlobalFilter = () => {
      return (
        (column.columnDef.enableGlobalFilter ?? true) &&
        (table.options.enableGlobalFilter ?? true) &&
        (table.options.enableFilters ?? true) &&
        (table.options.getColumnCanGlobalFilter?.(column) ?? true) &&
        !!column.accessorFn
      )
    }
  },

  createTable: <TData extends RowData>(table: Table<TData>): void => {
    table.getGlobalAutoFilterFn = () => {
      return filterFns.includesString
    }

    table.getGlobalFilterFn = () => {
      const { globalFilterFn: globalFilterFn } = table.options

      return isFunction(globalFilterFn)
        ? globalFilterFn
        : globalFilterFn === 'auto'
          ? table.getGlobalAutoFilterFn()
          : table.options.filterFns?.[globalFilterFn as string] ??
            filterFns[globalFilterFn as BuiltInFilterFn]
    }

    table.setGlobalFilter = updater => {
      table.options.onGlobalFilterChange?.(updater)
    }

    table.resetGlobalFilter = defaultState => {
      table.setGlobalFilter(
        defaultState ? undefined : table.initialState.globalFilter
      )
    }
  },
}

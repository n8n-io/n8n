import { RowModel } from '..'
import {
  BuiltInSortingFn,
  reSplitAlphaNumeric,
  sortingFns,
} from '../sortingFns'

import {
  Column,
  OnChangeFn,
  Table,
  Row,
  Updater,
  RowData,
  SortingFns,
  TableFeature,
} from '../types'

import { isFunction, makeStateUpdater } from '../utils'

export type SortDirection = 'asc' | 'desc'

export interface ColumnSort {
  desc: boolean
  id: string
}

export type SortingState = ColumnSort[]

export interface SortingTableState {
  sorting: SortingState
}

export interface SortingFn<TData extends RowData> {
  (rowA: Row<TData>, rowB: Row<TData>, columnId: string): number
}

export type CustomSortingFns<TData extends RowData> = Record<
  string,
  SortingFn<TData>
>

export type SortingFnOption<TData extends RowData> =
  | 'auto'
  | keyof SortingFns
  | BuiltInSortingFn
  | SortingFn<TData>

export interface SortingColumnDef<TData extends RowData> {
  /**
   * Enables/Disables multi-sorting for this column.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/sorting#enablemultisort)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/sorting)
   */
  enableMultiSort?: boolean
  /**
   * Enables/Disables sorting for this column.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/sorting#enablesorting)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/sorting)
   */
  enableSorting?: boolean
  /**
   * Inverts the order of the sorting for this column. This is useful for values that have an inverted best/worst scale where lower numbers are better, eg. a ranking (1st, 2nd, 3rd) or golf-like scoring
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/sorting#invertsorting)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/sorting)
   */
  invertSorting?: boolean
  /**
   * Set to `true` for sorting toggles on this column to start in the descending direction.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/sorting#sortdescfirst)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/sorting)
   */
  sortDescFirst?: boolean
  /**
   * The sorting function to use with this column.
   * - A `string` referencing a built-in sorting function
   * - A custom sorting function
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/sorting#sortingfn)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/sorting)
   */
  sortingFn?: SortingFnOption<TData>
  /**
   * The priority of undefined values when sorting this column.
   * - `false`
   *   - Undefined values will be considered tied and need to be sorted by the next column filter or original index (whichever applies)
   * - `-1`
   *   - Undefined values will be sorted with higher priority (ascending) (if ascending, undefined will appear on the beginning of the list)
   * - `1`
   *   - Undefined values will be sorted with lower priority (descending) (if ascending, undefined will appear on the end of the list)
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/sorting#sortundefined)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/sorting)
   */
  sortUndefined?: false | -1 | 1 | 'first' | 'last'
}

export interface SortingColumn<TData extends RowData> {
  /**
   * Removes this column from the table's sorting state
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/sorting#clearsorting)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/sorting)
   */
  clearSorting: () => void
  /**
   * Returns a sort direction automatically inferred based on the columns values.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/sorting#getautosortdir)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/sorting)
   */
  getAutoSortDir: () => SortDirection
  /**
   * Returns a sorting function automatically inferred based on the columns values.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/sorting#getautosortingfn)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/sorting)
   */
  getAutoSortingFn: () => SortingFn<TData>
  /**
   * Returns whether this column can be multi-sorted.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/sorting#getcanmultisort)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/sorting)
   */
  getCanMultiSort: () => boolean
  /**
   * Returns whether this column can be sorted.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/sorting#getcansort)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/sorting)
   */
  getCanSort: () => boolean
  /**
   * Returns the first direction that should be used when sorting this column.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/sorting#getfirstsortdir)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/sorting)
   */
  getFirstSortDir: () => SortDirection
  /**
   * Returns the current sort direction of this column.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/sorting#getissorted)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/sorting)
   */
  getIsSorted: () => false | SortDirection
  /**
   * Returns the next sorting order.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/sorting#getnextsortingorder)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/sorting)
   */
  getNextSortingOrder: () => SortDirection | false
  /**
   * Returns the index position of this column's sorting within the sorting state
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/sorting#getsortindex)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/sorting)
   */
  getSortIndex: () => number
  /**
   * Returns the resolved sorting function to be used for this column
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/sorting#getsortingfn)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/sorting)
   */
  getSortingFn: () => SortingFn<TData>
  /**
   * Returns a function that can be used to toggle this column's sorting state. This is useful for attaching a click handler to the column header.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/sorting#gettogglesortinghandler)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/sorting)
   */
  getToggleSortingHandler: () => undefined | ((event: unknown) => void)
  /**
   * Toggles this columns sorting state. If `desc` is provided, it will force the sort direction to that value. If `isMulti` is provided, it will additivity multi-sort the column (or toggle it if it is already sorted).
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/sorting#togglesorting)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/sorting)
   */
  toggleSorting: (desc?: boolean, isMulti?: boolean) => void
}

interface SortingOptionsBase {
  /**
   * Enables/disables the ability to remove multi-sorts
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/sorting#enablemultiremove)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/sorting)
   */
  enableMultiRemove?: boolean
  /**
   * Enables/Disables multi-sorting for the table.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/sorting#enablemultisort)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/sorting)
   */
  enableMultiSort?: boolean
  /**
   * Enables/Disables sorting for the table.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/sorting#enablesorting)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/sorting)
   */
  enableSorting?: boolean
  /**
   * Enables/Disables the ability to remove sorting for the table.
   * - If `true` then changing sort order will circle like: 'none' -> 'desc' -> 'asc' -> 'none' -> ...
   * - If `false` then changing sort order will circle like: 'none' -> 'desc' -> 'asc' -> 'desc' -> 'asc' -> ...
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/sorting#enablesortingremoval)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/sorting)
   */
  enableSortingRemoval?: boolean
  /**
   * This function is used to retrieve the sorted row model. If using server-side sorting, this function is not required. To use client-side sorting, pass the exported `getSortedRowModel()` from your adapter to your table or implement your own.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/sorting#getsortedrowmodel)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/sorting)
   */
  getSortedRowModel?: (table: Table<any>) => () => RowModel<any>
  /**
   * Pass a custom function that will be used to determine if a multi-sort event should be triggered. It is passed the event from the sort toggle handler and should return `true` if the event should trigger a multi-sort.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/sorting#ismultisortevent)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/sorting)
   */
  isMultiSortEvent?: (e: unknown) => boolean
  /**
   * Enables manual sorting for the table. If this is `true`, you will be expected to sort your data before it is passed to the table. This is useful if you are doing server-side sorting.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/sorting#manualsorting)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/sorting)
   */
  manualSorting?: boolean
  /**
   * Set a maximum number of columns that can be multi-sorted.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/sorting#maxmultisortcolcount)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/sorting)
   */
  maxMultiSortColCount?: number
  /**
   * If provided, this function will be called with an `updaterFn` when `state.sorting` changes. This overrides the default internal state management, so you will need to persist the state change either fully or partially outside of the table.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/sorting#onsortingchange)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/sorting)
   */
  onSortingChange?: OnChangeFn<SortingState>
  /**
   * If `true`, all sorts will default to descending as their first toggle state.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/sorting#sortdescfirst)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/sorting)
   */
  sortDescFirst?: boolean
}

type ResolvedSortingFns = keyof SortingFns extends never
  ? {
      sortingFns?: Record<string, SortingFn<any>>
    }
  : {
      sortingFns: Record<keyof SortingFns, SortingFn<any>>
    }

export interface SortingOptions<TData extends RowData>
  extends SortingOptionsBase,
    ResolvedSortingFns {}

export interface SortingInstance<TData extends RowData> {
  _getSortedRowModel?: () => RowModel<TData>
  /**
   * Returns the row model for the table before any sorting has been applied.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/sorting#getpresortedrowmodel)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/sorting)
   */
  getPreSortedRowModel: () => RowModel<TData>
  /**
   * Returns the row model for the table after sorting has been applied.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/sorting#getsortedrowmodel)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/sorting)
   */
  getSortedRowModel: () => RowModel<TData>
  /**
   * Resets the **sorting** state to `initialState.sorting`, or `true` can be passed to force a default blank state reset to `[]`.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/sorting#resetsorting)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/sorting)
   */
  resetSorting: (defaultState?: boolean) => void
  /**
   * Sets or updates the `state.sorting` state.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/sorting#setsorting)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/sorting)
   */
  setSorting: (updater: Updater<SortingState>) => void
}

//

export const RowSorting: TableFeature = {
  getInitialState: (state): SortingTableState => {
    return {
      sorting: [],
      ...state,
    }
  },

  getDefaultColumnDef: <TData extends RowData>(): SortingColumnDef<TData> => {
    return {
      sortingFn: 'auto',
      sortUndefined: 1,
    }
  },

  getDefaultOptions: <TData extends RowData>(
    table: Table<TData>
  ): SortingOptions<TData> => {
    return {
      onSortingChange: makeStateUpdater('sorting', table),
      isMultiSortEvent: (e: unknown) => {
        return (e as MouseEvent).shiftKey
      },
    }
  },

  createColumn: <TData extends RowData, TValue>(
    column: Column<TData, TValue>,
    table: Table<TData>
  ): void => {
    column.getAutoSortingFn = () => {
      const firstRows = table.getFilteredRowModel().flatRows.slice(10)

      let isString = false

      for (const row of firstRows) {
        const value = row?.getValue(column.id)

        if (Object.prototype.toString.call(value) === '[object Date]') {
          return sortingFns.datetime
        }

        if (typeof value === 'string') {
          isString = true

          if (value.split(reSplitAlphaNumeric).length > 1) {
            return sortingFns.alphanumeric
          }
        }
      }

      if (isString) {
        return sortingFns.text
      }

      return sortingFns.basic
    }
    column.getAutoSortDir = () => {
      const firstRow = table.getFilteredRowModel().flatRows[0]

      const value = firstRow?.getValue(column.id)

      if (typeof value === 'string') {
        return 'asc'
      }

      return 'desc'
    }
    column.getSortingFn = () => {
      if (!column) {
        throw new Error()
      }

      return isFunction(column.columnDef.sortingFn)
        ? column.columnDef.sortingFn
        : column.columnDef.sortingFn === 'auto'
          ? column.getAutoSortingFn()
          : table.options.sortingFns?.[column.columnDef.sortingFn as string] ??
            sortingFns[column.columnDef.sortingFn as BuiltInSortingFn]
    }
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
      const nextSortingOrder = column.getNextSortingOrder()
      const hasManualValue = typeof desc !== 'undefined' && desc !== null

      table.setSorting(old => {
        // Find any existing sorting for this column
        const existingSorting = old?.find(d => d.id === column.id)
        const existingIndex = old?.findIndex(d => d.id === column.id)

        let newSorting: SortingState = []

        // What should we do with this sort action?
        let sortAction: 'add' | 'remove' | 'toggle' | 'replace'
        let nextDesc = hasManualValue ? desc : nextSortingOrder === 'desc'

        // Multi-mode
        if (old?.length && column.getCanMultiSort() && multi) {
          if (existingSorting) {
            sortAction = 'toggle'
          } else {
            sortAction = 'add'
          }
        } else {
          // Normal mode
          if (old?.length && existingIndex !== old.length - 1) {
            sortAction = 'replace'
          } else if (existingSorting) {
            sortAction = 'toggle'
          } else {
            sortAction = 'replace'
          }
        }

        // Handle toggle states that will remove the sorting
        if (sortAction === 'toggle') {
          // If we are "actually" toggling (not a manual set value), should we remove the sorting?
          if (!hasManualValue) {
            // Is our intention to remove?
            if (!nextSortingOrder) {
              sortAction = 'remove'
            }
          }
        }

        if (sortAction === 'add') {
          newSorting = [
            ...old,
            {
              id: column.id,
              desc: nextDesc,
            },
          ]
          // Take latest n columns
          newSorting.splice(
            0,
            newSorting.length -
              (table.options.maxMultiSortColCount ?? Number.MAX_SAFE_INTEGER)
          )
        } else if (sortAction === 'toggle') {
          // This flips (or sets) the
          newSorting = old.map(d => {
            if (d.id === column.id) {
              return {
                ...d,
                desc: nextDesc,
              }
            }
            return d
          })
        } else if (sortAction === 'remove') {
          newSorting = old.filter(d => d.id !== column.id)
        } else {
          newSorting = [
            {
              id: column.id,
              desc: nextDesc,
            },
          ]
        }

        return newSorting
      })
    }

    column.getFirstSortDir = () => {
      const sortDescFirst =
        column.columnDef.sortDescFirst ??
        table.options.sortDescFirst ??
        column.getAutoSortDir() === 'desc'
      return sortDescFirst ? 'desc' : 'asc'
    }

    column.getNextSortingOrder = (multi?: boolean) => {
      const firstSortDirection = column.getFirstSortDir()
      const isSorted = column.getIsSorted()

      if (!isSorted) {
        return firstSortDirection
      }

      if (
        isSorted !== firstSortDirection &&
        (table.options.enableSortingRemoval ?? true) && // If enableSortRemove, enable in general
        (multi ? table.options.enableMultiRemove ?? true : true) // If multi, don't allow if enableMultiRemove))
      ) {
        return false
      }
      return isSorted === 'desc' ? 'asc' : 'desc'
    }

    column.getCanSort = () => {
      return (
        (column.columnDef.enableSorting ?? true) &&
        (table.options.enableSorting ?? true) &&
        !!column.accessorFn
      )
    }

    column.getCanMultiSort = () => {
      return (
        column.columnDef.enableMultiSort ??
        table.options.enableMultiSort ??
        !!column.accessorFn
      )
    }

    column.getIsSorted = () => {
      const columnSort = table.getState().sorting?.find(d => d.id === column.id)

      return !columnSort ? false : columnSort.desc ? 'desc' : 'asc'
    }

    column.getSortIndex = () =>
      table.getState().sorting?.findIndex(d => d.id === column.id) ?? -1

    column.clearSorting = () => {
      //clear sorting for just 1 column
      table.setSorting(old =>
        old?.length ? old.filter(d => d.id !== column.id) : []
      )
    }

    column.getToggleSortingHandler = () => {
      const canSort = column.getCanSort()

      return (e: unknown) => {
        if (!canSort) return
        ;(e as any).persist?.()
        column.toggleSorting?.(
          undefined,
          column.getCanMultiSort() ? table.options.isMultiSortEvent?.(e) : false
        )
      }
    }
  },

  createTable: <TData extends RowData>(table: Table<TData>): void => {
    table.setSorting = updater => table.options.onSortingChange?.(updater)
    table.resetSorting = defaultState => {
      table.setSorting(defaultState ? [] : table.initialState?.sorting ?? [])
    }
    table.getPreSortedRowModel = () => table.getGroupedRowModel()
    table.getSortedRowModel = () => {
      if (!table._getSortedRowModel && table.options.getSortedRowModel) {
        table._getSortedRowModel = table.options.getSortedRowModel(table)
      }

      if (table.options.manualSorting || !table._getSortedRowModel) {
        return table.getPreSortedRowModel()
      }

      return table._getSortedRowModel()
    }
  },
}

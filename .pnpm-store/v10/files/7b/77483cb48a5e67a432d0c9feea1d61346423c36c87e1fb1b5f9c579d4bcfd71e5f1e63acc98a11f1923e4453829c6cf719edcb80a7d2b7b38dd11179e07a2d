import {
  OnChangeFn,
  Updater,
  Table,
  Column,
  Row,
  Cell,
  RowData,
  TableFeature,
} from '../types'
import { getMemoOptions, makeStateUpdater, memo } from '../utils'

export type ColumnPinningPosition = false | 'left' | 'right'

export interface ColumnPinningState {
  left?: string[]
  right?: string[]
}

export interface ColumnPinningTableState {
  columnPinning: ColumnPinningState
}

export interface ColumnPinningOptions {
  /**
   * Enables/disables column pinning for the table. Defaults to `true`.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-pinning#enablecolumnpinning)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-pinning)
   */
  enableColumnPinning?: boolean
  /**
   * @deprecated Use `enableColumnPinning` or `enableRowPinning` instead.
   * Enables/disables all pinning for the table. Defaults to `true`.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-pinning#enablepinning)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-pinning)
   */
  enablePinning?: boolean
  /**
   * If provided, this function will be called with an `updaterFn` when `state.columnPinning` changes. This overrides the default internal state management, so you will also need to supply `state.columnPinning` from your own managed state.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-pinning#oncolumnpinningchange)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/oncolumnpinningchange)
   */
  onColumnPinningChange?: OnChangeFn<ColumnPinningState>
}

export interface ColumnPinningDefaultOptions {
  onColumnPinningChange: OnChangeFn<ColumnPinningState>
}

export interface ColumnPinningColumnDef {
  /**
   * Enables/disables column pinning for this column. Defaults to `true`.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-pinning#enablepinning-1)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-pinning)
   */
  enablePinning?: boolean
}

export interface ColumnPinningColumn {
  /**
   * Returns whether or not the column can be pinned.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-pinning#getcanpin)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-pinning)
   */
  getCanPin: () => boolean
  /**
   * Returns the pinned position of the column. (`'left'`, `'right'` or `false`)
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-pinning#getispinned)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-pinning)
   */
  getIsPinned: () => ColumnPinningPosition
  /**
   * Returns the numeric pinned index of the column within a pinned column group.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-pinning#getpinnedindex)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-pinning)
   */
  getPinnedIndex: () => number
  /**
   * Pins a column to the `'left'` or `'right'`, or unpins the column to the center if `false` is passed.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-pinning#pin)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-pinning)
   */
  pin: (position: ColumnPinningPosition) => void
}

export interface ColumnPinningRow<TData extends RowData> {
  /**
   * Returns all center pinned (unpinned) leaf cells in the row.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-pinning#getcentervisiblecells)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-pinning)
   */
  getCenterVisibleCells: () => Cell<TData, unknown>[]
  /**
   * Returns all left pinned leaf cells in the row.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-pinning#getleftvisiblecells)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-pinning)
   */
  getLeftVisibleCells: () => Cell<TData, unknown>[]
  /**
   * Returns all right pinned leaf cells in the row.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-pinning#getrightvisiblecells)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-pinning)
   */
  getRightVisibleCells: () => Cell<TData, unknown>[]
}

export interface ColumnPinningInstance<TData extends RowData> {
  /**
   * Returns all center pinned (unpinned) leaf columns.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-pinning#getcenterleafcolumns)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-pinning)
   */
  getCenterLeafColumns: () => Column<TData, unknown>[]
  /**
   * Returns whether or not any columns are pinned. Optionally specify to only check for pinned columns in either the `left` or `right` position.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-pinning#getissomecolumnspinned)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-pinning)
   */
  getIsSomeColumnsPinned: (position?: ColumnPinningPosition) => boolean
  /**
   * Returns all left pinned leaf columns.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-pinning#getleftleafcolumns)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-pinning)
   */
  getLeftLeafColumns: () => Column<TData, unknown>[]
  /**
   * Returns all right pinned leaf columns.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-pinning#getrightleafcolumns)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-pinning)
   */
  getRightLeafColumns: () => Column<TData, unknown>[]
  /**
   * Resets the **columnPinning** state to `initialState.columnPinning`, or `true` can be passed to force a default blank state reset to `{ left: [], right: [], }`.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-pinning#resetcolumnpinning)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-pinning)
   */
  resetColumnPinning: (defaultState?: boolean) => void
  /**
   * Sets or updates the `state.columnPinning` state.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-pinning#setcolumnpinning)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-pinning)
   */
  setColumnPinning: (updater: Updater<ColumnPinningState>) => void
}

//

const getDefaultColumnPinningState = (): ColumnPinningState => ({
  left: [],
  right: [],
})

export const ColumnPinning: TableFeature = {
  getInitialState: (state): ColumnPinningTableState => {
    return {
      columnPinning: getDefaultColumnPinningState(),
      ...state,
    }
  },

  getDefaultOptions: <TData extends RowData>(
    table: Table<TData>
  ): ColumnPinningDefaultOptions => {
    return {
      onColumnPinningChange: makeStateUpdater('columnPinning', table),
    }
  },

  createColumn: <TData extends RowData, TValue>(
    column: Column<TData, TValue>,
    table: Table<TData>
  ): void => {
    column.pin = position => {
      const columnIds = column
        .getLeafColumns()
        .map(d => d.id)
        .filter(Boolean) as string[]

      table.setColumnPinning(old => {
        if (position === 'right') {
          return {
            left: (old?.left ?? []).filter(d => !columnIds?.includes(d)),
            right: [
              ...(old?.right ?? []).filter(d => !columnIds?.includes(d)),
              ...columnIds,
            ],
          }
        }

        if (position === 'left') {
          return {
            left: [
              ...(old?.left ?? []).filter(d => !columnIds?.includes(d)),
              ...columnIds,
            ],
            right: (old?.right ?? []).filter(d => !columnIds?.includes(d)),
          }
        }

        return {
          left: (old?.left ?? []).filter(d => !columnIds?.includes(d)),
          right: (old?.right ?? []).filter(d => !columnIds?.includes(d)),
        }
      })
    }

    column.getCanPin = () => {
      const leafColumns = column.getLeafColumns()

      return leafColumns.some(
        d =>
          (d.columnDef.enablePinning ?? true) &&
          (table.options.enableColumnPinning ??
            table.options.enablePinning ??
            true)
      )
    }

    column.getIsPinned = () => {
      const leafColumnIds = column.getLeafColumns().map(d => d.id)

      const { left, right } = table.getState().columnPinning

      const isLeft = leafColumnIds.some(d => left?.includes(d))
      const isRight = leafColumnIds.some(d => right?.includes(d))

      return isLeft ? 'left' : isRight ? 'right' : false
    }

    column.getPinnedIndex = () => {
      const position = column.getIsPinned()

      return position
        ? table.getState().columnPinning?.[position]?.indexOf(column.id) ?? -1
        : 0
    }
  },

  createRow: <TData extends RowData>(
    row: Row<TData>,
    table: Table<TData>
  ): void => {
    row.getCenterVisibleCells = memo(
      () => [
        row._getAllVisibleCells(),
        table.getState().columnPinning.left,
        table.getState().columnPinning.right,
      ],
      (allCells, left, right) => {
        const leftAndRight: string[] = [...(left ?? []), ...(right ?? [])]

        return allCells.filter(d => !leftAndRight.includes(d.column.id))
      },
      getMemoOptions(table.options, 'debugRows', 'getCenterVisibleCells')
    )
    row.getLeftVisibleCells = memo(
      () => [row._getAllVisibleCells(), table.getState().columnPinning.left],
      (allCells, left) => {
        const cells = (left ?? [])
          .map(columnId => allCells.find(cell => cell.column.id === columnId)!)
          .filter(Boolean)
          .map(d => ({ ...d, position: 'left' }) as Cell<TData, unknown>)

        return cells
      },
      getMemoOptions(table.options, 'debugRows', 'getLeftVisibleCells')
    )
    row.getRightVisibleCells = memo(
      () => [row._getAllVisibleCells(), table.getState().columnPinning.right],
      (allCells, right) => {
        const cells = (right ?? [])
          .map(columnId => allCells.find(cell => cell.column.id === columnId)!)
          .filter(Boolean)
          .map(d => ({ ...d, position: 'right' }) as Cell<TData, unknown>)

        return cells
      },
      getMemoOptions(table.options, 'debugRows', 'getRightVisibleCells')
    )
  },

  createTable: <TData extends RowData>(table: Table<TData>): void => {
    table.setColumnPinning = updater =>
      table.options.onColumnPinningChange?.(updater)

    table.resetColumnPinning = defaultState =>
      table.setColumnPinning(
        defaultState
          ? getDefaultColumnPinningState()
          : table.initialState?.columnPinning ?? getDefaultColumnPinningState()
      )

    table.getIsSomeColumnsPinned = position => {
      const pinningState = table.getState().columnPinning

      if (!position) {
        return Boolean(pinningState.left?.length || pinningState.right?.length)
      }
      return Boolean(pinningState[position]?.length)
    }

    table.getLeftLeafColumns = memo(
      () => [table.getAllLeafColumns(), table.getState().columnPinning.left],
      (allColumns, left) => {
        return (left ?? [])
          .map(columnId => allColumns.find(column => column.id === columnId)!)
          .filter(Boolean)
      },
      getMemoOptions(table.options, 'debugColumns', 'getLeftLeafColumns')
    )

    table.getRightLeafColumns = memo(
      () => [table.getAllLeafColumns(), table.getState().columnPinning.right],
      (allColumns, right) => {
        return (right ?? [])
          .map(columnId => allColumns.find(column => column.id === columnId)!)
          .filter(Boolean)
      },
      getMemoOptions(table.options, 'debugColumns', 'getRightLeafColumns')
    )

    table.getCenterLeafColumns = memo(
      () => [
        table.getAllLeafColumns(),
        table.getState().columnPinning.left,
        table.getState().columnPinning.right,
      ],
      (allColumns, left, right) => {
        const leftAndRight: string[] = [...(left ?? []), ...(right ?? [])]

        return allColumns.filter(d => !leftAndRight.includes(d.id))
      },
      getMemoOptions(table.options, 'debugColumns', 'getCenterLeafColumns')
    )
  },
}

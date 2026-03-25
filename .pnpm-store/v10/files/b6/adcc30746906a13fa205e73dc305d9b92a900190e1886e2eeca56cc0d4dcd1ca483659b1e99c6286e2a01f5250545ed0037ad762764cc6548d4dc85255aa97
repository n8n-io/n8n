import {
  OnChangeFn,
  Updater,
  Table,
  Row,
  RowData,
  TableFeature,
} from '../types'
import { getMemoOptions, makeStateUpdater, memo } from '../utils'

export type RowPinningPosition = false | 'top' | 'bottom'

export interface RowPinningState {
  bottom?: string[]
  top?: string[]
}

export interface RowPinningTableState {
  rowPinning: RowPinningState
}

export interface RowPinningOptions<TData extends RowData> {
  /**
   * Enables/disables row pinning for the table. Defaults to `true`.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-pinning#enablerowpinning)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-pinning)
   */
  enableRowPinning?: boolean | ((row: Row<TData>) => boolean)
  /**
   * When `false`, pinned rows will not be visible if they are filtered or paginated out of the table. When `true`, pinned rows will always be visible regardless of filtering or pagination. Defaults to `true`.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-pinning#keeppinnedrows)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-pinning)
   */
  keepPinnedRows?: boolean
  /**
   * If provided, this function will be called with an `updaterFn` when `state.rowPinning` changes. This overrides the default internal state management, so you will also need to supply `state.rowPinning` from your own managed state.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-pinning#onrowpinningchange)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/onrowpinningchange)
   */
  onRowPinningChange?: OnChangeFn<RowPinningState>
}

export interface RowPinningDefaultOptions {
  onRowPinningChange: OnChangeFn<RowPinningState>
}

export interface RowPinningRow {
  /**
   * Returns whether or not the row can be pinned.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-pinning#getcanpin-1)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-pinning)
   */
  getCanPin: () => boolean
  /**
   * Returns the pinned position of the row. (`'top'`, `'bottom'` or `false`)
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-pinning#getispinned-1)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-pinning)
   */
  getIsPinned: () => RowPinningPosition
  /**
   * Returns the numeric pinned index of the row within a pinned row group.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-pinning#getpinnedindex-1)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-pinning)
   */
  getPinnedIndex: () => number
  /**
   * Pins a row to the `'top'` or `'bottom'`, or unpins the row to the center if `false` is passed.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-pinning#pin-1)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-pinning)
   */
  pin: (
    position: RowPinningPosition,
    includeLeafRows?: boolean,
    includeParentRows?: boolean
  ) => void
}

export interface RowPinningInstance<TData extends RowData> {
  _getPinnedRows: (
    visiblePinnedRows: Array<Row<TData>>,
    pinnedRowIds: Array<string> | undefined,
    position: 'top' | 'bottom'
  ) => Row<TData>[]
  /**
   * Returns all bottom pinned rows.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-pinning#getbottomrows)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-pinning)
   */
  getBottomRows: () => Row<TData>[]
  /**
   * Returns all rows that are not pinned to the top or bottom.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-pinning#getcenterrows)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-pinning)
   */
  getCenterRows: () => Row<TData>[]
  /**
   * Returns whether or not any rows are pinned. Optionally specify to only check for pinned rows in either the `top` or `bottom` position.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-pinning#getissomerowspinned)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-pinning)
   */
  getIsSomeRowsPinned: (position?: RowPinningPosition) => boolean
  /**
   * Returns all top pinned rows.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-pinning#gettoprows)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-pinning)
   */
  getTopRows: () => Row<TData>[]
  /**
   * Resets the **rowPinning** state to `initialState.rowPinning`, or `true` can be passed to force a default blank state reset to `{ top: [], bottom: [], }`.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-pinning#resetrowpinning)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-pinning)
   */
  resetRowPinning: (defaultState?: boolean) => void
  /**
   * Sets or updates the `state.rowPinning` state.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/row-pinning#setrowpinning)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/row-pinning)
   */
  setRowPinning: (updater: Updater<RowPinningState>) => void
}

//

const getDefaultRowPinningState = (): RowPinningState => ({
  top: [],
  bottom: [],
})

export const RowPinning: TableFeature = {
  getInitialState: (state): RowPinningTableState => {
    return {
      rowPinning: getDefaultRowPinningState(),
      ...state,
    }
  },

  getDefaultOptions: <TData extends RowData>(
    table: Table<TData>
  ): RowPinningDefaultOptions => {
    return {
      onRowPinningChange: makeStateUpdater('rowPinning', table),
    }
  },

  createRow: <TData extends RowData>(
    row: Row<TData>,
    table: Table<TData>
  ): void => {
    row.pin = (position, includeLeafRows, includeParentRows) => {
      const leafRowIds = includeLeafRows
        ? row.getLeafRows().map(({ id }) => id)
        : []
      const parentRowIds = includeParentRows
        ? row.getParentRows().map(({ id }) => id)
        : []
      const rowIds = new Set([...parentRowIds, row.id, ...leafRowIds])

      table.setRowPinning(old => {
        if (position === 'bottom') {
          return {
            top: (old?.top ?? []).filter(d => !rowIds?.has(d)),
            bottom: [
              ...(old?.bottom ?? []).filter(d => !rowIds?.has(d)),
              ...Array.from(rowIds),
            ],
          }
        }

        if (position === 'top') {
          return {
            top: [
              ...(old?.top ?? []).filter(d => !rowIds?.has(d)),
              ...Array.from(rowIds),
            ],
            bottom: (old?.bottom ?? []).filter(d => !rowIds?.has(d)),
          }
        }

        return {
          top: (old?.top ?? []).filter(d => !rowIds?.has(d)),
          bottom: (old?.bottom ?? []).filter(d => !rowIds?.has(d)),
        }
      })
    }
    row.getCanPin = () => {
      const { enableRowPinning, enablePinning } = table.options
      if (typeof enableRowPinning === 'function') {
        return enableRowPinning(row)
      }
      return enableRowPinning ?? enablePinning ?? true
    }
    row.getIsPinned = () => {
      const rowIds = [row.id]

      const { top, bottom } = table.getState().rowPinning

      const isTop = rowIds.some(d => top?.includes(d))
      const isBottom = rowIds.some(d => bottom?.includes(d))

      return isTop ? 'top' : isBottom ? 'bottom' : false
    }
    row.getPinnedIndex = () => {
      const position = row.getIsPinned()
      if (!position) return -1

      const visiblePinnedRowIds = (
        position === 'top' ? table.getTopRows() : table.getBottomRows()
      )?.map(({ id }) => id)

      return visiblePinnedRowIds?.indexOf(row.id) ?? -1
    }
  },

  createTable: <TData extends RowData>(table: Table<TData>): void => {
    table.setRowPinning = updater => table.options.onRowPinningChange?.(updater)

    table.resetRowPinning = defaultState =>
      table.setRowPinning(
        defaultState
          ? getDefaultRowPinningState()
          : table.initialState?.rowPinning ?? getDefaultRowPinningState()
      )

    table.getIsSomeRowsPinned = position => {
      const pinningState = table.getState().rowPinning

      if (!position) {
        return Boolean(pinningState.top?.length || pinningState.bottom?.length)
      }
      return Boolean(pinningState[position]?.length)
    }

    table._getPinnedRows = (visibleRows, pinnedRowIds, position) => {
      const rows =
        table.options.keepPinnedRows ?? true
          ? //get all rows that are pinned even if they would not be otherwise visible
            //account for expanded parent rows, but not pagination or filtering
            (pinnedRowIds ?? []).map(rowId => {
              const row = table.getRow(rowId, true)
              return row.getIsAllParentsExpanded() ? row : null
            })
          : //else get only visible rows that are pinned
            (pinnedRowIds ?? []).map(
              rowId => visibleRows.find(row => row.id === rowId)!
            )

      return rows.filter(Boolean).map(d => ({ ...d, position })) as Row<TData>[]
    }

    table.getTopRows = memo(
      () => [table.getRowModel().rows, table.getState().rowPinning.top],
      (allRows, topPinnedRowIds) =>
        table._getPinnedRows(allRows, topPinnedRowIds, 'top'),
      getMemoOptions(table.options, 'debugRows', 'getTopRows')
    )

    table.getBottomRows = memo(
      () => [table.getRowModel().rows, table.getState().rowPinning.bottom],
      (allRows, bottomPinnedRowIds) =>
        table._getPinnedRows(allRows, bottomPinnedRowIds, 'bottom'),
      getMemoOptions(table.options, 'debugRows', 'getBottomRows')
    )

    table.getCenterRows = memo(
      () => [
        table.getRowModel().rows,
        table.getState().rowPinning.top,
        table.getState().rowPinning.bottom,
      ],
      (allRows, top, bottom) => {
        const topAndBottom = new Set([...(top ?? []), ...(bottom ?? [])])
        return allRows.filter(d => !topAndBottom.has(d.id))
      },
      getMemoOptions(table.options, 'debugRows', 'getCenterRows')
    )
  },
}

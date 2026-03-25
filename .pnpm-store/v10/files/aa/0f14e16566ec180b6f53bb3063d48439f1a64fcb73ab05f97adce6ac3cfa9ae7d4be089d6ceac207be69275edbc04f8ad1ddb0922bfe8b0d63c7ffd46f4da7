import { _getVisibleLeafColumns } from '..'
import {
  RowData,
  Column,
  Header,
  OnChangeFn,
  Table,
  Updater,
  TableFeature,
} from '../types'
import { getMemoOptions, makeStateUpdater, memo } from '../utils'
import { ColumnPinningPosition } from './ColumnPinning'

//

export interface ColumnSizingTableState {
  columnSizing: ColumnSizingState
  columnSizingInfo: ColumnSizingInfoState
}

export type ColumnSizingState = Record<string, number>

export interface ColumnSizingInfoState {
  columnSizingStart: [string, number][]
  deltaOffset: null | number
  deltaPercentage: null | number
  isResizingColumn: false | string
  startOffset: null | number
  startSize: null | number
}

export type ColumnResizeMode = 'onChange' | 'onEnd'

export type ColumnResizeDirection = 'ltr' | 'rtl'

export interface ColumnSizingOptions {
  /**
   * Determines when the columnSizing state is updated. `onChange` updates the state when the user is dragging the resize handle. `onEnd` updates the state when the user releases the resize handle.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-sizing#columnresizemode)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-sizing)
   */
  columnResizeMode?: ColumnResizeMode
  /**
   * Enables or disables column resizing for the column.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-sizing#enablecolumnresizing)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-sizing)
   */
  enableColumnResizing?: boolean
  /**
   * Enables or disables right-to-left support for resizing the column. defaults to 'ltr'.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-sizing#columnResizeDirection)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-sizing)
   */
  columnResizeDirection?: ColumnResizeDirection
  /**
   * If provided, this function will be called with an `updaterFn` when `state.columnSizing` changes. This overrides the default internal state management, so you will also need to supply `state.columnSizing` from your own managed state.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-sizing#oncolumnsizingchange)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-sizing)
   */
  onColumnSizingChange?: OnChangeFn<ColumnSizingState>
  /**
   * If provided, this function will be called with an `updaterFn` when `state.columnSizingInfo` changes. This overrides the default internal state management, so you will also need to supply `state.columnSizingInfo` from your own managed state.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-sizing#oncolumnsizinginfochange)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-sizing)
   */
  onColumnSizingInfoChange?: OnChangeFn<ColumnSizingInfoState>
}

export type ColumnSizingDefaultOptions = Pick<
  ColumnSizingOptions,
  | 'columnResizeMode'
  | 'onColumnSizingChange'
  | 'onColumnSizingInfoChange'
  | 'columnResizeDirection'
>

export interface ColumnSizingInstance {
  /**
   * If pinning, returns the total size of the center portion of the table by calculating the sum of the sizes of all unpinned/center leaf-columns.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-sizing#getcentertotalsize)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-sizing)
   */
  getCenterTotalSize: () => number
  /**
   * Returns the total size of the left portion of the table by calculating the sum of the sizes of all left leaf-columns.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-sizing#getlefttotalsize)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-sizing)
   */
  getLeftTotalSize: () => number
  /**
   * Returns the total size of the right portion of the table by calculating the sum of the sizes of all right leaf-columns.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-sizing#getrighttotalsize)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-sizing)
   */
  getRightTotalSize: () => number
  /**
   * Returns the total size of the table by calculating the sum of the sizes of all leaf-columns.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-sizing#gettotalsize)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-sizing)
   */
  getTotalSize: () => number
  /**
   * Resets column sizing to its initial state. If `defaultState` is `true`, the default state for the table will be used instead of the initialValue provided to the table.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-sizing#resetcolumnsizing)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-sizing)
   */
  resetColumnSizing: (defaultState?: boolean) => void
  /**
   * Resets column sizing info to its initial state. If `defaultState` is `true`, the default state for the table will be used instead of the initialValue provided to the table.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-sizing#resetheadersizeinfo)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-sizing)
   */
  resetHeaderSizeInfo: (defaultState?: boolean) => void
  /**
   * Sets the column sizing state using an updater function or a value. This will trigger the underlying `onColumnSizingChange` function if one is passed to the table options, otherwise the state will be managed automatically by the table.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-sizing#setcolumnsizing)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-sizing)
   */
  setColumnSizing: (updater: Updater<ColumnSizingState>) => void
  /**
   * Sets the column sizing info state using an updater function or a value. This will trigger the underlying `onColumnSizingInfoChange` function if one is passed to the table options, otherwise the state will be managed automatically by the table.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-sizing#setcolumnsizinginfo)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-sizing)
   */
  setColumnSizingInfo: (updater: Updater<ColumnSizingInfoState>) => void
}

export interface ColumnSizingColumnDef {
  /**
   * Enables or disables column resizing for the column.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-sizing#enableresizing)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-sizing)
   */
  enableResizing?: boolean
  /**
   * The maximum allowed size for the column
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-sizing#maxsize)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-sizing)
   */
  maxSize?: number
  /**
   * The minimum allowed size for the column
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-sizing#minsize)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-sizing)
   */
  minSize?: number
  /**
   * The desired size for the column
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-sizing#size)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-sizing)
   */
  size?: number
}

export interface ColumnSizingColumn {
  /**
   * Returns `true` if the column can be resized.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-sizing#getcanresize)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-sizing)
   */
  getCanResize: () => boolean
  /**
   * Returns `true` if the column is currently being resized.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-sizing#getisresizing)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-sizing)
   */
  getIsResizing: () => boolean
  /**
   * Returns the current size of the column.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-sizing#getsize)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-sizing)
   */
  getSize: () => number
  /**
   * Returns the offset measurement along the row-axis (usually the x-axis for standard tables) for the header. This is effectively a sum of the offset measurements of all preceding (left) headers in relation to the current column.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-sizing#getstart)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-sizing)
   */
  getStart: (position?: ColumnPinningPosition | 'center') => number
  /**
   * Returns the offset measurement along the row-axis (usually the x-axis for standard tables) for the header. This is effectively a sum of the offset measurements of all succeeding (right) headers in relation to the current column.
   */
  getAfter: (position?: ColumnPinningPosition | 'center') => number
  /**
   * Resets the column to its initial size.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-sizing#resetsize)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-sizing)
   */
  resetSize: () => void
}

export interface ColumnSizingHeader {
  /**
   * Returns an event handler function that can be used to resize the header. It can be used as an:
   * - `onMouseDown` handler
   * - `onTouchStart` handler
   *
   * The dragging and release events are automatically handled for you.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-sizing#getresizehandler)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-sizing)
   */
  getResizeHandler: (context?: Document) => (event: unknown) => void
  /**
   * Returns the current size of the header.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-sizing#getsize)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-sizing)
   */
  getSize: () => number
  /**
   * Returns the offset measurement along the row-axis (usually the x-axis for standard tables) for the header. This is effectively a sum of the offset measurements of all preceding headers.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-sizing#getstart)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-sizing)
   */
  getStart: (position?: ColumnPinningPosition) => number
}

//

export const defaultColumnSizing = {
  size: 150,
  minSize: 20,
  maxSize: Number.MAX_SAFE_INTEGER,
}

const getDefaultColumnSizingInfoState = (): ColumnSizingInfoState => ({
  startOffset: null,
  startSize: null,
  deltaOffset: null,
  deltaPercentage: null,
  isResizingColumn: false,
  columnSizingStart: [],
})

export const ColumnSizing: TableFeature = {
  getDefaultColumnDef: (): ColumnSizingColumnDef => {
    return defaultColumnSizing
  },
  getInitialState: (state): ColumnSizingTableState => {
    return {
      columnSizing: {},
      columnSizingInfo: getDefaultColumnSizingInfoState(),
      ...state,
    }
  },

  getDefaultOptions: <TData extends RowData>(
    table: Table<TData>
  ): ColumnSizingDefaultOptions => {
    return {
      columnResizeMode: 'onEnd',
      columnResizeDirection: 'ltr',
      onColumnSizingChange: makeStateUpdater('columnSizing', table),
      onColumnSizingInfoChange: makeStateUpdater('columnSizingInfo', table),
    }
  },

  createColumn: <TData extends RowData, TValue>(
    column: Column<TData, TValue>,
    table: Table<TData>
  ): void => {
    column.getSize = () => {
      const columnSize = table.getState().columnSizing[column.id]

      return Math.min(
        Math.max(
          column.columnDef.minSize ?? defaultColumnSizing.minSize,
          columnSize ?? column.columnDef.size ?? defaultColumnSizing.size
        ),
        column.columnDef.maxSize ?? defaultColumnSizing.maxSize
      )
    }

    column.getStart = memo(
      position => [
        position,
        _getVisibleLeafColumns(table, position),
        table.getState().columnSizing,
      ],
      (position, columns) =>
        columns
          .slice(0, column.getIndex(position))
          .reduce((sum, column) => sum + column.getSize(), 0),
      getMemoOptions(table.options, 'debugColumns', 'getStart')
    )

    column.getAfter = memo(
      position => [
        position,
        _getVisibleLeafColumns(table, position),
        table.getState().columnSizing,
      ],
      (position, columns) =>
        columns
          .slice(column.getIndex(position) + 1)
          .reduce((sum, column) => sum + column.getSize(), 0),
      getMemoOptions(table.options, 'debugColumns', 'getAfter')
    )

    column.resetSize = () => {
      table.setColumnSizing(({ [column.id]: _, ...rest }) => {
        return rest
      })
    }
    column.getCanResize = () => {
      return (
        (column.columnDef.enableResizing ?? true) &&
        (table.options.enableColumnResizing ?? true)
      )
    }
    column.getIsResizing = () => {
      return table.getState().columnSizingInfo.isResizingColumn === column.id
    }
  },

  createHeader: <TData extends RowData, TValue>(
    header: Header<TData, TValue>,
    table: Table<TData>
  ): void => {
    header.getSize = () => {
      let sum = 0

      const recurse = (header: Header<TData, TValue>) => {
        if (header.subHeaders.length) {
          header.subHeaders.forEach(recurse)
        } else {
          sum += header.column.getSize() ?? 0
        }
      }

      recurse(header)

      return sum
    }
    header.getStart = () => {
      if (header.index > 0) {
        const prevSiblingHeader = header.headerGroup.headers[header.index - 1]!
        return prevSiblingHeader.getStart() + prevSiblingHeader.getSize()
      }

      return 0
    }
    header.getResizeHandler = _contextDocument => {
      const column = table.getColumn(header.column.id)
      const canResize = column?.getCanResize()

      return (e: unknown) => {
        if (!column || !canResize) {
          return
        }

        ;(e as any).persist?.()

        if (isTouchStartEvent(e)) {
          // lets not respond to multiple touches (e.g. 2 or 3 fingers)
          if (e.touches && e.touches.length > 1) {
            return
          }
        }

        const startSize = header.getSize()

        const columnSizingStart: [string, number][] = header
          ? header.getLeafHeaders().map(d => [d.column.id, d.column.getSize()])
          : [[column.id, column.getSize()]]

        const clientX = isTouchStartEvent(e)
          ? Math.round(e.touches[0]!.clientX)
          : (e as MouseEvent).clientX

        const newColumnSizing: ColumnSizingState = {}

        const updateOffset = (
          eventType: 'move' | 'end',
          clientXPos?: number
        ) => {
          if (typeof clientXPos !== 'number') {
            return
          }

          table.setColumnSizingInfo(old => {
            const deltaDirection =
              table.options.columnResizeDirection === 'rtl' ? -1 : 1
            const deltaOffset =
              (clientXPos - (old?.startOffset ?? 0)) * deltaDirection
            const deltaPercentage = Math.max(
              deltaOffset / (old?.startSize ?? 0),
              -0.999999
            )

            old.columnSizingStart.forEach(([columnId, headerSize]) => {
              newColumnSizing[columnId] =
                Math.round(
                  Math.max(headerSize + headerSize * deltaPercentage, 0) * 100
                ) / 100
            })

            return {
              ...old,
              deltaOffset,
              deltaPercentage,
            }
          })

          if (
            table.options.columnResizeMode === 'onChange' ||
            eventType === 'end'
          ) {
            table.setColumnSizing(old => ({
              ...old,
              ...newColumnSizing,
            }))
          }
        }

        const onMove = (clientXPos?: number) => updateOffset('move', clientXPos)

        const onEnd = (clientXPos?: number) => {
          updateOffset('end', clientXPos)

          table.setColumnSizingInfo(old => ({
            ...old,
            isResizingColumn: false,
            startOffset: null,
            startSize: null,
            deltaOffset: null,
            deltaPercentage: null,
            columnSizingStart: [],
          }))
        }

        const contextDocument =
          _contextDocument || typeof document !== 'undefined' ? document : null

        const mouseEvents = {
          moveHandler: (e: MouseEvent) => onMove(e.clientX),
          upHandler: (e: MouseEvent) => {
            contextDocument?.removeEventListener(
              'mousemove',
              mouseEvents.moveHandler
            )
            contextDocument?.removeEventListener(
              'mouseup',
              mouseEvents.upHandler
            )
            onEnd(e.clientX)
          },
        }

        const touchEvents = {
          moveHandler: (e: TouchEvent) => {
            if (e.cancelable) {
              e.preventDefault()
              e.stopPropagation()
            }
            onMove(e.touches[0]!.clientX)
            return false
          },
          upHandler: (e: TouchEvent) => {
            contextDocument?.removeEventListener(
              'touchmove',
              touchEvents.moveHandler
            )
            contextDocument?.removeEventListener(
              'touchend',
              touchEvents.upHandler
            )
            if (e.cancelable) {
              e.preventDefault()
              e.stopPropagation()
            }
            onEnd(e.touches[0]?.clientX)
          },
        }

        const passiveIfSupported = passiveEventSupported()
          ? { passive: false }
          : false

        if (isTouchStartEvent(e)) {
          contextDocument?.addEventListener(
            'touchmove',
            touchEvents.moveHandler,
            passiveIfSupported
          )
          contextDocument?.addEventListener(
            'touchend',
            touchEvents.upHandler,
            passiveIfSupported
          )
        } else {
          contextDocument?.addEventListener(
            'mousemove',
            mouseEvents.moveHandler,
            passiveIfSupported
          )
          contextDocument?.addEventListener(
            'mouseup',
            mouseEvents.upHandler,
            passiveIfSupported
          )
        }

        table.setColumnSizingInfo(old => ({
          ...old,
          startOffset: clientX,
          startSize,
          deltaOffset: 0,
          deltaPercentage: 0,
          columnSizingStart,
          isResizingColumn: column.id,
        }))
      }
    }
  },

  createTable: <TData extends RowData>(table: Table<TData>): void => {
    table.setColumnSizing = updater =>
      table.options.onColumnSizingChange?.(updater)
    table.setColumnSizingInfo = updater =>
      table.options.onColumnSizingInfoChange?.(updater)
    table.resetColumnSizing = defaultState => {
      table.setColumnSizing(
        defaultState ? {} : table.initialState.columnSizing ?? {}
      )
    }
    table.resetHeaderSizeInfo = defaultState => {
      table.setColumnSizingInfo(
        defaultState
          ? getDefaultColumnSizingInfoState()
          : table.initialState.columnSizingInfo ??
              getDefaultColumnSizingInfoState()
      )
    }
    table.getTotalSize = () =>
      table.getHeaderGroups()[0]?.headers.reduce((sum, header) => {
        return sum + header.getSize()
      }, 0) ?? 0
    table.getLeftTotalSize = () =>
      table.getLeftHeaderGroups()[0]?.headers.reduce((sum, header) => {
        return sum + header.getSize()
      }, 0) ?? 0
    table.getCenterTotalSize = () =>
      table.getCenterHeaderGroups()[0]?.headers.reduce((sum, header) => {
        return sum + header.getSize()
      }, 0) ?? 0
    table.getRightTotalSize = () =>
      table.getRightHeaderGroups()[0]?.headers.reduce((sum, header) => {
        return sum + header.getSize()
      }, 0) ?? 0
  },
}

let passiveSupported: boolean | null = null
export function passiveEventSupported() {
  if (typeof passiveSupported === 'boolean') return passiveSupported

  let supported = false
  try {
    const options = {
      get passive() {
        supported = true
        return false
      },
    }

    const noop = () => {}

    window.addEventListener('test', noop, options)
    window.removeEventListener('test', noop)
  } catch (err) {
    supported = false
  }
  passiveSupported = supported
  return passiveSupported
}

function isTouchStartEvent(e: unknown): e is TouchEvent {
  return (e as TouchEvent).type === 'touchstart'
}

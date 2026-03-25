import { functionalUpdate, getMemoOptions, memo, RequiredKeys } from '../utils'

import {
  Updater,
  TableOptionsResolved,
  TableState,
  Table,
  InitialTableState,
  Row,
  Column,
  RowModel,
  ColumnDef,
  TableOptions,
  RowData,
  TableMeta,
  ColumnDefResolved,
  GroupColumnDef,
  TableFeature,
} from '../types'

//
import { createColumn } from './column'
import { Headers } from './headers'
//

import { ColumnFaceting } from '../features/ColumnFaceting'
import { ColumnFiltering } from '../features/ColumnFiltering'
import { ColumnGrouping } from '../features/ColumnGrouping'
import { ColumnOrdering } from '../features/ColumnOrdering'
import { ColumnPinning } from '../features/ColumnPinning'
import { ColumnSizing } from '../features/ColumnSizing'
import { ColumnVisibility } from '../features/ColumnVisibility'
import { GlobalFaceting } from '../features/GlobalFaceting'
import { GlobalFiltering } from '../features/GlobalFiltering'
import { RowExpanding } from '../features/RowExpanding'
import { RowPagination } from '../features/RowPagination'
import { RowPinning } from '../features/RowPinning'
import { RowSelection } from '../features/RowSelection'
import { RowSorting } from '../features/RowSorting'

const builtInFeatures = [
  Headers,
  ColumnVisibility,
  ColumnOrdering,
  ColumnPinning,
  ColumnFaceting,
  ColumnFiltering,
  GlobalFaceting, //depends on ColumnFaceting
  GlobalFiltering, //depends on ColumnFiltering
  RowSorting,
  ColumnGrouping, //depends on RowSorting
  RowExpanding,
  RowPagination,
  RowPinning,
  RowSelection,
  ColumnSizing,
] as const

//

export interface CoreTableState {}

export interface CoreOptions<TData extends RowData> {
  /**
   * An array of extra features that you can add to the table instance.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/table#_features)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/tables)
   */
  _features?: TableFeature[]
  /**
   * Set this option to override any of the `autoReset...` feature options.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/table#autoresetall)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/tables)
   */
  autoResetAll?: boolean
  /**
   * The array of column defs to use for the table.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/table#columns)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/tables)
   */
  columns: ColumnDef<TData, any>[]
  /**
   * The data for the table to display. This array should match the type you provided to `table.setRowType<...>`. Columns can access this data via string/index or a functional accessor. When the `data` option changes reference, the table will reprocess the data.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/table#data)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/tables)
   */
  data: TData[]
  /**
   * Set this option to `true` to output all debugging information to the console.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/table#debugall)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/tables)
   */
  debugAll?: boolean
  /**
   * Set this option to `true` to output cell debugging information to the console.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/table#debugcells]
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/tables)
   */
  debugCells?: boolean
  /**
   * Set this option to `true` to output column debugging information to the console.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/table#debugcolumns)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/tables)
   */
  debugColumns?: boolean
  /**
   * Set this option to `true` to output header debugging information to the console.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/table#debugheaders)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/tables)
   */
  debugHeaders?: boolean
  /**
   * Set this option to `true` to output row debugging information to the console.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/table#debugrows)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/tables)
   */
  debugRows?: boolean
  /**
   * Set this option to `true` to output table debugging information to the console.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/table#debugtable)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/tables)
   */
  debugTable?: boolean
  /**
   * Default column options to use for all column defs supplied to the table.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/table#defaultcolumn)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/tables)
   */
  defaultColumn?: Partial<ColumnDef<TData, unknown>>
  /**
   * This required option is a factory for a function that computes and returns the core row model for the table.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/table#getcorerowmodel)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/tables)
   */
  getCoreRowModel: (table: Table<any>) => () => RowModel<any>
  /**
   * This optional function is used to derive a unique ID for any given row. If not provided the rows index is used (nested rows join together with `.` using their grandparents' index eg. `index.index.index`). If you need to identify individual rows that are originating from any server-side operations, it's suggested you use this function to return an ID that makes sense regardless of network IO/ambiguity eg. a userId, taskId, database ID field, etc.
   * @example getRowId: row => row.userId
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/table#getrowid)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/tables)
   */
  getRowId?: (originalRow: TData, index: number, parent?: Row<TData>) => string
  /**
   * This optional function is used to access the sub rows for any given row. If you are using nested rows, you will need to use this function to return the sub rows object (or undefined) from the row.
   * @example getSubRows: row => row.subRows
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/table#getsubrows)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/tables)
   */
  getSubRows?: (originalRow: TData, index: number) => undefined | TData[]
  /**
   * Use this option to optionally pass initial state to the table. This state will be used when resetting various table states either automatically by the table (eg. `options.autoResetPageIndex`) or via functions like `table.resetRowSelection()`. Most reset function allow you optionally pass a flag to reset to a blank/default state instead of the initial state.
   *
   * Table state will not be reset when this object changes, which also means that the initial state object does not need to be stable.
   *
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/table#initialstate)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/tables)
   */
  initialState?: InitialTableState
  /**
   * This option is used to optionally implement the merging of table options.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/table#mergeoptions)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/tables)
   */
  mergeOptions?: (
    defaultOptions: TableOptions<TData>,
    options: Partial<TableOptions<TData>>
  ) => TableOptions<TData>
  /**
   * You can pass any object to `options.meta` and access it anywhere the `table` is available via `table.options.meta`.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/table#meta)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/tables)
   */
  meta?: TableMeta<TData>
  /**
   * The `onStateChange` option can be used to optionally listen to state changes within the table.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/table#onstatechange)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/tables)
   */
  onStateChange: (updater: Updater<TableState>) => void
  /**
   * Value used when the desired value is not found in the data.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/table#renderfallbackvalue)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/tables)
   */
  renderFallbackValue: any
  /**
   * The `state` option can be used to optionally _control_ part or all of the table state. The state you pass here will merge with and overwrite the internal automatically-managed state to produce the final state for the table. You can also listen to state changes via the `onStateChange` option.
   * > Note: Any state passed in here will override both the internal state and any other `initialState` you provide.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/table#state)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/tables)
   */
  state: Partial<TableState>
}

export interface CoreInstance<TData extends RowData> {
  _features: readonly TableFeature[]
  _getAllFlatColumnsById: () => Record<string, Column<TData, unknown>>
  _getColumnDefs: () => ColumnDef<TData, unknown>[]
  _getCoreRowModel?: () => RowModel<TData>
  _getDefaultColumnDef: () => Partial<ColumnDef<TData, unknown>>
  _getRowId: (_: TData, index: number, parent?: Row<TData>) => string
  _queue: (cb: () => void) => void
  /**
   * Returns all columns in the table in their normalized and nested hierarchy.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/table#getallcolumns)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/tables)
   */
  getAllColumns: () => Column<TData, unknown>[]
  /**
   * Returns all columns in the table flattened to a single level.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/table#getallflatcolumns)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/tables)
   */
  getAllFlatColumns: () => Column<TData, unknown>[]
  /**
   * Returns all leaf-node columns in the table flattened to a single level. This does not include parent columns.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/table#getallleafcolumns)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/tables)
   */
  getAllLeafColumns: () => Column<TData, unknown>[]
  /**
   * Returns a single column by its ID.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/table#getcolumn)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/tables)
   */
  getColumn: (columnId: string) => Column<TData, unknown> | undefined
  /**
   * Returns the core row model before any processing has been applied.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/table#getcorerowmodel)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/tables)
   */
  getCoreRowModel: () => RowModel<TData>
  /**
   * Returns the row with the given ID.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/table#getrow)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/tables)
   */
  getRow: (id: string, searchAll?: boolean) => Row<TData>
  /**
   * Returns the final model after all processing from other used features has been applied. This is the row model that is most commonly used for rendering.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/table#getrowmodel)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/tables)
   */
  getRowModel: () => RowModel<TData>
  /**
   * Call this function to get the table's current state. It's recommended to use this function and its state, especially when managing the table state manually. It is the exact same state used internally by the table for every feature and function it provides.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/table#getstate)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/tables)
   */
  getState: () => TableState
  /**
   * This is the resolved initial state of the table.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/table#initialstate)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/tables)
   */
  initialState: TableState
  /**
   * A read-only reference to the table's current options.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/table#options)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/tables)
   */
  options: RequiredKeys<TableOptionsResolved<TData>, 'state'>
  /**
   * Call this function to reset the table state to the initial state.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/table#reset)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/tables)
   */
  reset: () => void
  /**
   * This function can be used to update the table options.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/table#setoptions)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/tables)
   */
  setOptions: (newOptions: Updater<TableOptionsResolved<TData>>) => void
  /**
   * Call this function to update the table state.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/table#setstate)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/tables)
   */
  setState: (updater: Updater<TableState>) => void
}

export function createTable<TData extends RowData>(
  options: TableOptionsResolved<TData>
): Table<TData> {
  if (
    process.env.NODE_ENV !== 'production' &&
    (options.debugAll || options.debugTable)
  ) {
    console.info('Creating Table Instance...')
  }

  const _features = [...builtInFeatures, ...(options._features ?? [])]

  let table = { _features } as unknown as Table<TData>

  const defaultOptions = table._features.reduce((obj, feature) => {
    return Object.assign(obj, feature.getDefaultOptions?.(table))
  }, {}) as TableOptionsResolved<TData>

  const mergeOptions = (options: TableOptionsResolved<TData>) => {
    if (table.options.mergeOptions) {
      return table.options.mergeOptions(defaultOptions, options)
    }

    return {
      ...defaultOptions,
      ...options,
    }
  }

  const coreInitialState: CoreTableState = {}

  let initialState = {
    ...coreInitialState,
    ...(options.initialState ?? {}),
  } as TableState

  table._features.forEach(feature => {
    initialState = (feature.getInitialState?.(initialState) ??
      initialState) as TableState
  })

  const queued: (() => void)[] = []
  let queuedTimeout = false

  const coreInstance: CoreInstance<TData> = {
    _features,
    options: {
      ...defaultOptions,
      ...options,
    },
    initialState,
    _queue: cb => {
      queued.push(cb)

      if (!queuedTimeout) {
        queuedTimeout = true

        // Schedule a microtask to run the queued callbacks after
        // the current call stack (render, etc) has finished.
        Promise.resolve()
          .then(() => {
            while (queued.length) {
              queued.shift()!()
            }
            queuedTimeout = false
          })
          .catch(error =>
            setTimeout(() => {
              throw error
            })
          )
      }
    },
    reset: () => {
      table.setState(table.initialState)
    },
    setOptions: updater => {
      const newOptions = functionalUpdate(updater, table.options)
      table.options = mergeOptions(newOptions) as RequiredKeys<
        TableOptionsResolved<TData>,
        'state'
      >
    },

    getState: () => {
      return table.options.state as TableState
    },

    setState: (updater: Updater<TableState>) => {
      table.options.onStateChange?.(updater)
    },

    _getRowId: (row: TData, index: number, parent?: Row<TData>) =>
      table.options.getRowId?.(row, index, parent) ??
      `${parent ? [parent.id, index].join('.') : index}`,

    getCoreRowModel: () => {
      if (!table._getCoreRowModel) {
        table._getCoreRowModel = table.options.getCoreRowModel(table)
      }

      return table._getCoreRowModel!()
    },

    // The final calls start at the bottom of the model,
    // expanded rows, which then work their way up

    getRowModel: () => {
      return table.getPaginationRowModel()
    },
    //in next version, we should just pass in the row model as the optional 2nd arg
    getRow: (id: string, searchAll?: boolean) => {
      let row = (
        searchAll ? table.getPrePaginationRowModel() : table.getRowModel()
      ).rowsById[id]

      if (!row) {
        row = table.getCoreRowModel().rowsById[id]
        if (!row) {
          if (process.env.NODE_ENV !== 'production') {
            throw new Error(`getRow could not find row with ID: ${id}`)
          }
          throw new Error()
        }
      }

      return row
    },
    _getDefaultColumnDef: memo(
      () => [table.options.defaultColumn],
      defaultColumn => {
        defaultColumn = (defaultColumn ?? {}) as Partial<
          ColumnDef<TData, unknown>
        >

        return {
          header: props => {
            const resolvedColumnDef = props.header.column
              .columnDef as ColumnDefResolved<TData>

            if (resolvedColumnDef.accessorKey) {
              return resolvedColumnDef.accessorKey
            }

            if (resolvedColumnDef.accessorFn) {
              return resolvedColumnDef.id
            }

            return null
          },
          // footer: props => props.header.column.id,
          cell: props => props.renderValue<any>()?.toString?.() ?? null,
          ...table._features.reduce((obj, feature) => {
            return Object.assign(obj, feature.getDefaultColumnDef?.())
          }, {}),
          ...defaultColumn,
        } as Partial<ColumnDef<TData, unknown>>
      },
      getMemoOptions(options, 'debugColumns', '_getDefaultColumnDef')
    ),

    _getColumnDefs: () => table.options.columns,

    getAllColumns: memo(
      () => [table._getColumnDefs()],
      columnDefs => {
        const recurseColumns = (
          columnDefs: ColumnDef<TData, unknown>[],
          parent?: Column<TData, unknown>,
          depth = 0
        ): Column<TData, unknown>[] => {
          return columnDefs.map(columnDef => {
            const column = createColumn(table, columnDef, depth, parent)

            const groupingColumnDef = columnDef as GroupColumnDef<
              TData,
              unknown
            >

            column.columns = groupingColumnDef.columns
              ? recurseColumns(groupingColumnDef.columns, column, depth + 1)
              : []

            return column
          })
        }

        return recurseColumns(columnDefs)
      },
      getMemoOptions(options, 'debugColumns', 'getAllColumns')
    ),

    getAllFlatColumns: memo(
      () => [table.getAllColumns()],
      allColumns => {
        return allColumns.flatMap(column => {
          return column.getFlatColumns()
        })
      },
      getMemoOptions(options, 'debugColumns', 'getAllFlatColumns')
    ),

    _getAllFlatColumnsById: memo(
      () => [table.getAllFlatColumns()],
      flatColumns => {
        return flatColumns.reduce(
          (acc, column) => {
            acc[column.id] = column
            return acc
          },
          {} as Record<string, Column<TData, unknown>>
        )
      },
      getMemoOptions(options, 'debugColumns', 'getAllFlatColumnsById')
    ),

    getAllLeafColumns: memo(
      () => [table.getAllColumns(), table._getOrderColumnsFn()],
      (allColumns, orderColumns) => {
        let leafColumns = allColumns.flatMap(column => column.getLeafColumns())
        return orderColumns(leafColumns)
      },
      getMemoOptions(options, 'debugColumns', 'getAllLeafColumns')
    ),

    getColumn: columnId => {
      const column = table._getAllFlatColumnsById()[columnId]

      if (process.env.NODE_ENV !== 'production' && !column) {
        console.error(`[Table] Column with id '${columnId}' does not exist.`)
      }

      return column
    },
  }

  Object.assign(table, coreInstance)

  for (let index = 0; index < table._features.length; index++) {
    const feature = table._features[index]
    feature?.createTable?.(table)
  }

  return table
}

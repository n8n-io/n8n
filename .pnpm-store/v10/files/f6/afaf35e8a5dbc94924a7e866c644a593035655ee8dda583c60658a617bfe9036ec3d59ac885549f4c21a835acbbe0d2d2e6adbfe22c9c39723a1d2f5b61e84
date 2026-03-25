import {
  Column,
  Table,
  AccessorFn,
  ColumnDef,
  RowData,
  ColumnDefResolved,
} from '../types'
import { getMemoOptions, memo } from '../utils'

export interface CoreColumn<TData extends RowData, TValue> {
  /**
   * The resolved accessor function to use when extracting the value for the column from each row. Will only be defined if the column def has a valid accessor key or function defined.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/column#accessorfn)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-defs)
   */
  accessorFn?: AccessorFn<TData, TValue>
  /**
   * The original column def used to create the column.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/column#columndef)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-defs)
   */
  columnDef: ColumnDef<TData, TValue>
  /**
   * The child column (if the column is a group column). Will be an empty array if the column is not a group column.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/column#columns)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-defs)
   */
  columns: Column<TData, TValue>[]
  /**
   * The depth of the column (if grouped) relative to the root column def array.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/column#depth)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-defs)
   */
  depth: number
  /**
   * Returns the flattened array of this column and all child/grand-child columns for this column.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/column#getflatcolumns)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-defs)
   */
  getFlatColumns: () => Column<TData, TValue>[]
  /**
   * Returns an array of all leaf-node columns for this column. If a column has no children, it is considered the only leaf-node column.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/column#getleafcolumns)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-defs)
   */
  getLeafColumns: () => Column<TData, TValue>[]
  /**
   * The resolved unique identifier for the column resolved in this priority:
      - A manual `id` property from the column def
      - The accessor key from the column def
      - The header string from the column def
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/column#id)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-defs)
   */
  id: string
  /**
   * The parent column for this column. Will be undefined if this is a root column.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/core/column#parent)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-defs)
   */
  parent?: Column<TData, TValue>
}

export function createColumn<TData extends RowData, TValue>(
  table: Table<TData>,
  columnDef: ColumnDef<TData, TValue>,
  depth: number,
  parent?: Column<TData, TValue>
): Column<TData, TValue> {
  const defaultColumn = table._getDefaultColumnDef()

  const resolvedColumnDef = {
    ...defaultColumn,
    ...columnDef,
  } as ColumnDefResolved<TData>

  const accessorKey = resolvedColumnDef.accessorKey

  let id =
    resolvedColumnDef.id ??
    (accessorKey
      ? typeof String.prototype.replaceAll === 'function'
        ? accessorKey.replaceAll('.', '_')
        : accessorKey.replace(/\./g, '_')
      : undefined) ??
    (typeof resolvedColumnDef.header === 'string'
      ? resolvedColumnDef.header
      : undefined)

  let accessorFn: AccessorFn<TData> | undefined

  if (resolvedColumnDef.accessorFn) {
    accessorFn = resolvedColumnDef.accessorFn
  } else if (accessorKey) {
    // Support deep accessor keys
    if (accessorKey.includes('.')) {
      accessorFn = (originalRow: TData) => {
        let result = originalRow as Record<string, any>

        for (const key of accessorKey.split('.')) {
          result = result?.[key]
          if (process.env.NODE_ENV !== 'production' && result === undefined) {
            console.warn(
              `"${key}" in deeply nested key "${accessorKey}" returned undefined.`
            )
          }
        }

        return result
      }
    } else {
      accessorFn = (originalRow: TData) =>
        (originalRow as any)[resolvedColumnDef.accessorKey]
    }
  }

  if (!id) {
    if (process.env.NODE_ENV !== 'production') {
      throw new Error(
        resolvedColumnDef.accessorFn
          ? `Columns require an id when using an accessorFn`
          : `Columns require an id when using a non-string header`
      )
    }
    throw new Error()
  }

  let column: CoreColumn<TData, any> = {
    id: `${String(id)}`,
    accessorFn,
    parent: parent as any,
    depth,
    columnDef: resolvedColumnDef as ColumnDef<TData, any>,
    columns: [],
    getFlatColumns: memo(
      () => [true],
      () => {
        return [
          column as Column<TData, TValue>,
          ...column.columns?.flatMap(d => d.getFlatColumns()),
        ]
      },
      getMemoOptions(table.options, 'debugColumns', 'column.getFlatColumns')
    ),
    getLeafColumns: memo(
      () => [table._getOrderColumnsFn()],
      orderColumns => {
        if (column.columns?.length) {
          let leafColumns = column.columns.flatMap(column =>
            column.getLeafColumns()
          )

          return orderColumns(leafColumns)
        }

        return [column as Column<TData, TValue>]
      },
      getMemoOptions(table.options, 'debugColumns', 'column.getLeafColumns')
    ),
  }

  for (const feature of table._features) {
    feature.createColumn?.(column as Column<TData, TValue>, table)
  }

  // Yes, we have to convert table to unknown, because we know more than the compiler here.
  return column as Column<TData, TValue>
}

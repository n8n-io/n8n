import { Table, RowModel, Row, RowData } from '../types'
import { getMemoOptions, memo } from '../utils'
import { expandRows } from './getExpandedRowModel'

export function getPaginationRowModel<TData extends RowData>(opts?: {
  initialSync: boolean
}): (table: Table<TData>) => () => RowModel<TData> {
  return table =>
    memo(
      () => [
        table.getState().pagination,
        table.getPrePaginationRowModel(),
        table.options.paginateExpandedRows
          ? undefined
          : table.getState().expanded,
      ],
      (pagination, rowModel) => {
        if (!rowModel.rows.length) {
          return rowModel
        }

        const { pageSize, pageIndex } = pagination
        let { rows, flatRows, rowsById } = rowModel
        const pageStart = pageSize * pageIndex
        const pageEnd = pageStart + pageSize

        rows = rows.slice(pageStart, pageEnd)

        let paginatedRowModel: RowModel<TData>

        if (!table.options.paginateExpandedRows) {
          paginatedRowModel = expandRows({
            rows,
            flatRows,
            rowsById,
          })
        } else {
          paginatedRowModel = {
            rows,
            flatRows,
            rowsById,
          }
        }

        paginatedRowModel.flatRows = []

        const handleRow = (row: Row<TData>) => {
          paginatedRowModel.flatRows.push(row)
          if (row.subRows.length) {
            row.subRows.forEach(handleRow)
          }
        }

        paginatedRowModel.rows.forEach(handleRow)

        return paginatedRowModel
      },
      getMemoOptions(table.options, 'debugTable', 'getPaginationRowModel')
    )
}

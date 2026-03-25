import { createRow } from '../core/row'
import { Row, RowData, RowModel, Table } from '../types'
import { flattenBy, getMemoOptions, memo } from '../utils'
import { GroupingState } from '../features/ColumnGrouping'

export function getGroupedRowModel<TData extends RowData>(): (
  table: Table<TData>
) => () => RowModel<TData> {
  return table =>
    memo(
      () => [table.getState().grouping, table.getPreGroupedRowModel()],
      (grouping, rowModel) => {
        if (!rowModel.rows.length || !grouping.length) {
          rowModel.rows.forEach(row => {
            row.depth = 0
            row.parentId = undefined
          })
          return rowModel
        }

        // Filter the grouping list down to columns that exist
        const existingGrouping = grouping.filter(columnId =>
          table.getColumn(columnId)
        )

        const groupedFlatRows: Row<TData>[] = []
        const groupedRowsById: Record<string, Row<TData>> = {}
        // const onlyGroupedFlatRows: Row[] = [];
        // const onlyGroupedRowsById: Record<RowId, Row> = {};
        // const nonGroupedFlatRows: Row[] = [];
        // const nonGroupedRowsById: Record<RowId, Row> = {};

        // Recursively group the data
        const groupUpRecursively = (
          rows: Row<TData>[],
          depth = 0,
          parentId?: string
        ) => {
          // Grouping depth has been been met
          // Stop grouping and simply rewrite thd depth and row relationships
          if (depth >= existingGrouping.length) {
            return rows.map(row => {
              row.depth = depth

              groupedFlatRows.push(row)
              groupedRowsById[row.id] = row

              if (row.subRows) {
                row.subRows = groupUpRecursively(row.subRows, depth + 1, row.id)
              }

              return row
            })
          }

          const columnId: string = existingGrouping[depth]!

          // Group the rows together for this level
          const rowGroupsMap = groupBy(rows, columnId)

          // Perform aggregations for each group
          const aggregatedGroupedRows = Array.from(rowGroupsMap.entries()).map(
            ([groupingValue, groupedRows], index) => {
              let id = `${columnId}:${groupingValue}`
              id = parentId ? `${parentId}>${id}` : id

              // First, Recurse to group sub rows before aggregation
              const subRows = groupUpRecursively(groupedRows, depth + 1, id)

              subRows.forEach(subRow => {
                subRow.parentId = id
              })

              // Flatten the leaf rows of the rows in this group
              const leafRows = depth
                ? flattenBy(groupedRows, row => row.subRows)
                : groupedRows

              const row = createRow(
                table,
                id,
                leafRows[0]!.original,
                index,
                depth,
                undefined,
                parentId
              )

              Object.assign(row, {
                groupingColumnId: columnId,
                groupingValue,
                subRows,
                leafRows,
                getValue: (columnId: string) => {
                  // Don't aggregate columns that are in the grouping
                  if (existingGrouping.includes(columnId)) {
                    if (row._valuesCache.hasOwnProperty(columnId)) {
                      return row._valuesCache[columnId]
                    }

                    if (groupedRows[0]) {
                      row._valuesCache[columnId] =
                        groupedRows[0].getValue(columnId) ?? undefined
                    }

                    return row._valuesCache[columnId]
                  }

                  if (row._groupingValuesCache.hasOwnProperty(columnId)) {
                    return row._groupingValuesCache[columnId]
                  }

                  // Aggregate the values
                  const column = table.getColumn(columnId)
                  const aggregateFn = column?.getAggregationFn()

                  if (aggregateFn) {
                    row._groupingValuesCache[columnId] = aggregateFn(
                      columnId,
                      leafRows,
                      groupedRows
                    )

                    return row._groupingValuesCache[columnId]
                  }
                },
              })

              subRows.forEach(subRow => {
                groupedFlatRows.push(subRow)
                groupedRowsById[subRow.id] = subRow
                // if (subRow.getIsGrouped?.()) {
                //   onlyGroupedFlatRows.push(subRow);
                //   onlyGroupedRowsById[subRow.id] = subRow;
                // } else {
                //   nonGroupedFlatRows.push(subRow);
                //   nonGroupedRowsById[subRow.id] = subRow;
                // }
              })

              return row
            }
          )

          return aggregatedGroupedRows
        }

        const groupedRows = groupUpRecursively(rowModel.rows, 0)

        groupedRows.forEach(subRow => {
          groupedFlatRows.push(subRow)
          groupedRowsById[subRow.id] = subRow
          // if (subRow.getIsGrouped?.()) {
          //   onlyGroupedFlatRows.push(subRow);
          //   onlyGroupedRowsById[subRow.id] = subRow;
          // } else {
          //   nonGroupedFlatRows.push(subRow);
          //   nonGroupedRowsById[subRow.id] = subRow;
          // }
        })

        return {
          rows: groupedRows,
          flatRows: groupedFlatRows,
          rowsById: groupedRowsById,
        }
      },
      getMemoOptions(table.options, 'debugTable', 'getGroupedRowModel', () => {
        table._queue(() => {
          table._autoResetExpanded()
          table._autoResetPageIndex()
        })
      })
    )
}

function groupBy<TData extends RowData>(rows: Row<TData>[], columnId: string) {
  const groupMap = new Map<any, Row<TData>[]>()

  return rows.reduce((map, row) => {
    const resKey = `${row.getGroupingValue(columnId)}`
    const previous = map.get(resKey)
    if (!previous) {
      map.set(resKey, [row])
    } else {
      previous.push(row)
    }
    return map
  }, groupMap)
}

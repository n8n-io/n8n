import { Table, RowData } from '../types'
import { getMemoOptions, memo } from '../utils'

export function getFacetedMinMaxValues<TData extends RowData>(): (
  table: Table<TData>,
  columnId: string
) => () => undefined | [number, number] {
  return (table, columnId) =>
    memo(
      () => [table.getColumn(columnId)?.getFacetedRowModel()],
      facetedRowModel => {
        if (!facetedRowModel) return undefined

        const uniqueValues = facetedRowModel.flatRows
          .flatMap(flatRow => flatRow.getUniqueValues(columnId) ?? [])
          .map(Number)
          .filter(value => !Number.isNaN(value))

        if (!uniqueValues.length) return

        let facetedMinValue = uniqueValues[0]!
        let facetedMaxValue = uniqueValues[uniqueValues.length - 1]!

        for (const value of uniqueValues) {
          if (value < facetedMinValue) facetedMinValue = value
          else if (value > facetedMaxValue) facetedMaxValue = value
        }

        return [facetedMinValue, facetedMaxValue]
      },
      getMemoOptions(table.options, 'debugTable', 'getFacetedMinMaxValues')
    )
}

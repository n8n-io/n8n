import { RowModel } from '..'
import { Table, RowData, TableFeature } from '../types'

export interface GlobalFacetingInstance<TData extends RowData> {
  _getGlobalFacetedMinMaxValues?: () => undefined | [number, number]
  _getGlobalFacetedRowModel?: () => RowModel<TData>
  _getGlobalFacetedUniqueValues?: () => Map<any, number>
  /**
   * Currently, this function returns the built-in `includesString` filter function. In future releases, it may return more dynamic filter functions based on the nature of the data provided.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/global-faceting#getglobalautofilterfn)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/global-faceting)
   */
  getGlobalFacetedMinMaxValues: () => undefined | [number, number]
  /**
   * Returns the row model for the table after **global** filtering has been applied.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/global-faceting#getglobalfacetedrowmodel)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/global-faceting)
   */
  getGlobalFacetedRowModel: () => RowModel<TData>
  /**
   * Returns the faceted unique values for the global filter.
   * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/global-faceting#getglobalfaceteduniquevalues)
   * @link [Guide](https://tanstack.com/table/v8/docs/guide/global-faceting)
   */
  getGlobalFacetedUniqueValues: () => Map<any, number>
}

//

export const GlobalFaceting: TableFeature = {
  createTable: <TData extends RowData>(table: Table<TData>): void => {
    table._getGlobalFacetedRowModel =
      table.options.getFacetedRowModel &&
      table.options.getFacetedRowModel(table, '__global__')

    table.getGlobalFacetedRowModel = () => {
      if (table.options.manualFiltering || !table._getGlobalFacetedRowModel) {
        return table.getPreFilteredRowModel()
      }

      return table._getGlobalFacetedRowModel()
    }

    table._getGlobalFacetedUniqueValues =
      table.options.getFacetedUniqueValues &&
      table.options.getFacetedUniqueValues(table, '__global__')
    table.getGlobalFacetedUniqueValues = () => {
      if (!table._getGlobalFacetedUniqueValues) {
        return new Map()
      }

      return table._getGlobalFacetedUniqueValues()
    }

    table._getGlobalFacetedMinMaxValues =
      table.options.getFacetedMinMaxValues &&
      table.options.getFacetedMinMaxValues(table, '__global__')
    table.getGlobalFacetedMinMaxValues = () => {
      if (!table._getGlobalFacetedMinMaxValues) {
        return
      }

      return table._getGlobalFacetedMinMaxValues()
    }
  },
}

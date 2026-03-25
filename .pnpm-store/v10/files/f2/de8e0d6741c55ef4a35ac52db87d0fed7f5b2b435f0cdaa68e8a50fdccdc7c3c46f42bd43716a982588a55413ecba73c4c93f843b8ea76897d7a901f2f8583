import { RowModel } from '..';
import { RowData, Table, TableFeature } from '../types';
export interface FacetedColumn<TData extends RowData> {
    _getFacetedMinMaxValues?: () => undefined | [number, number];
    _getFacetedRowModel?: () => RowModel<TData>;
    _getFacetedUniqueValues?: () => Map<any, number>;
    /**
     * A function that **computes and returns** a min/max tuple derived from `column.getFacetedRowModel`. Useful for displaying faceted result values.
     * > ⚠️ Requires that you pass a valid `getFacetedMinMaxValues` function to `options.getFacetedMinMaxValues`. A default implementation is provided via the exported `getFacetedMinMaxValues` function.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-faceting#getfacetedminmaxvalues)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-faceting)
     */
    getFacetedMinMaxValues: () => undefined | [number, number];
    /**
     * Returns the row model with all other column filters applied, excluding its own filter. Useful for displaying faceted result counts.
     * > ⚠️ Requires that you pass a valid `getFacetedRowModel` function to `options.facetedRowModel`. A default implementation is provided via the exported `getFacetedRowModel` function.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-faceting#getfacetedrowmodel)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-faceting)
     */
    getFacetedRowModel: () => RowModel<TData>;
    /**
     * A function that **computes and returns** a `Map` of unique values and their occurrences derived from `column.getFacetedRowModel`. Useful for displaying faceted result values.
     * > ⚠️ Requires that you pass a valid `getFacetedUniqueValues` function to `options.getFacetedUniqueValues`. A default implementation is provided via the exported `getFacetedUniqueValues` function.
     * @link [API Docs](https://tanstack.com/table/v8/docs/api/features/column-faceting#getfaceteduniquevalues)
     * @link [Guide](https://tanstack.com/table/v8/docs/guide/column-faceting)
     */
    getFacetedUniqueValues: () => Map<any, number>;
}
export interface FacetedOptions<TData extends RowData> {
    getFacetedMinMaxValues?: (table: Table<TData>, columnId: string) => () => undefined | [number, number];
    getFacetedRowModel?: (table: Table<TData>, columnId: string) => () => RowModel<TData>;
    getFacetedUniqueValues?: (table: Table<TData>, columnId: string) => () => Map<any, number>;
}
export declare const ColumnFaceting: TableFeature;

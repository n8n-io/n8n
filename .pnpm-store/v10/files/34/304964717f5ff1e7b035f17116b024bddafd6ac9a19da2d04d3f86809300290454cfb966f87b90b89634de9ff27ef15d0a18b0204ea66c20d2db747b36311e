import type { GridApi } from '../api/gridApi';
/**
 * Enables types safe create of the given type without the need to set the common grid properties
 * that will be merged with the object in a centralised location.
 */
export type WithoutGridCommon<T> = Omit<T, keyof AgGridCommon<any, any>>;
export interface AgGridCommon<TData, TContext> {
    /** The grid api. */
    api: GridApi<TData>;
    /** Application context as set on `gridOptions.context`. */
    context: TContext;
}

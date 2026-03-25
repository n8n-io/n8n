import type { AdvancedFilterModel } from './advancedFilterModel';
import type { ColumnVO } from './iColumnVO';
import type { AgGridCommon } from './iCommon';
import type { FilterModel } from './iFilter';
import type { IRowNode } from './iRowNode';
import type { LoadSuccessParams } from './iServerSideRowModel';
import type { SortModelItem } from './iSortModelItem';
export interface IServerSideGetRowsRequest {
    /** First row requested or undefined for all rows. */
    startRow: number | undefined;
    /** Index after the last row required row or undefined for all rows. */
    endRow: number | undefined;
    /** Columns that are currently row grouped.  */
    rowGroupCols: ColumnVO[];
    /** Columns that have aggregations on them.  */
    valueCols: ColumnVO[];
    /** Columns that have pivot on them.  */
    pivotCols: ColumnVO[];
    /** Defines if pivot mode is on or off.  */
    pivotMode: boolean;
    /** What groups the user is viewing.  */
    groupKeys: string[];
    /**
     * If filtering, what the filter model is.
     * If Advanced Filter is enabled, will be of type `AdvancedFilterModel | null`.
     * If Advanced Filter is disabled, will be of type `FilterModel`.
     */
    filterModel: FilterModel | AdvancedFilterModel | null;
    /** If sorting, what the sort model is.  */
    sortModel: SortModelItem[];
}
export interface IServerSideGetRowsParams<TData = any, TContext = any> extends AgGridCommon<TData, TContext> {
    /**
     * Details for the request. A simple object that can be converted to JSON.
     */
    request: IServerSideGetRowsRequest;
    /**
     * The parent row node. The RootNode (level -1) if request is top level.
     * This is NOT part fo the request as it cannot be serialised to JSON (a rowNode has methods).
     */
    parentNode: IRowNode<TData>;
    /**
     * Success callback, pass the rows back to the grid that were requested.
     */
    success(params: LoadSuccessParams<TData>): void;
    /**
     * Fail callback, tell the grid the call failed so it can adjust it's state.
     */
    fail(): void;
}
export interface IServerSideDatasource<TData = any> {
    /**
     * Grid calls `getRows` when it requires more rows as specified in the params.
     * Params object contains callbacks for responding to the request.
     */
    getRows(params: IServerSideGetRowsParams<TData>): void;
    /** Optional method, if your datasource has state it needs to clean up. */
    destroy?(): void;
}

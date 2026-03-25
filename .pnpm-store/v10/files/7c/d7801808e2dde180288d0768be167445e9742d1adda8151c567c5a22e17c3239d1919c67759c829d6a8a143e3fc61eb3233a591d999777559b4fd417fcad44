import type { ServerSideGroupLevelState } from './IServerSideStore';
import type { IRowModel } from './iRowModel';
import type { IRowNode } from './iRowNode';
import type { IServerSideDatasource } from './iServerSideDatasource';
import type { ServerSideTransaction, ServerSideTransactionResult } from './serverSideTransaction';
export interface IServerSideRowModel<TData = any> extends IRowModel {
    refreshStore(params?: RefreshServerSideParams): void;
    onRowHeightChanged(): void;
    getStoreState(): ServerSideGroupLevelState[];
    retryLoads(): void;
    expandAll(value: boolean): void;
    setDatasource(datasource: IServerSideDatasource<TData>): void;
    forEachNodeAfterFilterAndSort(callback: (node: IRowNode<TData>, index: number) => void, includeFooterNodes?: boolean): void;
    resetRootStore(): void;
    getBlockStates(): void;
    setRowCount(rowCount: number, isLastRowIndexKnown?: boolean): void;
    applyRowData(rowDataParams: LoadSuccessParams<TData>, startRow: number, route: string[]): void;
    /**
     * @deprecated v33.1.0 - use `gridApi.onRowHeightChanged()` instead
     */
    onRowHeightChangedDebounced(): void;
}
export interface IServerSideTransactionManager<TData = any> {
    applyTransaction(transaction: ServerSideTransaction<TData>): ServerSideTransactionResult<TData> | undefined;
    applyTransactionAsync(transaction: ServerSideTransaction<TData>, callback?: (res: ServerSideTransactionResult<TData>) => void): void;
    flushAsyncTransactions(): void;
}
export interface RefreshServerSideParams {
    /**
     * List of group keys, pointing to the level to refresh.
     * For example, to purge two levels down under 'Canada'and then '2002', pass in the string array ['Canada','2002'].
     * If no route is passed, or an empty array, then the top level is refreshed.
     */
    route?: string[];
    /**
     * If true, then all rows at the level getting refreshed are immediately destroyed and 'loading' rows will appear.
     * If false, then all rows at the level getting refreshed are kept until rows are loaded (no 'loading' rows appear).
     */
    purge?: boolean;
}
export interface LoadSuccessParams<TData = any> {
    /**
     * Data retrieved from the server as requested by the grid.
     */
    rowData: TData[];
    /**
     * The last row, if known, to help Infinite Scroll.
     */
    rowCount?: number;
    /**
     * Any extra information for the grid to associate with this load.
     */
    groupLevelInfo?: any;
    /**
     * The pivot fields in the response - if provided the grid will attempt to generate secondary columns.
     */
    pivotResultFields?: string[];
}

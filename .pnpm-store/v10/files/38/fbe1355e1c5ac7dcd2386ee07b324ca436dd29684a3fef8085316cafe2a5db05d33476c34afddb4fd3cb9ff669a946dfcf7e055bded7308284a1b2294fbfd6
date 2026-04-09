import type { ChangedRowNodes } from '../clientSideRowModel/changedRowNodes';
import type { GridOptions } from '../entities/gridOptions';
import type { RowNode } from '../entities/rowNode';
import type { ChangedPath } from '../utils/changedPath';
import type { ForEachNodeCallback, IRowModel } from './iRowModel';
import type { RowDataTransaction } from './rowDataTransaction';
import type { RowNodeTransaction } from './rowNodeTransaction';
export type ClientSideRowModelStep = 'everything' | 'group' | 'filter' | 'sort' | 'map' | 'aggregate' | 'filter_aggregates' | 'pivot' | 'nothing';
export type ClientSideRowModelStage = 'group' | 'filter' | 'sort' | 'map' | 'aggregate' | 'filter_aggregates' | 'pivot' | 'nothing';
export interface IClientSideRowModel<TData = any> extends IRowModel {
    /** The root row containing all the rows */
    readonly rootNode: RowNode | null;
    readonly rowCountReady: boolean;
    updateRowData(rowDataTran: RowDataTransaction<TData>): RowNodeTransaction<TData> | null;
    refreshModel(params: RefreshModelParams): void;
    forEachLeafNode(callback: ForEachNodeCallback<TData>): void;
    forEachNodeAfterFilter(callback: ForEachNodeCallback<TData>, includeFooterNodes?: boolean): void;
    forEachNodeAfterFilterAndSort(callback: ForEachNodeCallback<TData>, includeFooterNodes?: boolean): void;
    forEachPivotNode(callback: ForEachNodeCallback<TData>, includeFooterNodes?: boolean, afterSort?: boolean): void;
    batchUpdateRowData(rowDataTransaction: RowDataTransaction<TData>, callback?: (res: RowNodeTransaction<TData>) => void): void;
    flushAsyncTransactions(): void;
    doAggregate(changedPath?: ChangedPath): void;
    getTopLevelNodes(): RowNode[] | null;
    /**
     * @deprecated v33.1.0 - use `gridApi.onRowHeightChanged()` instead
     */
    onRowHeightChangedDebounced(): void;
}
export interface RefreshModelParams<TData = any> {
    /** how much of the pipeline to execute */
    step: ClientSideRowModelStage;
    /** The set of changed grid options, if any */
    changedProps?: Set<keyof GridOptions<TData>>;
    /**
     * true if the row data changed, due to a setRowData, immutable row data or a transaction, or an update of the row data.
     */
    rowDataUpdated?: boolean;
    /**
     * Indicates a completely new rowData array is loaded.
     * Is true if user called setRowData() (or a new page in pagination). the grid scrolls back to the top when this is true.
     */
    newData?: boolean;
    /**
     * A data structure that holds the affected row nodes, if this was an update and not a full reload.
     */
    changedRowNodes?: ChangedRowNodes<TData>;
    /** The changedPath, if any */
    changedPath?: ChangedPath;
    /**
     * if NOT new data, then this flag tells grid to check if rows already
     * exist for the nodes (matching by node id) and reuses the row if it does.
     */
    keepRenderedRows?: boolean;
    /**
     * if true, rows that are kept are animated to the new position
     */
    animate?: boolean;
    /** true if this update is due to columns changing, ie no rows were changed */
    afterColumnsChanged?: boolean;
    /** true if all we did is changed row height, data still the same, no need to clear the undo/redo stacks */
    keepUndoRedoStack?: boolean;
}

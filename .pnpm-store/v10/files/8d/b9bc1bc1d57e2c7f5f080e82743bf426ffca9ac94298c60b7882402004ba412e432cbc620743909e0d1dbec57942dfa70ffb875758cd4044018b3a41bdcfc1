import type { NamedBean } from '../context/bean';
import { BeanStub } from '../context/beanStub';
import { RowNode } from '../entities/rowNode';
import type { IClientSideRowModel, RefreshModelParams } from '../interfaces/iClientSideRowModel';
import type { ForEachNodeCallback, RowBounds, RowModelType } from '../interfaces/iRowModel';
import type { RowDataTransaction } from '../interfaces/rowDataTransaction';
import type { RowNodeTransaction } from '../interfaces/rowNodeTransaction';
import { ChangedPath } from '../utils/changedPath';
export declare class ClientSideRowModel extends BeanStub implements IClientSideRowModel, NamedBean {
    beanName: "rowModel";
    rootNode: RowNode | null;
    rowCountReady: boolean;
    private nodeManager;
    private rowsToDisplay;
    /** Keep track if row data was updated. Important with suppressModelUpdateAfterUpdateTransaction and refreshModel api is called  */
    private rowDataUpdatedPending;
    private asyncTransactions;
    private asyncTransactionsTimer;
    /** Has the start method been called */
    private started;
    /**
     * This is to prevent refresh model being called when it's already being called.
     * E.g. the group stage can trigger initial state filter model to be applied. This fires onFilterChanged,
     * which then triggers the listener here that calls refresh model again but at the filter stage
     * (which is about to be run by the original call).
     */
    private refreshingModel;
    private rowNodesCountReady;
    /** The stages that process row nodes, in order of execution */
    private stages;
    /** Maps a property name to the index in this.stages array */
    private readonly stagesRefreshProps;
    postConstruct(): void;
    private addPropertyListeners;
    start(): void;
    private setInitialData;
    ensureRowHeightsValid(startPixel: number, endPixel: number, startLimitIndex: number, endLimitIndex: number): boolean;
    private onPropChange;
    private getRefreshedStage;
    private setRowTopAndRowIndex;
    private clearRowTopAndRowIndex;
    isLastRowIndexKnown(): boolean;
    getRowCount(): number;
    /**
     * Returns the number of rows with level === 1
     */
    getTopLevelRowCount(): number;
    /**
     * Get the row display index by the top level index
     * top level index is the index of rows with level === 1
     */
    getTopLevelRowDisplayedIndex(topLevelIndex: number): number;
    /**
     * The opposite of `getTopLevelRowDisplayedIndex`
     */
    getTopLevelIndexFromDisplayedIndex(displayedIndex: number): number;
    getRowBounds(index: number): RowBounds | null;
    private onRowGroupOpened;
    private onFilterChanged;
    private onSortChanged;
    getType(): RowModelType;
    private onValueChanged;
    private createChangePath;
    private isSuppressModelUpdateAfterUpdateTransaction;
    refreshModel(params: RefreshModelParams): void;
    isEmpty(): boolean;
    isRowsToRender(): boolean;
    getNodesInRangeForSelection(firstInRange: RowNode, lastInRange: RowNode): RowNode[];
    getTopLevelNodes(): RowNode[] | null;
    getRow(index: number): RowNode;
    isRowPresent(rowNode: RowNode): boolean;
    getRowIndexAtPixel(pixelToMatch: number): number;
    private isRowInPixel;
    forEachLeafNode(callback: ForEachNodeCallback): void;
    forEachNode(callback: ForEachNodeCallback, includeFooterNodes?: boolean): void;
    forEachDisplayedNode(callback: ForEachNodeCallback): void;
    forEachNodeAfterFilter(callback: ForEachNodeCallback, includeFooterNodes?: boolean): void;
    forEachNodeAfterFilterAndSort(callback: ForEachNodeCallback, includeFooterNodes?: boolean): void;
    forEachPivotNode(callback: ForEachNodeCallback, includeFooterNodes?: boolean, afterSort?: boolean): void;
    /**
     * Iterate through each node and all of its children
     * @param callback the function to execute for each node
     * @param includeFooterNodes whether to also iterate over footer nodes
     * @param nodes the nodes to start iterating over
     * @param getChildren a function to determine the recursion strategy
     * @param startIndex the index to start from
     * @returns the index ended at
     */
    private depthFirstSearchRowNodes;
    doAggregate(changedPath?: ChangedPath): void;
    private doFilterAggregates;
    private doSort;
    private doGrouping;
    private doFilter;
    private doPivot;
    getRowNode(id: string): RowNode | undefined;
    batchUpdateRowData(rowDataTransaction: RowDataTransaction, callback?: (res: RowNodeTransaction) => void): void;
    flushAsyncTransactions(): void;
    private executeBatchUpdateRowData;
    /**
     * Used to apply transaction changes.
     * Called by gridApi & rowDragFeature
     */
    updateRowData(rowDataTran: RowDataTransaction): RowNodeTransaction | null;
    /**
     * Common to:
     * - executeBatchUpdateRowData (batch transactions)
     * - updateRowData (single transaction)
     * - setImmutableRowData (generated transaction)
     *
     * @param rowNodeTrans - the transactions to apply
     * @param orderChanged - whether the order of the rows has changed, either via generated transaction or user provided addIndex
     */
    private commitTransactions;
    private doRowsToDisplay;
    onRowHeightChanged(): void;
    resetRowHeights(): void;
    private resetRowHeightsForAllRowNodes;
    private onGridStylesChanges;
    private onGridReady;
    destroy(): void;
    private readonly onRowHeightChanged_debounced;
    /**
     * @deprecated v33.1
     */
    onRowHeightChangedDebounced(): void;
}

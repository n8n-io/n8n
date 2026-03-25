import type { RowNode } from '../entities/rowNode';
export interface RowBounds {
    rowTop: number;
    rowHeight: number;
    rowIndex?: number;
}
export type RowModelType = 'infinite' | 'viewport' | 'clientSide' | 'serverSide';
export interface IRowModel {
    /** Returns the rowNode at the given index. */
    getRow(index: number): RowNode | undefined;
    /** Returns the rowNode for given id. */
    getRowNode(id: string): RowNode | undefined;
    /** Returns the number of rows */
    getRowCount(): number;
    getTopLevelRowCount(): number;
    getTopLevelRowDisplayedIndex(topLevelIndex: number): number;
    getTopLevelIndexFromDisplayedIndex?(displayedIndex: number): number;
    /** Returns the row index at the given pixel */
    getRowIndexAtPixel(pixel: number): number;
    /** Returns true if the provided rowNode is in the list of rows to render */
    isRowPresent(rowNode: RowNode): boolean;
    /** Returns row top and bottom for a given row */
    getRowBounds(index: number): RowBounds | null;
    /** Returns true if this model has no rows, regardless of model filter. EG if rows present, but filtered
     * out, this still returns false. If it returns true, then the grid shows the 'no rows' overlay - but we
     * don't show that overlay if the rows are just filtered out. */
    isEmpty(): boolean;
    /** Returns true if no rows (either no rows at all, or the rows are filtered out). This is what the grid
     * uses to know if there are rows to render or not. */
    isRowsToRender(): boolean;
    /** Returns all rows in range that should be selected. If there is a gap in range (non ClientSideRowModel) then
     *  then no rows should be returned  */
    getNodesInRangeForSelection(first: RowNode, last: RowNode): RowNode[] | null;
    /** Iterate through each node. What this does depends on the model type. For clientSide, goes through
     * all nodes. For serverSide, goes through what's loaded in memory. */
    forEachNode(callback: (rowNode: RowNode, index: number) => void, includeFooterNodes?: boolean): void;
    /** Iterate through each each flattened node, appearing as the grid does when scrolled
     * Used for spanning */
    forEachDisplayedNode?(callback: (rowNode: RowNode, index: number) => void): void;
    /** The base class returns the type. We use this instead of 'instanceof' as the client might provide
     * their own implementation of the models in the future. */
    getType(): RowModelType;
    /**
     * It tells us if this row model knows about the last row that it can produce. This is used by the
     * PaginationPanel, if last row is not found, then the 'last' button is disabled and the last page is
     * not shown. This is always true for ClientSideRowModel. It toggles for InfiniteRowModel.
     */
    isLastRowIndexKnown(): boolean;
    /** Used by CSRM only - is makes sure there are now estimated row heights within the range. */
    ensureRowHeightsValid(startPixel: number, endPixel: number, startLimitIndex: number, endLimitIndex: number): boolean;
    /** Gets called after grid is initialised. What happens depends on row model. Client Side will take rowData
     * from gridOptions, the other row models will start calling their datasources. */
    start(): void;
}

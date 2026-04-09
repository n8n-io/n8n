import type { GridApi } from '../api/gridApi';
import type { RowNode } from '../entities/rowNode';
import type { RowCtrl } from '../rendering/row/rowCtrl';
export interface RowGroupExpansionState {
    expandedRowGroupIds: string[];
    collapsedRowGroupIds: string[];
}
export interface RowGroupBulkExpansionState {
    /**
     * If true, all groups are expanded except those in `invertedRowGroupIds`.
     * If false, all groups are collapsed except those in `invertedRowGroupIds`.
     * If undefined, the grid is in its initial state (no groups expanded or collapsed).
     */
    expandAll: boolean | undefined;
    invertedRowGroupIds: string[];
}
export interface IExpansionService<T extends RowGroupExpansionState | RowGroupBulkExpansionState = RowGroupExpansionState> {
    addExpandedCss(classes: string[], rowNode: RowNode): void;
    getRowExpandedListeners(rowCtrl: RowCtrl): {
        expandedChanged: () => void;
        hasChildrenChanged: () => void;
    };
    setExpansionState(state: T, source: 'gridInitializing' | 'api'): void;
    getExpansionState(): T;
    expandAll(value: boolean): void;
    onGroupExpandedOrCollapsed(): void;
    setExpanded(rowNode: RowNode, expanded: boolean, e?: MouseEvent | KeyboardEvent, forceSync?: boolean): void;
    isExpandable(rowNode: RowNode): boolean;
    setDetailsExpansionState(detailGridApi: GridApi): void;
}

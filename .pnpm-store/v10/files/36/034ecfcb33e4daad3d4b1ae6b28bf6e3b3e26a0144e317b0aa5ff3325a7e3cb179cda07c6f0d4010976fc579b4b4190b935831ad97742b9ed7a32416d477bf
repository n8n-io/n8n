import type { AgColumn } from '../entities/agColumn';
import type { RowNode } from '../entities/rowNode';
export declare class ChangedPath {
    private readonly keepingColumns;
    private readonly pathRoot;
    active: boolean;
    private nodeIdsToColumns;
    private mapToItems;
    constructor(keepingColumns: boolean, rootNode: RowNode);
    private depthFirstSearchChangedPath;
    private depthFirstSearchEverything;
    forEachChangedNodeDepthFirst(callback: (rowNode: RowNode) => void, traverseLeafNodes?: boolean, includeUnchangedNodes?: boolean): void;
    executeFromRootNode(callback: (rowNode: RowNode) => void): void;
    private createPathItems;
    private populateColumnsMap;
    private linkPathItems;
    addParentNode(rowNode: RowNode | null, columns?: AgColumn[]): void;
    canSkip(rowNode: RowNode): boolean;
    getValueColumnsForNode(rowNode: RowNode, valueColumns: AgColumn[]): AgColumn[];
    getNotValueColumnsForNode(rowNode: RowNode, valueColumns: AgColumn[]): AgColumn[] | null;
}

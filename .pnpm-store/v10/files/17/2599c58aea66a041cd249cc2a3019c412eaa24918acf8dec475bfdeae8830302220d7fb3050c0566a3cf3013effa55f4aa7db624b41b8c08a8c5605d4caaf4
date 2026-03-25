import type { RowNode } from '../entities/rowNode';
import type { IRowModel } from '../interfaces/iRowModel';
import type { IPinnedRowModel } from '../main-umd-noStyles';
interface RangePartition {
    keep: readonly RowNode[];
    discard: readonly RowNode[];
}
/**
 * The context of a row range selection operation.
 *
 * Used to model the stateful range selection behaviour found in things like Excel and
 * various file explorers, in particular Windows File Explorer, where a given cell/row
 * represents the "root" of a selection range, and subsequent selections are based off that root.
 *
 * See AG-9620 for more
 */
export declare class RowRangeSelectionContext {
    private readonly rowModel;
    private readonly pinnedRowModel?;
    /** Whether the user is currently selecting all nodes either via the header checkbox or API */
    selectAll: boolean;
    private rootId;
    /**
     * Note that the "end" `RowNode` may come before or after the "root" `RowNode` in the
     * actual grid.
     */
    private endId;
    private cachedRange;
    constructor(rowModel: IRowModel, pinnedRowModel?: IPinnedRowModel | undefined);
    reset(): void;
    setRoot(node: RowNode): void;
    setEndRange(end: RowNode): void;
    getRange(): readonly RowNode[];
    isInRange(node: RowNode): boolean;
    getRoot(fallback?: RowNode): RowNode | undefined;
    private getEnd;
    private getRowNode;
    /**
     * Truncates the range to the given node (assumed to be within the current range).
     * Returns nodes that remain in the current range and those that should be removed
     *
     * @param node - Node at which to truncate the range
     * @returns Object of nodes to either keep or discard (i.e. deselect) from the range
     */
    truncate(node: RowNode): RangePartition;
    /**
     * Extends the range to the given node. Returns nodes that remain in the current range
     * and those that should be removed.
     *
     * @param node - Node marking the new end of the range
     * @returns Object of nodes to either keep or discard (i.e. deselect) from the range
     */
    extend(node: RowNode, groupSelectsChildren?: boolean): RangePartition;
    private getNodesInRange;
}
export {};

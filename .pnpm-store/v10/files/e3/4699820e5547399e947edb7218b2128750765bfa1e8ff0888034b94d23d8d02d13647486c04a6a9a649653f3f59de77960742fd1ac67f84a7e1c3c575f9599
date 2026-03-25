import type { BeanCollection } from '../context/context';
import type { RowNode } from '../entities/rowNode';
import type { RowPinnedType } from '../interfaces/iRowNode';
export declare class PinnedRows {
    private readonly beans;
    readonly floating: NonNullable<RowPinnedType>;
    /** Canonical set of pinned nodes */
    private all;
    /**
     * Set of nodes that should currently be visible given the context of the grid.
     * This is currently used for hiding leaf nodes in pivot mode and filtered nodes.
     */
    private visible;
    /** Ordering of nodes in the pinned area */
    private order;
    /** IDs of nodes that need to be pinned once they are available from the row model (SSRM) */
    private queued;
    constructor(beans: BeanCollection, floating: NonNullable<RowPinnedType>);
    size(): number;
    add(node: RowNode): void;
    delete(item: RowNode): void;
    has(item: RowNode): boolean;
    forEach(fn: (node: RowNode, i: number) => void): void;
    getByIndex(i: number): RowNode | undefined;
    getById(id: string): RowNode | undefined;
    clear(): void;
    sort(): void;
    hide(shouldHide: (node: RowNode) => boolean): void;
    queue(id: string): void;
    unqueue(id: string): void;
    forEachQueued(fn: (id: string) => void): void;
}
/** Expect to be passed the source node, not the pinned node */
export declare function _shouldHidePinnedRows(beans: BeanCollection, node: RowNode): boolean;

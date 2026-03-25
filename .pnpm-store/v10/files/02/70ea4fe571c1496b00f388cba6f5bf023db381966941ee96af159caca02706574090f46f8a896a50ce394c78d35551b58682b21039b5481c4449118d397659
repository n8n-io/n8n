import type { RowNode } from '../entities/rowNode';
import type { IRowNode } from '../interfaces/iRowNode';
export declare class ChangedRowNodes<TData = any> {
    readonly removals: Set<RowNode<TData>>;
    readonly updates: Set<RowNode<TData>>;
    readonly adds: Set<RowNode<TData>>;
    /** Marks a row as removed. Order of operations is: remove, update, add */
    remove(node: IRowNode<TData>): void;
    /** Marks a row as updated. Order of operations is: remove, update, add */
    update(node: IRowNode<TData>): void;
    /** Marks a row as added. Order of operation is: remove, update, add */
    add(node: IRowNode<TData>): void;
}

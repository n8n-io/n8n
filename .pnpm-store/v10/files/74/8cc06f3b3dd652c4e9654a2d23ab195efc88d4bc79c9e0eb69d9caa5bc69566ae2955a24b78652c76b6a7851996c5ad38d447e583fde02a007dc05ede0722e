import type { IRowNode } from './iRowNode';
export interface ServerSideTransaction<TData = any> {
    /**
     * The Row Store to apply the transaction to, ie what group level.
     * eg ['Ireland','2002'] to update the child store found after expanding Ireland and 2002 groups.
     * Passing in blank to empty applies the transaction to the top level.
     */
    route?: string[];
    /** Index position to add at. If missing, rows will be added to the end. */
    addIndex?: number;
    /** Rows to add */
    add?: TData[];
    /** Rows to remove */
    remove?: TData[];
    /** Rows to update */
    update?: TData[];
}
export interface ServerSideTransactionResult<TData = any> {
    /** The status of applying the transaction. */
    status: ServerSideTransactionResultStatus;
    /** If rows were added, the newly created Row Nodes for those rows. */
    add?: IRowNode<TData>[];
    /** If rows were removed, the deleted Row Nodes. */
    remove?: IRowNode<TData>[];
    /** If rows were updated, the updated Row Nodes. */
    update?: IRowNode<TData>[];
}
export declare enum ServerSideTransactionResultStatus {
    /** Transaction was successfully applied */
    Applied = "Applied",
    /**
     * Store was not found, transaction not applied.
     * Either invalid route, or the parent row has not yet been expanded.
     */
    StoreNotFound = "StoreNotFound",
    /**
     * Store is loading, transaction not applied.
     */
    StoreLoading = "StoreLoading",
    /**
     * Store is loading (as max loads exceeded), transaction not applied.
     */
    StoreWaitingToLoad = "StoreWaitingToLoad",
    /**
     * Store load attempt failed, transaction not applied.
     */
    StoreLoadingFailed = "StoreLoadingFailed",
    /**
     * Store is type Partial, which doesn't accept transactions
     */
    StoreWrongType = "StoreWrongType",
    /**
     * Transaction was cancelled, due to grid.
     * Callback isApplyServerSideTransaction() returning false
     */
    Cancelled = "Cancelled",
    /**
     * Store has not started yet, transaction not applied
     */
    StoreNotStarted = "StoreNotStarted"
}

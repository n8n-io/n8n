import { Resource } from 'utilium/cache.js';
import '../../polyfills.js';
import type { StoreFS } from './fs.js';
import type { UsageInfo } from '../../internal/filesystem.js';
/**
 * @category Stores and Transactions
 */
export type StoreFlag = 
/** The store supports partial reads and writes */
'partial';
/**
 * Represents a key-value store.
 * @category Stores and Transactions
 */
export interface Store {
    /**
     * @see FileSystem#id
     */
    readonly id?: number;
    /**
     * What the file system using this store should be called.
     * For example, tmpfs for an in memory store
     */
    readonly name: string;
    /**
     * A name for this instance of the store.
     * For example, you might use a share name for a network-based store
     */
    readonly label?: string;
    /**
     * Syncs the store
     */
    sync(): Promise<void>;
    /**
     * Empties the store completely.
     * @deprecated
     */
    clear?(): Promise<void> | void;
    /**
     * Empties the store completely.
     * @deprecated
     */
    clearSync?(): void;
    /**
     * Begins a new transaction.
     */
    transaction(): Transaction;
    /**
     * Use for optimizations
     */
    readonly flags?: readonly StoreFlag[];
    /**
     * Usage information for the store
     */
    usage?(): UsageInfo;
    /**
     * @internal @hidden
     */
    _fs?: StoreFS;
}
/**
 * A transaction for a store.
 * @category Stores and Transactions
 */
export declare abstract class Transaction<T extends Store = Store> {
    readonly store: T;
    constructor(store: T);
    /**
     * Gets all of the keys
     */
    abstract keys(): Promise<Iterable<number>>;
    /**
     * Retrieves data.
     * @param id The key to look under for data.
     */
    abstract get(id: number, offset: number, end?: number): Promise<Uint8Array | undefined>;
    /**
     * Retrieves data.
     * Throws an error if an error occurs or if the key does not exist.
     * @param id The key to look under for data.
     * @return The data stored under the key, or undefined if not present.
     */
    abstract getSync(id: number, offset: number, end?: number): Uint8Array | undefined;
    /**
     * Adds the data to the store under an id. Overwrites any existing data.
     * @param id The key to add the data under.
     * @param data The data to add to the store.
     */
    abstract set(id: number, data: Uint8Array, offset: number): Promise<void>;
    /**
     * Adds the data to the store under and id.
     * @param id The key to add the data under.
     * @param data The data to add to the store.
     */
    abstract setSync(id: number, data: Uint8Array, offset: number): void;
    /**
     * Deletes the data at `ino`.
     * @param id The key to delete from the store.
     */
    abstract remove(id: number): Promise<void>;
    /**
     * Deletes the data at `ino`.
     * @param id The key to delete from the store.
     */
    abstract removeSync(id: number): void;
}
/**
 * Transaction that implements asynchronous operations with synchronous ones
 * @category Stores and Transactions
 */
export declare abstract class SyncTransaction<T extends Store = Store> extends Transaction<T> {
    get(id: number, offset: number, end?: number): Promise<Uint8Array | undefined>;
    set(id: number, data: Uint8Array, offset: number): Promise<void>;
    remove(id: number): Promise<void>;
}
/**
 * @category Stores and Transactions
 */
export interface AsyncStore extends Store {
    cache?: Map<number, Resource<number>>;
}
/**
 * Transaction that implements synchronous operations with a cache
 * Implementors: You *must* update the cache and wait for `store.asyncDone` in your asynchronous methods.
 * @todo Make sure we handle abortions correctly, especially since the cache is shared between transactions.
 * @category Stores and Transactions
 */
export declare abstract class AsyncTransaction<T extends AsyncStore = AsyncStore> extends Transaction<T> {
    protected asyncDone: Promise<unknown>;
    /**
     * Run a asynchronous operation from a sync context. Not magic and subject to (race) conditions.
     * @internal
     */
    protected async(promise: Promise<unknown>): void;
    /**
     * Gets a cache resource
     * If `info` is set and the resource doesn't exist, it will be created
     * @internal
     */
    _cached(id: number, info?: {
        size: number;
    }): Resource<number> | undefined;
    getSync(id: number, offset: number, end?: number): Uint8Array | undefined;
    setSync(id: number, data: Uint8Array, offset: number): void;
    removeSync(id: number): void;
}
/**
 * Wraps a transaction with the ability to roll-back changes, among other things.
 * This is used by `StoreFS`
 * @category Stores and Transactions
 * @internal @hidden
 */
export declare class WrappedTransaction<T extends Store = Store> {
    readonly raw: Transaction<T>;
    protected fs: StoreFS<T>;
    /**
     * Whether the transaction was committed or aborted
     */
    protected done: boolean;
    flag(flag: StoreFlag): boolean;
    constructor(raw: Transaction<T>, fs: StoreFS<T>);
    /**
     * Stores data in the keys we modify prior to modifying them.
     * Allows us to roll back commits.
     */
    protected originalData: Map<number, {
        data?: Uint8Array;
        offset: number;
    }[]>;
    /**TransactionEntry
     * List of keys modified in this transaction, if any.
     */
    protected modifiedKeys: Set<number>;
    keys(): Promise<Iterable<number>>;
    get(id: number, offset?: number, end?: number): Promise<Uint8Array | undefined>;
    getSync(id: number, offset?: number, end?: number): Uint8Array | undefined;
    set(id: number, data: Uint8Array, offset?: number): Promise<void>;
    setSync(id: number, data: Uint8Array, offset?: number): void;
    remove(id: number): Promise<void>;
    removeSync(id: number): void;
    commit(): Promise<void>;
    commitSync(): void;
    abort(): Promise<void>;
    abortSync(): void;
    [Symbol.asyncDispose](): Promise<void>;
    [Symbol.dispose](): void;
    /**
     * Stashes given key value pair into `originalData` if it doesn't already exist.
     * Allows us to stash values the program is requesting anyway to
     * prevent needless `get` requests if the program modifies the data later
     * on during the transaction.
     */
    protected stash(id: number, data?: Uint8Array, offset?: number): void;
    /**
     * Marks an id as modified, and stashes its value if it has not been stashed already.
     */
    protected markModified(id: number, offset: number, length?: number): Promise<void>;
    /**
     * Marks an id as modified, and stashes its value if it has not been stashed already.
     */
    protected markModifiedSync(id: number, offset: number, length?: number): void;
}

import type { Store } from './store.js';
import { AsyncTransaction, SyncTransaction } from './store.js';
/**
 * An interface for simple synchronous stores that don't have special support for transactions and such, based on `Map`
 * @category Stores and Transactions
 */
export interface SyncMapStore extends Store {
    keys(): Iterable<number>;
    get(id: number): Uint8Array | undefined;
    getAsync?(id: number): Promise<Uint8Array | undefined>;
    set(id: number, data: Uint8Array): void;
    delete(id: number): void;
}
/**
 * Transaction for map stores.
 * @category Stores and Transactions
 * @see SyncMapStore
 */
export declare class SyncMapTransaction extends SyncTransaction<SyncMapStore> {
    readonly store: SyncMapStore;
    keys(): Promise<Iterable<number>>;
    get(id: number): Promise<Uint8Array | undefined>;
    getSync(id: number): Uint8Array | undefined;
    setSync(id: number, data: Uint8Array): void;
    removeSync(id: number): void;
}
/**
 * An interface for simple asynchronous stores that don't have special support for transactions and such, based on `Map`.
 * @category Stores and Transactions
 */
export interface AsyncMap {
    keys(): Iterable<number>;
    get(id: number, offset?: number, end?: number): Promise<Uint8Array | undefined>;
    cached(id: number, offset?: number, end?: number): Uint8Array | undefined;
    set(id: number, data: Uint8Array, offset?: number): Promise<void>;
    delete(id: number): Promise<void>;
}
/**
 * @category Stores and Transactions
 */
export declare class AsyncMapTransaction<T extends Store & AsyncMap = Store & AsyncMap> extends AsyncTransaction<T> {
    keys(): Promise<Iterable<number>>;
    get(id: number, offset?: number, end?: number): Promise<Uint8Array | undefined>;
    getSync(id: number, offset?: number, end?: number): Uint8Array | undefined;
    set(id: number, data: Uint8Array, offset?: number): Promise<void>;
    remove(id: number): Promise<void>;
}

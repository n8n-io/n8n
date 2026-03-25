import type { BaseTransportOptions, OfflineTransportOptions, Transport } from '@sentry/core';
type Store = <T>(callback: (store: IDBObjectStore) => T | PromiseLike<T>) => Promise<T>;
/** Create or open an IndexedDb store */
export declare function createStore(dbName: string, storeName: string): Store;
/** Insert into the end of the store */
export declare function push(store: Store, value: Uint8Array | string, maxQueueSize: number): Promise<void>;
/** Insert into the front of the store */
export declare function unshift(store: Store, value: Uint8Array | string, maxQueueSize: number): Promise<void>;
/** Pop the oldest value from the store */
export declare function shift(store: Store): Promise<Uint8Array | string | undefined>;
export interface BrowserOfflineTransportOptions extends Omit<OfflineTransportOptions, 'createStore'> {
    /**
     * Name of indexedDb database to store envelopes in
     * Default: 'sentry-offline'
     */
    dbName?: string;
    /**
     * Name of indexedDb object store to store envelopes in
     * Default: 'queue'
     */
    storeName?: string;
    /**
     * Maximum number of envelopes to store
     * Default: 30
     */
    maxQueueSize?: number;
}
/**
 * Creates a transport that uses IndexedDb to store events when offline.
 */
export declare function makeBrowserOfflineTransport<T extends BaseTransportOptions>(createTransport?: (options: T) => Transport): (options: T & BrowserOfflineTransportOptions) => Transport;
export {};
//# sourceMappingURL=offline.d.ts.map
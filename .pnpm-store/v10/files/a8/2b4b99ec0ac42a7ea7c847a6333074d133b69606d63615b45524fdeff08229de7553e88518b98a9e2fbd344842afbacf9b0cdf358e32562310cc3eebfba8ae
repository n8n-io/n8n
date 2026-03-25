import { Logger } from "@azure/msal-common/browser";
import { IAsyncStorage } from "./IAsyncStorage.js";
/**
 * This class allows MSAL to store artifacts asynchronously using the DatabaseStorage IndexedDB wrapper,
 * backed up with the more volatile MemoryStorage object for cases in which IndexedDB may be unavailable.
 */
export declare class AsyncMemoryStorage<T> implements IAsyncStorage<T> {
    private inMemoryCache;
    private indexedDBCache;
    private logger;
    constructor(logger: Logger);
    private handleDatabaseAccessError;
    /**
     * Get the item matching the given key. Tries in-memory cache first, then in the asynchronous
     * storage object if item isn't found in-memory.
     * @param key
     */
    getItem(key: string): Promise<T | null>;
    /**
     * Sets the item in the in-memory cache and then tries to set it in the asynchronous
     * storage object with the given key.
     * @param key
     * @param value
     */
    setItem(key: string, value: T): Promise<void>;
    /**
     * Removes the item matching the key from the in-memory cache, then tries to remove it from the asynchronous storage object.
     * @param key
     */
    removeItem(key: string): Promise<void>;
    /**
     * Get all the keys from the in-memory cache as an iterable array of strings. If no keys are found, query the keys in the
     * asynchronous storage object.
     */
    getKeys(): Promise<string[]>;
    /**
     * Returns true or false if the given key is present in the cache.
     * @param key
     */
    containsKey(key: string): Promise<boolean>;
    /**
     * Clears in-memory Map
     */
    clearInMemory(): void;
    /**
     * Tries to delete the IndexedDB database
     * @returns
     */
    clearPersistent(): Promise<boolean>;
}
//# sourceMappingURL=AsyncMemoryStorage.d.ts.map
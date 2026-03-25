import { IAsyncStorage } from "./IAsyncStorage.js";
/**
 * Storage wrapper for IndexedDB storage in browsers: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
 */
export declare class DatabaseStorage<T> implements IAsyncStorage<T> {
    private db;
    private dbName;
    private tableName;
    private version;
    private dbOpen;
    constructor();
    /**
     * Opens IndexedDB instance.
     */
    open(): Promise<void>;
    /**
     * Closes the connection to IndexedDB database when all pending transactions
     * complete.
     */
    closeConnection(): void;
    /**
     * Opens database if it's not already open
     */
    private validateDbIsOpen;
    /**
     * Retrieves item from IndexedDB instance.
     * @param key
     */
    getItem(key: string): Promise<T | null>;
    /**
     * Adds item to IndexedDB under given key
     * @param key
     * @param payload
     */
    setItem(key: string, payload: T): Promise<void>;
    /**
     * Removes item from IndexedDB under given key
     * @param key
     */
    removeItem(key: string): Promise<void>;
    /**
     * Get all the keys from the storage object as an iterable array of strings.
     */
    getKeys(): Promise<string[]>;
    /**
     *
     * Checks whether there is an object under the search key in the object store
     */
    containsKey(key: string): Promise<boolean>;
    /**
     * Deletes the MSAL database. The database is deleted rather than cleared to make it possible
     * for client applications to downgrade to a previous MSAL version without worrying about forward compatibility issues
     * with IndexedDB database versions.
     */
    deleteDatabase(): Promise<boolean>;
}
//# sourceMappingURL=DatabaseStorage.d.ts.map
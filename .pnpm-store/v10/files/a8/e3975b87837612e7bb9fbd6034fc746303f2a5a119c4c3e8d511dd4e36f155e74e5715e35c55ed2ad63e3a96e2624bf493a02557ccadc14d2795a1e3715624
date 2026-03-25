import { EncryptedData } from "./EncryptedData.js";
export interface IWindowStorage<T> {
    /**
     * Async initializer
     */
    initialize(correlationId: string): Promise<void>;
    /**
     * Get the item from the window storage object matching the given key.
     * @param key
     */
    getItem(key: string): T | null;
    /**
     * Getter for sensitive data that may contain PII.
     */
    getUserData(key: string): T | null;
    /**
     * Sets the item in the window storage object with the given key.
     * @param key
     * @param value
     */
    setItem(key: string, value: T): void;
    /**
     * Setter for sensitive data that may contain PII.
     */
    setUserData(key: string, value: T, correlationId: string, timestamp: string, kmsi: boolean): Promise<void>;
    /**
     * Removes the item in the window storage object matching the given key.
     * @param key
     */
    removeItem(key: string): void;
    /**
     * Get all the keys from the window storage object as an iterable array of strings.
     */
    getKeys(): string[];
    /**
     * Returns true or false if the given key is present in the cache.
     * @param key
     */
    containsKey(key: string): boolean;
    decryptData(key: string, data: EncryptedData, correlationId: string): Promise<object | null>;
}
//# sourceMappingURL=IWindowStorage.d.ts.map
import { IPerformanceClient, Logger } from "@azure/msal-common/browser";
import { IWindowStorage } from "./IWindowStorage.js";
import { EncryptedData } from "./EncryptedData.js";
export declare class LocalStorage implements IWindowStorage<string> {
    private clientId;
    private initialized;
    private memoryStorage;
    private performanceClient;
    private logger;
    private encryptionCookie?;
    private broadcast;
    constructor(clientId: string, logger: Logger, performanceClient: IPerformanceClient);
    initialize(correlationId: string): Promise<void>;
    getItem(key: string): string | null;
    getUserData(key: string): string | null;
    decryptData(key: string, data: EncryptedData, correlationId: string): Promise<object | null>;
    setItem(key: string, value: string): void;
    setUserData(key: string, value: string, correlationId: string, timestamp: string, kmsi: boolean): Promise<void>;
    removeItem(key: string): void;
    getKeys(): string[];
    containsKey(key: string): boolean;
    /**
     * Removes all known MSAL keys from the cache
     */
    clear(): void;
    /**
     * Helper to decrypt all known MSAL keys in localStorage and save them to inMemory storage
     * @returns
     */
    private importExistingCache;
    /**
     * Helper to decrypt and save cache entries
     * @param key
     * @returns
     */
    private getItemFromEncryptedCache;
    /**
     * Helper to decrypt and save an array of cache keys
     * @param arr
     * @returns Array of keys successfully imported
     */
    private importArray;
    /**
     * Gets encryption context for a given cache entry. This is clientId for app specific entries, empty string for shared entries
     * @param key
     * @returns
     */
    private getContext;
    private updateCache;
}
//# sourceMappingURL=LocalStorage.d.ts.map
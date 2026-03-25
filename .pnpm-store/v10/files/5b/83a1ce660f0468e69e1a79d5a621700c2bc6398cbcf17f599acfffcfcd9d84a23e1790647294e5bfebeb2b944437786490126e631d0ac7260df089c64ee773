import { LogLine } from "../../types/log";
export interface CacheEntry {
    timestamp: number;
    data: unknown;
    requestId: string;
}
export interface CacheStore {
    [key: string]: CacheEntry;
}
export declare class BaseCache<T extends CacheEntry> {
    private readonly CACHE_MAX_AGE_MS;
    private readonly CLEANUP_PROBABILITY;
    protected cacheDir: string;
    protected cacheFile: string;
    protected lockFile: string;
    protected logger: (message: LogLine) => void;
    private readonly LOCK_TIMEOUT_MS;
    protected lockAcquired: boolean;
    protected lockAcquireFailures: number;
    protected requestIdToUsedHashes: {
        [key: string]: string[];
    };
    constructor(logger: (message: LogLine) => void, cacheDir?: string, cacheFile?: string);
    private setupProcessHandlers;
    protected ensureCacheDirectory(): void;
    protected createHash(data: unknown): string;
    protected sleep(ms: number): Promise<void>;
    acquireLock(): Promise<boolean>;
    releaseLock(): void;
    /**
     * Cleans up stale cache entries that exceed the maximum age.
     */
    cleanupStaleEntries(): Promise<void>;
    protected readCache(): CacheStore;
    protected writeCache(cache: CacheStore): void;
    /**
     * Retrieves data from the cache based on the provided options.
     * @param hashObj - The options used to generate the cache key.
     * @param requestId - The identifier for the current request.
     * @returns The cached data if available, otherwise null.
     */
    get(hashObj: Record<string, unknown> | string, requestId: string): Promise<T["data"] | null>;
    /**
     * Stores data in the cache based on the provided options and requestId.
     * @param hashObj - The options used to generate the cache key.
     * @param data - The data to be cached.
     * @param requestId - The identifier for the cache entry.
     */
    set(hashObj: Record<string, unknown>, data: T["data"], requestId: string): Promise<void>;
    delete(hashObj: Record<string, unknown>): Promise<void>;
    /**
     * Tracks the usage of a hash with a specific requestId.
     * @param requestId - The identifier for the current request.
     * @param hash - The cache key hash.
     */
    protected trackRequestIdUsage(requestId: string, hash: string): void;
    /**
     * Deletes all cache entries associated with a specific requestId.
     * @param requestId - The identifier for the request whose cache entries should be deleted.
     */
    deleteCacheForRequestId(requestId: string): Promise<void>;
    /**
     * Resets the entire cache by clearing the cache file.
     */
    resetCache(): void;
}

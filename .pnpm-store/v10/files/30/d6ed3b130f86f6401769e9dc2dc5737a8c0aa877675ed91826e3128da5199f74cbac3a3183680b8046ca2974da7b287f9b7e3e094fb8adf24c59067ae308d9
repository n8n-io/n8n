import { BaseCache, CacheEntry } from "./BaseCache";
export declare class LLMCache extends BaseCache<CacheEntry> {
    constructor(logger: (message: {
        category?: string;
        message: string;
        level?: number;
    }) => void, cacheDir?: string, cacheFile?: string);
    /**
     * Overrides the get method to track used hashes by requestId.
     * @param options - The options used to generate the cache key.
     * @param requestId - The identifier for the current request.
     * @returns The cached data if available, otherwise null.
     */
    get<T>(options: Record<string, unknown>, requestId: string): Promise<T | null>;
    /**
     * Overrides the set method to include cache cleanup logic.
     * @param options - The options used to generate the cache key.
     * @param data - The data to be cached.
     * @param requestId - The identifier for the current request.
     */
    set(options: Record<string, unknown>, data: unknown, requestId: string): Promise<void>;
}

/**
 * Prompt caching module for LangSmith SDK.
 *
 * Provides an LRU cache with background refresh for prompt caching.
 * Uses stale-while-revalidate pattern for optimal performance.
 *
 * Works in all environments. File operations (dump/load) use helpers
 * that are swapped for browser builds via package.json browser field.
 */
import type { PromptCommit } from "../schemas.js";
/**
 * A single cache entry with metadata for TTL tracking.
 */
export interface CacheEntry<T = unknown> {
    value: T;
    createdAt: number;
}
/**
 * Cache performance metrics.
 */
export interface CacheMetrics {
    hits: number;
    misses: number;
    refreshes: number;
    refreshErrors: number;
}
/**
 * Configuration options for Cache.
 */
export interface CacheConfig {
    /** Maximum entries in cache (LRU eviction when exceeded). Default: 100 */
    maxSize?: number;
    /** Time in seconds before entry is stale. null = infinite TTL. Default: 3600 */
    ttlSeconds?: number | null;
    /** How often to check for stale entries in seconds. Default: 60 */
    refreshIntervalSeconds?: number;
    /** Callback to fetch fresh data for a cache key */
    fetchFunc?: (key: string) => Promise<PromptCommit>;
}
/**
 * LRU cache with background refresh for prompts.
 *
 * Features:
 * - In-memory LRU cache with configurable max size
 * - Background refresh using setInterval
 * - Stale-while-revalidate: returns stale data while refresh happens
 * - JSON dump/load for offline use
 *
 * @example
 * ```typescript
 * const cache = new Cache({
 *   maxSize: 100,
 *   ttlSeconds: 3600,
 *   fetchFunc: async (key) => client.pullPromptCommit(key),
 * });
 *
 * // Use the cache
 * cache.set("my-prompt:latest", promptCommit);
 * const cached = cache.get("my-prompt:latest");
 *
 * // Cleanup
 * cache.stop();
 * ```
 */
export declare class Cache {
    private cache;
    private maxSize;
    private ttlSeconds;
    private refreshIntervalSeconds;
    private fetchFunc?;
    private refreshTimer?;
    private _metrics;
    constructor(config?: CacheConfig);
    /**
     * Get cache performance metrics.
     */
    get metrics(): Readonly<CacheMetrics>;
    /**
     * Get total cache requests (hits + misses).
     */
    get totalRequests(): number;
    /**
     * Get cache hit rate (0.0 to 1.0).
     */
    get hitRate(): number;
    /**
     * Reset all metrics to zero.
     */
    resetMetrics(): void;
    /**
     * Get a value from cache.
     *
     * Returns the cached value or undefined if not found.
     * Stale entries are still returned (background refresh handles updates).
     */
    get(key: string): PromptCommit | undefined;
    /**
     * Set a value in the cache.
     */
    set(key: string, value: PromptCommit): void;
    /**
     * Remove a specific entry from cache.
     */
    invalidate(key: string): void;
    /**
     * Clear all cache entries.
     */
    clear(): void;
    /**
     * Get the number of entries in the cache.
     */
    get size(): number;
    /**
     * Stop background refresh.
     * Should be called when the client is being cleaned up.
     */
    stop(): void;
    /**
     * Dump cache contents to a JSON file for offline use.
     */
    dump(filePath: string): void;
    /**
     * Load cache contents from a JSON file.
     *
     * Loaded entries get a fresh TTL starting from load time.
     *
     * @returns Number of entries loaded.
     */
    load(filePath: string): number;
    /**
     * Start the background refresh loop.
     */
    private startRefreshLoop;
    /**
     * Get list of stale cache keys.
     */
    private getStaleKeys;
    /**
     * Check for stale entries and refresh them.
     */
    private refreshStaleEntries;
}

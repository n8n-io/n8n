/**
 * Prompt caching module for LangSmith SDK.
 *
 * Provides an LRU cache with background refresh for prompt caching.
 * Uses stale-while-revalidate pattern for optimal performance.
 *
 * Works in all environments. File operations (dump/load) use helpers
 * that are swapped for browser builds via package.json browser field.
 */
import { dumpCache, loadCache } from "./prompts_cache_fs.js";
/**
 * Check if a cache entry is stale based on TTL.
 */
function isStale(entry, ttlSeconds) {
    if (ttlSeconds === null) {
        return false; // Infinite TTL, never stale
    }
    const ageMs = Date.now() - entry.createdAt;
    return ageMs > ttlSeconds * 1000;
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
export class Cache {
    constructor(config = {}) {
        Object.defineProperty(this, "cache", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Map()
        });
        Object.defineProperty(this, "maxSize", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "ttlSeconds", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "refreshIntervalSeconds", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "fetchFunc", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "refreshTimer", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_metrics", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: {
                hits: 0,
                misses: 0,
                refreshes: 0,
                refreshErrors: 0,
            }
        });
        this.maxSize = config.maxSize ?? 100;
        this.ttlSeconds = config.ttlSeconds ?? 3600;
        this.refreshIntervalSeconds = config.refreshIntervalSeconds ?? 60;
        this.fetchFunc = config.fetchFunc;
        // Start background refresh if fetch function provided and TTL is set
        if (this.fetchFunc && this.ttlSeconds !== null) {
            this.startRefreshLoop();
        }
    }
    /**
     * Get cache performance metrics.
     */
    get metrics() {
        return { ...this._metrics };
    }
    /**
     * Get total cache requests (hits + misses).
     */
    get totalRequests() {
        return this._metrics.hits + this._metrics.misses;
    }
    /**
     * Get cache hit rate (0.0 to 1.0).
     */
    get hitRate() {
        const total = this.totalRequests;
        return total > 0 ? this._metrics.hits / total : 0;
    }
    /**
     * Reset all metrics to zero.
     */
    resetMetrics() {
        this._metrics = {
            hits: 0,
            misses: 0,
            refreshes: 0,
            refreshErrors: 0,
        };
    }
    /**
     * Get a value from cache.
     *
     * Returns the cached value or undefined if not found.
     * Stale entries are still returned (background refresh handles updates).
     */
    get(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            this._metrics.misses += 1;
            return undefined;
        }
        // Move to end for LRU (delete and re-add)
        this.cache.delete(key);
        this.cache.set(key, entry);
        this._metrics.hits += 1;
        return entry.value;
    }
    /**
     * Set a value in the cache.
     */
    set(key, value) {
        // Check if we need to evict (and key is new)
        if (!this.cache.has(key) && this.cache.size >= this.maxSize) {
            // Evict oldest (first item in Map)
            const oldestKey = this.cache.keys().next().value;
            if (oldestKey !== undefined) {
                this.cache.delete(oldestKey);
            }
        }
        const entry = {
            value,
            createdAt: Date.now(),
        };
        // Delete first to ensure it's at the end
        this.cache.delete(key);
        this.cache.set(key, entry);
    }
    /**
     * Remove a specific entry from cache.
     */
    invalidate(key) {
        this.cache.delete(key);
    }
    /**
     * Clear all cache entries.
     */
    clear() {
        this.cache.clear();
    }
    /**
     * Get the number of entries in the cache.
     */
    get size() {
        return this.cache.size;
    }
    /**
     * Stop background refresh.
     * Should be called when the client is being cleaned up.
     */
    stop() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = undefined;
        }
    }
    /**
     * Dump cache contents to a JSON file for offline use.
     */
    dump(filePath) {
        const entries = {};
        for (const [key, entry] of this.cache.entries()) {
            entries[key] = entry.value;
        }
        dumpCache(filePath, entries);
    }
    /**
     * Load cache contents from a JSON file.
     *
     * Loaded entries get a fresh TTL starting from load time.
     *
     * @returns Number of entries loaded.
     */
    load(filePath) {
        const entries = loadCache(filePath);
        if (!entries) {
            return 0;
        }
        let loaded = 0;
        const now = Date.now();
        for (const [key, value] of Object.entries(entries)) {
            if (this.cache.size >= this.maxSize) {
                break;
            }
            const entry = {
                value: value,
                createdAt: now, // Fresh TTL from load time
            };
            this.cache.set(key, entry);
            loaded += 1;
        }
        return loaded;
    }
    /**
     * Start the background refresh loop.
     */
    startRefreshLoop() {
        this.refreshTimer = setInterval(() => {
            this.refreshStaleEntries().catch((e) => {
                // Log but don't die - keep the refresh loop running
                console.warn("Unexpected error in cache refresh loop:", e);
            });
        }, this.refreshIntervalSeconds * 1000);
        // Don't block Node.js from exiting
        if (this.refreshTimer.unref) {
            this.refreshTimer.unref();
        }
    }
    /**
     * Get list of stale cache keys.
     */
    getStaleKeys() {
        const staleKeys = [];
        for (const [key, entry] of this.cache.entries()) {
            if (isStale(entry, this.ttlSeconds)) {
                staleKeys.push(key);
            }
        }
        return staleKeys;
    }
    /**
     * Check for stale entries and refresh them.
     */
    async refreshStaleEntries() {
        if (!this.fetchFunc) {
            return;
        }
        const staleKeys = this.getStaleKeys();
        if (staleKeys.length === 0) {
            return;
        }
        for (const key of staleKeys) {
            try {
                const newValue = await this.fetchFunc(key);
                this.set(key, newValue);
                this._metrics.refreshes += 1;
            }
            catch (e) {
                // Keep stale data on refresh failure
                this._metrics.refreshErrors += 1;
                console.warn(`Failed to refresh cache entry ${key}:`, e);
            }
        }
    }
}

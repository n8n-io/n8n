"use strict";
/**
 * Prompt caching module for LangSmith SDK.
 *
 * Provides an LRU cache with background refresh for prompt caching.
 * Uses stale-while-revalidate pattern for optimal performance.
 *
 * Works in all environments. File operations (dump/load) use the shared
 * fs abstraction which is swapped for browser builds via package.json
 * browser field (no-ops in browser — cache just doesn't persist).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cache = exports.promptCacheSingleton = exports.PromptCache = void 0;
exports.configureGlobalPromptCache = configureGlobalPromptCache;
const fs_js_1 = require("../fs.cjs");
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
 * - Uses the most recently used client for a key for refreshes
 * - JSON dump/load for offline use
 *
 * @example
 * ```typescript
 * const cache = new Cache({
 *   maxSize: 100,
 *   ttlSeconds: 3600,
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
class PromptCache {
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
        this.configure(config);
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
    get(key, refreshFunc) {
        // If max_size is 0, cache is disabled
        if (this.maxSize === 0) {
            return undefined;
        }
        const entry = this.cache.get(key);
        if (!entry) {
            this._metrics.misses += 1;
            return undefined;
        }
        // Move to end for LRU (delete and re-add)
        this.cache.delete(key);
        this.cache.set(key, { ...entry, refreshFunc });
        this._metrics.hits += 1;
        return entry.value;
    }
    /**
     * Set a value in the cache.
     */
    set(key, value, refreshFunc) {
        // If max_size is 0, cache is disabled - do nothing
        if (this.maxSize === 0) {
            return;
        }
        if (this.refreshTimer === undefined) {
            this.startRefreshLoop();
        }
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
            refreshFunc,
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
        const dir = fs_js_1.path.dirname(filePath);
        if (!(0, fs_js_1.existsSync)(dir)) {
            (0, fs_js_1.mkdirSync)(dir);
        }
        const tempPath = `${filePath}.tmp`;
        try {
            (0, fs_js_1.writeFileSync)(tempPath, JSON.stringify({ entries }, null, 2));
            (0, fs_js_1.renameSync)(tempPath, filePath);
        }
        catch (e) {
            if ((0, fs_js_1.existsSync)(tempPath)) {
                (0, fs_js_1.unlinkSync)(tempPath);
            }
            throw e;
        }
    }
    /**
     * Load cache contents from a JSON file.
     *
     * Loaded entries get a fresh TTL starting from load time.
     *
     * @returns Number of entries loaded.
     */
    load(filePath) {
        if (!(0, fs_js_1.existsSync)(filePath)) {
            return 0;
        }
        let entries;
        try {
            const content = (0, fs_js_1.readFileSync)(filePath);
            const data = JSON.parse(content);
            entries = data.entries ?? null;
        }
        catch {
            return 0;
        }
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
        this.stop();
        if (this.ttlSeconds !== null) {
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
    }
    /**
     * Get list of stale cache keys.
     */
    getStaleEntries() {
        const staleEntries = [];
        for (const [key, value] of this.cache.entries()) {
            if (isStale(value, this.ttlSeconds)) {
                staleEntries.push([key, value]);
            }
        }
        return staleEntries;
    }
    /**
     * Check for stale entries and refresh them.
     */
    async refreshStaleEntries() {
        const staleEntries = this.getStaleEntries();
        if (staleEntries.length === 0) {
            return;
        }
        for (const [key, value] of staleEntries) {
            if (value.refreshFunc !== undefined) {
                try {
                    const newValue = await value.refreshFunc();
                    this.set(key, newValue, value.refreshFunc);
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
    configure(config) {
        this.stop();
        this.refreshIntervalSeconds = config.refreshIntervalSeconds ?? 60;
        this.maxSize = config.maxSize ?? 100;
        this.ttlSeconds = config.ttlSeconds ?? 5 * 60;
    }
}
exports.PromptCache = PromptCache;
/**
 * Global singleton instance of PromptCache.
 * Use configureGlobalPromptCache(), enableGlobalPromptCache(), or disableGlobalPromptCache() instead.
 */
exports.promptCacheSingleton = new PromptCache();
/**
 * Configure the global prompt cache.
 *
 * This should be called before any cache instances are created.
 *
 * @param config - Cache configuration options
 *
 * @example
 * ```typescript
 * import { configureGlobalPromptCache } from 'langsmith';
 *
 * configureGlobalPromptCache({ maxSize: 200, ttlSeconds: 7200 });
 * ```
 */
function configureGlobalPromptCache(config) {
    exports.promptCacheSingleton.configure(config);
}
/**
 * @deprecated Use `PromptCache` instead. This is a deprecated alias.
 *
 * Deprecated alias for PromptCache. Use PromptCache instead.
 */
class Cache extends PromptCache {
    constructor(config = {}) {
        console.warn("The 'Cache' class is deprecated and will be removed in a future version. " +
            "Use 'PromptCache' instead.");
        super(config);
    }
}
exports.Cache = Cache;

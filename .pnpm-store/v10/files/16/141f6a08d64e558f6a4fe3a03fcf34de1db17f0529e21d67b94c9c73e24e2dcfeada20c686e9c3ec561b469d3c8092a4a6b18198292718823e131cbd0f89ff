"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryCache = void 0;
/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const CACHE_PURGE_INTERVAL = 60000; // 60 seconds
/**
 * Simple in-memory cache with TTL support.
 * This is used to store authentication tokens for Agentic Identity scenarios only!
 */
class MemoryCache {
    constructor() {
        this.cache = new Map();
    }
    /**
     * Clears the purge interval to allow the process to exit cleanly
     */
    destroy() {
        if (this.purgeInterval) {
            clearInterval(this.purgeInterval);
            this.purgeInterval = undefined;
        }
    }
    set(key, value, ttlSeconds) {
        const validUntil = Date.now() + (ttlSeconds * 1000);
        this.cache.set(key, { value, validUntil });
        if (!this.purgeInterval) {
            this.purgeInterval = setInterval(() => this.purge(), CACHE_PURGE_INTERVAL);
        }
    }
    get(key) {
        const item = this.cache.get(key);
        if (!item) {
            return undefined;
        }
        // Check if item has expired
        if (Date.now() > item.validUntil) {
            this.cache.delete(key);
            return undefined;
        }
        return item.value;
    }
    delete(key) {
        return this.cache.delete(key);
    }
    purge() {
        const now = Date.now();
        for (const [key, { validUntil }] of this.cache.entries()) {
            if (now > validUntil) {
                this.cache.delete(key);
            }
        }
    }
}
exports.MemoryCache = MemoryCache;
//# sourceMappingURL=MemoryCache.js.map
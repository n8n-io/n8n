/**
 * Simple in-memory cache with TTL support.
 * This is used to store authentication tokens for Agentic Identity scenarios only!
 */
export declare class MemoryCache<T> {
    private cache;
    private purgeInterval?;
    /**
     * Clears the purge interval to allow the process to exit cleanly
     */
    destroy(): void;
    set(key: string, value: T, ttlSeconds: number): void;
    get(key: string): T | undefined;
    delete(key: string): boolean;
    purge(): void;
}

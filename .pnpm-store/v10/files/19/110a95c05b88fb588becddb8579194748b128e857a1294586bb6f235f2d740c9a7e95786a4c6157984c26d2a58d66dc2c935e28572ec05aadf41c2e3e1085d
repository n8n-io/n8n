import { QueryResultCacheOptions } from "./QueryResultCacheOptions";
import { QueryRunner } from "../query-runner/QueryRunner";
/**
 * Implementations of this interface provide different strategies to cache query builder results.
 */
export interface QueryResultCache {
    /**
     * Creates a connection with given cache provider.
     */
    connect(): Promise<void>;
    /**
     * Closes a connection with given cache provider.
     */
    disconnect(): Promise<void>;
    /**
     * Performs operations needs to be created during schema synchronization.
     */
    synchronize(queryRunner?: QueryRunner): Promise<void>;
    /**
     * Caches given query result.
     */
    getFromCache(options: QueryResultCacheOptions, queryRunner?: QueryRunner): Promise<QueryResultCacheOptions | undefined>;
    /**
     * Stores given query result in the cache.
     */
    storeInCache(options: QueryResultCacheOptions, savedCache: QueryResultCacheOptions | undefined, queryRunner?: QueryRunner): Promise<void>;
    /**
     * Checks if cache is expired or not.
     */
    isExpired(savedCache: QueryResultCacheOptions): boolean;
    /**
     * Clears everything stored in the cache.
     */
    clear(queryRunner?: QueryRunner): Promise<void>;
    /**
     * Removes all cached results by given identifiers from cache.
     */
    remove(identifiers: string[], queryRunner?: QueryRunner): Promise<void>;
}

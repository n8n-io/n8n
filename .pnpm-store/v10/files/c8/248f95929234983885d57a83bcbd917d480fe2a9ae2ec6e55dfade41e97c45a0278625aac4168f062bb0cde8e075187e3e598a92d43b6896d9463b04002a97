import { DataSource } from "../data-source/DataSource";
import { QueryRunner } from "../query-runner/QueryRunner";
import { QueryResultCache } from "./QueryResultCache";
import { QueryResultCacheOptions } from "./QueryResultCacheOptions";
/**
 * Caches query result into current database, into separate table called "query-result-cache".
 */
export declare class DbQueryResultCache implements QueryResultCache {
    protected connection: DataSource;
    private queryResultCacheTable;
    private queryResultCacheDatabase?;
    private queryResultCacheSchema?;
    constructor(connection: DataSource);
    /**
     * Creates a connection with given cache provider.
     */
    connect(): Promise<void>;
    /**
     * Disconnects with given cache provider.
     */
    disconnect(): Promise<void>;
    /**
     * Creates table for storing cache if it does not exist yet.
     */
    synchronize(queryRunner?: QueryRunner): Promise<void>;
    /**
     * Get data from cache.
     * Returns cache result if found.
     * Returns undefined if result is not cached.
     */
    getFromCache(options: QueryResultCacheOptions, queryRunner?: QueryRunner): Promise<QueryResultCacheOptions | undefined>;
    /**
     * Checks if cache is expired or not.
     */
    isExpired(savedCache: QueryResultCacheOptions): boolean;
    /**
     * Stores given query result in the cache.
     */
    storeInCache(options: QueryResultCacheOptions, savedCache: QueryResultCacheOptions | undefined, queryRunner?: QueryRunner): Promise<void>;
    /**
     * Clears everything stored in the cache.
     */
    clear(queryRunner: QueryRunner): Promise<void>;
    /**
     * Removes all cached results by given identifiers from cache.
     */
    remove(identifiers: string[], queryRunner?: QueryRunner): Promise<void>;
    /**
     * Gets a query runner to work with.
     */
    protected getQueryRunner(queryRunner?: QueryRunner): QueryRunner;
}

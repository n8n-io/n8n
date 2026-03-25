"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DbQueryResultCache = void 0;
const Table_1 = require("../schema-builder/table/Table");
/**
 * Caches query result into current database, into separate table called "query-result-cache".
 */
class DbQueryResultCache {
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    constructor(connection) {
        this.connection = connection;
        const { schema } = this.connection.driver.options;
        const database = this.connection.driver.database;
        const cacheOptions = typeof this.connection.options.cache === "object"
            ? this.connection.options.cache
            : {};
        const cacheTableName = cacheOptions.tableName || "query-result-cache";
        this.queryResultCacheDatabase = database;
        this.queryResultCacheSchema = schema;
        this.queryResultCacheTable = this.connection.driver.buildTableName(cacheTableName, schema, database);
    }
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    /**
     * Creates a connection with given cache provider.
     */
    async connect() { }
    /**
     * Disconnects with given cache provider.
     */
    async disconnect() { }
    /**
     * Creates table for storing cache if it does not exist yet.
     */
    async synchronize(queryRunner) {
        queryRunner = this.getQueryRunner(queryRunner);
        const driver = this.connection.driver;
        const tableExist = await queryRunner.hasTable(this.queryResultCacheTable); // todo: table name should be configurable
        if (tableExist)
            return;
        await queryRunner.createTable(new Table_1.Table({
            database: this.queryResultCacheDatabase,
            schema: this.queryResultCacheSchema,
            name: this.queryResultCacheTable,
            columns: [
                {
                    name: "id",
                    isPrimary: true,
                    isNullable: false,
                    type: driver.normalizeType({
                        type: driver.mappedDataTypes.cacheId,
                    }),
                    generationStrategy: "increment",
                    isGenerated: true,
                },
                {
                    name: "identifier",
                    type: driver.normalizeType({
                        type: driver.mappedDataTypes.cacheIdentifier,
                    }),
                    isNullable: true,
                },
                {
                    name: "time",
                    type: driver.normalizeType({
                        type: driver.mappedDataTypes.cacheTime,
                    }),
                    isPrimary: false,
                    isNullable: false,
                },
                {
                    name: "duration",
                    type: driver.normalizeType({
                        type: driver.mappedDataTypes.cacheDuration,
                    }),
                    isPrimary: false,
                    isNullable: false,
                },
                {
                    name: "query",
                    type: driver.normalizeType({
                        type: driver.mappedDataTypes.cacheQuery,
                    }),
                    isPrimary: false,
                    isNullable: false,
                },
                {
                    name: "result",
                    type: driver.normalizeType({
                        type: driver.mappedDataTypes.cacheResult,
                    }),
                    isNullable: false,
                },
            ],
        }));
    }
    /**
     * Get data from cache.
     * Returns cache result if found.
     * Returns undefined if result is not cached.
     */
    getFromCache(options, queryRunner) {
        queryRunner = this.getQueryRunner(queryRunner);
        const qb = this.connection
            .createQueryBuilder(queryRunner)
            .select()
            .from(this.queryResultCacheTable, "cache");
        if (options.identifier) {
            return qb
                .where(`${qb.escape("cache")}.${qb.escape("identifier")} = :identifier`)
                .setParameters({
                identifier: options.identifier,
            })
                .cache(false) // disable cache to avoid infinite loops when cache is alwaysEnable
                .getRawOne();
        }
        else if (options.query) {
            return qb
                .where(`${qb.escape("cache")}.${qb.escape("query")} = :query`)
                .setParameters({
                query: options.query,
            })
                .cache(false) // disable cache to avoid infinite loops when cache is alwaysEnable
                .getRawOne();
        }
        return Promise.resolve(undefined);
    }
    /**
     * Checks if cache is expired or not.
     */
    isExpired(savedCache) {
        const duration = typeof savedCache.duration === "string"
            ? parseInt(savedCache.duration)
            : savedCache.duration;
        return ((typeof savedCache.time === "string"
            ? parseInt(savedCache.time)
            : savedCache.time) +
            duration <
            new Date().getTime());
    }
    /**
     * Stores given query result in the cache.
     */
    async storeInCache(options, savedCache, queryRunner) {
        const shouldCreateQueryRunner = queryRunner === undefined ||
            queryRunner?.getReplicationMode() === "slave";
        if (queryRunner === undefined || shouldCreateQueryRunner) {
            queryRunner = this.connection.createQueryRunner("master");
        }
        let insertedValues = options;
        if (savedCache && savedCache.identifier) {
            // if exist then update
            const qb = queryRunner.manager
                .createQueryBuilder()
                .update(this.queryResultCacheTable)
                .set(insertedValues);
            qb.where(`${qb.escape("identifier")} = :condition`, {
                condition: insertedValues.identifier,
            });
            await qb.execute();
        }
        else if (savedCache && savedCache.query) {
            // if exist then update
            const qb = queryRunner.manager
                .createQueryBuilder()
                .update(this.queryResultCacheTable)
                .set(insertedValues);
            qb.where(`${qb.escape("query")} = :condition`, {
                condition: insertedValues.query,
            });
            await qb.execute();
        }
        else {
            // otherwise insert
            await queryRunner.manager
                .createQueryBuilder()
                .insert()
                .into(this.queryResultCacheTable)
                .values(insertedValues)
                .execute();
        }
        if (shouldCreateQueryRunner) {
            await queryRunner.release();
        }
    }
    /**
     * Clears everything stored in the cache.
     */
    async clear(queryRunner) {
        return this.getQueryRunner(queryRunner).clearTable(this.queryResultCacheTable);
    }
    /**
     * Removes all cached results by given identifiers from cache.
     */
    async remove(identifiers, queryRunner) {
        let _queryRunner = queryRunner || this.getQueryRunner();
        await Promise.all(identifiers.map((identifier) => {
            const qb = _queryRunner.manager.createQueryBuilder();
            return qb
                .delete()
                .from(this.queryResultCacheTable)
                .where(`${qb.escape("identifier")} = :identifier`, {
                identifier,
            })
                .execute();
        }));
        if (!queryRunner) {
            await _queryRunner.release();
        }
    }
    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------
    /**
     * Gets a query runner to work with.
     */
    getQueryRunner(queryRunner) {
        if (queryRunner)
            return queryRunner;
        return this.connection.createQueryRunner();
    }
}
exports.DbQueryResultCache = DbQueryResultCache;

//# sourceMappingURL=DbQueryResultCache.js.map

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryResultCacheFactory = void 0;
const DbQueryResultCache_1 = require("./DbQueryResultCache");
const TypeORMError_1 = require("../error/TypeORMError");
/**
 * Caches query result into the database.
 */
class QueryResultCacheFactory {
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    constructor(connection) {
        this.connection = connection;
    }
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    /**
     * Creates a new query result cache based on connection options.
     */
    create() {
        if (!this.connection.options.cache)
            throw new TypeORMError_1.TypeORMError(`To use cache you need to enable it in connection options by setting cache: true or providing some caching options. Example: { host: ..., username: ..., cache: true }`);
        const cache = this.connection.options.cache;
        if (cache.provider && typeof cache.provider === "function") {
            return cache.provider(this.connection);
        }
        return new DbQueryResultCache_1.DbQueryResultCache(this.connection);
    }
}
exports.QueryResultCacheFactory = QueryResultCacheFactory;

//# sourceMappingURL=QueryResultCacheFactory.js.map

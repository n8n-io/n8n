/**
 * Describes all index options.
 */
export interface IndexOptions {
    /**
     * Indicates if this composite index must be unique or not.
     */
    unique?: boolean;
    /**
     * The SPATIAL modifier indexes the entire column and does not allow indexed columns to contain NULL values.
     * Works only in MySQL and PostgreSQL.
     */
    spatial?: boolean;
    /**
     * The FULLTEXT modifier indexes the entire column and does not allow prefixing.
     * Works only in MySQL.
     */
    fulltext?: boolean;
    /**
     * NULL_FILTERED indexes are particularly useful for indexing sparse columns, where most rows contain a NULL value.
     * In these cases, the NULL_FILTERED index can be considerably smaller and more efficient to maintain than
     * a normal index that includes NULL values.
     *
     * Works only in Spanner.
     */
    nullFiltered?: boolean;
    /**
     * Fulltext parser.
     * Works only in MySQL.
     */
    parser?: string;
    /**
     * Index filter condition.
     */
    where?: string;
    /**
     * If true, the index only references documents with the specified field.
     * These indexes use less space but behave differently in some situations (particularly sorts).
     * This option is only supported for mongodb database.
     */
    sparse?: boolean;
    /**
     * Builds the index in the background so that building an index an does not block other database activities.
     * This option is only supported for mongodb database.
     */
    background?: boolean;
    /**
     * Create the index using the CONCURRENTLY modifier
     * Works only in postgres.
     */
    concurrent?: boolean;
    /**
     * Specifies a time to live, in seconds.
     * This option is only supported for mongodb database.
     */
    expireAfterSeconds?: number;
}

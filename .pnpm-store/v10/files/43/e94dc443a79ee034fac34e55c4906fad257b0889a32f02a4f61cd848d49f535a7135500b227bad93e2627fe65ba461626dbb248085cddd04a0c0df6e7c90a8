/**
 * Arguments for IndexMetadata class.
 */
export interface IndexMetadataArgs {
    /**
     * Class to which index is applied.
     */
    target: Function | string;
    /**
     * Index name.
     */
    name?: string;
    /**
     * Columns combination to be used as index.
     */
    columns?: ((object?: any) => any[] | {
        [key: string]: number;
    }) | string[];
    /**
     * Indicates if index must be unique or not.
     */
    unique?: boolean;
    /**
     * The SPATIAL modifier indexes the entire column and does not allow indexed columns to contain NULL values.
     * Works only in MySQL.
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
     * Indicates if index must sync with database index.
     */
    synchronize?: boolean;
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
     * Builds the index using the concurrently option.
     * This option is only supported for postgres database.
     */
    concurrent?: boolean;
    /**
     * Specifies a time to live, in seconds.
     * This option is only supported for mongodb database.
     */
    expireAfterSeconds?: number;
}

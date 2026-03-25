/**
 * Database's table index options.
 */
export interface TableIndexOptions {
    /**
     * Constraint name.
     */
    name?: string;
    /**
     * Columns included in this index.
     */
    columnNames: string[];
    /**
     * Indicates if this index is unique.
     */
    isUnique?: boolean;
    /**
     * The SPATIAL modifier indexes the entire column and does not allow indexed columns to contain NULL values.
     * Works only in MySQL.
     */
    isSpatial?: boolean;
    /**
     * Builds the index using the concurrently option.
     * This options is only supported for postgres database.
     */
    isConcurrent?: boolean;
    /**
     * The FULLTEXT modifier indexes the entire column and does not allow prefixing.
     * Supported only in MySQL & SAP HANA.
     */
    isFulltext?: boolean;
    /**
     * NULL_FILTERED indexes are particularly useful for indexing sparse columns, where most rows contain a NULL value.
     * In these cases, the NULL_FILTERED index can be considerably smaller and more efficient to maintain than
     * a normal index that includes NULL values.
     *
     * Works only in Spanner.
     */
    isNullFiltered?: boolean;
    /**
     * Fulltext parser.
     * Works only in MySQL.
     */
    parser?: string;
    /**
     * Index filter condition.
     */
    where?: string;
}

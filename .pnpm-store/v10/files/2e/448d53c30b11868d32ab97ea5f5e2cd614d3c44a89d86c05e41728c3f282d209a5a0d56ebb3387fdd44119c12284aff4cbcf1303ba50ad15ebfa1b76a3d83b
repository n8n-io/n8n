import { ColumnType } from "./ColumnTypes";
/**
 * Orm has special columns and we need to know what database column types should be for those types.
 * Column types are driver dependant.
 */
export interface MappedColumnTypes {
    /**
     * Column type for the create date column.
     */
    createDate: ColumnType;
    /**
     * Precision of datetime column. Used in MySql to define milliseconds.
     */
    createDatePrecision?: number;
    /**
     * Default value should be used by a database for "created date" column.
     */
    createDateDefault: string;
    /**
     * Column type for the update date column.
     */
    updateDate: ColumnType;
    /**
     * Precision of datetime column. Used in MySql to define milliseconds.
     */
    updateDatePrecision?: number;
    /**
     * Default value should be used by a database for "updated date" column.
     */
    updateDateDefault: string;
    /**
     * Column type for the delete date column.
     */
    deleteDate: ColumnType;
    /**
     * Precision of datetime column. Used in MySql to define milliseconds.
     */
    deleteDatePrecision?: number;
    /**
     * Nullable value should be used by a database for "deleted date" column.
     */
    deleteDateNullable: boolean;
    /**
     * Column type for the version column.
     */
    version: ColumnType;
    /**
     * Column type for the tree level column.
     */
    treeLevel: ColumnType;
    /**
     * Column type of id column used for migrations table.
     */
    migrationId: ColumnType;
    /**
     * Column type of timestamp column used for migrations table.
     */
    migrationTimestamp: ColumnType;
    /**
     * Column type for migration name column used for migrations table.
     */
    migrationName: ColumnType;
    /**
     * Column type for identifier column in query result cache table.
     */
    cacheId: ColumnType;
    /**
     * Column type for identifier column in query result cache table.
     */
    cacheIdentifier: ColumnType;
    /**
     * Column type for time column in query result cache table.
     */
    cacheTime: ColumnType;
    /**
     * Column type for duration column in query result cache table.
     */
    cacheDuration: ColumnType;
    /**
     * Column type for query column in query result cache table.
     */
    cacheQuery: ColumnType;
    /**
     * Column type for result column in query result cache table.
     */
    cacheResult: ColumnType;
    /**
     * Column type for metadata type column in typeorm metadata table.
     * Stores type of metadata. E.g. 'VIEW' or 'CHECK'
     */
    metadataType: ColumnType;
    /**
     * Column type for metadata database name column in typeorm metadata table.
     */
    metadataDatabase: ColumnType;
    /**
     * Column type for metadata schema name column in typeorm metadata table.
     */
    metadataSchema: ColumnType;
    /**
     * Column type for metadata table name column in typeorm metadata table.
     */
    metadataTable: ColumnType;
    /**
     * Column type for metadata name column in typeorm metadata table.
     */
    metadataName: ColumnType;
    /**
     * Column type for metadata value column in typeorm metadata table.
     */
    metadataValue: ColumnType;
}

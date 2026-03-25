import { Driver } from "../Driver";
import { ObjectLiteral } from "../../common/ObjectLiteral";
import { ColumnMetadata } from "../../metadata/ColumnMetadata";
import { DataSource } from "../../data-source/DataSource";
import { RdbmsSchemaBuilder } from "../../schema-builder/RdbmsSchemaBuilder";
import { CteCapabilities } from "../types/CteCapabilities";
import { MappedColumnTypes } from "../types/MappedColumnTypes";
import { ColumnType } from "../types/ColumnTypes";
import { QueryRunner } from "../../query-runner/QueryRunner";
import { DataTypeDefaults } from "../types/DataTypeDefaults";
import { TableColumn } from "../../schema-builder/table/TableColumn";
import { BaseDataSourceOptions } from "../../data-source/BaseDataSourceOptions";
import { EntityMetadata } from "../../metadata/EntityMetadata";
import { ReplicationMode } from "../types/ReplicationMode";
import { Table } from "../../schema-builder/table/Table";
import { View } from "../../schema-builder/view/View";
import { TableForeignKey } from "../../schema-builder/table/TableForeignKey";
import { UpsertType } from "../types/UpsertType";
type DatabasesMap = Record<string, {
    attachFilepathAbsolute: string;
    attachFilepathRelative: string;
    attachHandle: string;
}>;
/**
 * Organizes communication with sqlite DBMS.
 */
export declare abstract class AbstractSqliteDriver implements Driver {
    /**
     * Connection used by driver.
     */
    connection: DataSource;
    /**
     * Sqlite has a single QueryRunner because it works on a single database connection.
     */
    queryRunner?: QueryRunner;
    /**
     * Real database connection with sqlite database.
     */
    databaseConnection: any;
    /**
     * Connection options.
     */
    options: BaseDataSourceOptions;
    /**
     * Master database used to perform all write queries.
     */
    database?: string;
    /**
     * Indicates if replication is enabled.
     */
    isReplicated: boolean;
    /**
     * SQLite underlying library.
     */
    sqlite: any;
    /**
     * Indicates if tree tables are supported by this driver.
     */
    treeSupport: boolean;
    /**
     * Represent transaction support by this driver
     */
    transactionSupport: "simple" | "nested" | "none";
    /**
     * Gets list of supported column data types by a driver.
     *
     * @see https://www.tutorialspoint.com/sqlite/sqlite_data_types.htm
     * @see https://sqlite.org/datatype3.html
     */
    supportedDataTypes: ColumnType[];
    /**
     * Returns type of upsert supported by driver if any
     */
    supportedUpsertTypes: UpsertType[];
    /**
     * Gets list of column data types that support length by a driver.
     */
    withLengthColumnTypes: ColumnType[];
    /**
     * Gets list of spatial column data types.
     */
    spatialTypes: ColumnType[];
    /**
     * Gets list of column data types that support precision by a driver.
     */
    withPrecisionColumnTypes: ColumnType[];
    /**
     * Gets list of column data types that support scale by a driver.
     */
    withScaleColumnTypes: ColumnType[];
    /**
     * Orm has special columns and we need to know what database column types should be for those types.
     * Column types are driver dependant.
     */
    mappedDataTypes: MappedColumnTypes;
    /**
     * Default values of length, precision and scale depends on column data type.
     * Used in the cases when length/precision/scale is not specified by user.
     */
    dataTypeDefaults: DataTypeDefaults;
    /**
     * No documentation specifying a maximum length for identifiers could be found
     * for SQLite.
     */
    maxAliasLength?: number;
    cteCapabilities: CteCapabilities;
    /**
     * Any attached databases (excepting default 'main')
     */
    attachedDatabases: DatabasesMap;
    constructor(connection: DataSource);
    /**
     * Creates a query runner used to execute database queries.
     */
    abstract createQueryRunner(mode: ReplicationMode): QueryRunner;
    /**
     * Performs connection to the database.
     */
    connect(): Promise<void>;
    /**
     * Makes any action after connection (e.g. create extensions in Postgres driver).
     */
    afterConnect(): Promise<void>;
    /**
     * Closes connection with database.
     */
    disconnect(): Promise<void>;
    hasAttachedDatabases(): boolean;
    getAttachedDatabaseHandleByRelativePath(path: string): string | undefined;
    getAttachedDatabasePathRelativeByHandle(handle: string): string | undefined;
    /**
     * Creates a schema builder used to build and sync a schema.
     */
    createSchemaBuilder(): RdbmsSchemaBuilder;
    /**
     * Prepares given value to a value to be persisted, based on its column type and metadata.
     */
    preparePersistentValue(value: any, columnMetadata: ColumnMetadata): any;
    /**
     * Prepares given value to a value to be hydrated, based on its column type or metadata.
     */
    prepareHydratedValue(value: any, columnMetadata: ColumnMetadata): any;
    /**
     * Replaces parameters in the given sql with special escaping character
     * and an array of parameter names to be passed to a query.
     */
    escapeQueryWithParameters(sql: string, parameters: ObjectLiteral, nativeParameters: ObjectLiteral): [string, any[]];
    /**
     * Escapes a column name.
     */
    escape(columnName: string): string;
    /**
     * Build full table name with database name, schema name and table name.
     * E.g. myDB.mySchema.myTable
     *
     * Returns only simple table name because all inherited drivers does not supports schema and database.
     */
    buildTableName(tableName: string, schema?: string, database?: string): string;
    /**
     * Parse a target table name or other types and return a normalized table definition.
     */
    parseTableName(target: EntityMetadata | Table | View | TableForeignKey | string): {
        database?: string;
        schema?: string;
        tableName: string;
    };
    /**
     * Creates a database type from a given column metadata.
     */
    normalizeType(column: {
        type?: ColumnType;
        length?: number | string;
        precision?: number | null;
        scale?: number;
    }): string;
    /**
     * Normalizes "default" value of the column.
     */
    normalizeDefault(columnMetadata: ColumnMetadata): string | undefined;
    /**
     * Normalizes "isUnique" value of the column.
     */
    normalizeIsUnique(column: ColumnMetadata): boolean;
    /**
     * Calculates column length taking into account the default length values.
     */
    getColumnLength(column: ColumnMetadata): string;
    /**
     * Normalizes "default" value of the column.
     */
    createFullType(column: TableColumn): string;
    /**
     * Obtains a new database connection to a master server.
     * Used for replication.
     * If replication is not setup then returns default connection's database connection.
     */
    obtainMasterConnection(): Promise<any>;
    /**
     * Obtains a new database connection to a slave server.
     * Used for replication.
     * If replication is not setup then returns master (default) connection's database connection.
     */
    obtainSlaveConnection(): Promise<any>;
    /**
     * Creates generated map of values generated or returned by database after INSERT query.
     */
    createGeneratedMap(metadata: EntityMetadata, insertResult: any, entityIndex: number, entityNum: number): any;
    /**
     * Differentiate columns of this table and columns from the given column metadatas columns
     * and returns only changed.
     */
    findChangedColumns(tableColumns: TableColumn[], columnMetadatas: ColumnMetadata[]): ColumnMetadata[];
    /**
     * Returns true if driver supports RETURNING / OUTPUT statement.
     */
    isReturningSqlSupported(): boolean;
    /**
     * Returns true if driver supports uuid values generation on its own.
     */
    isUUIDGenerationSupported(): boolean;
    /**
     * Returns true if driver supports fulltext indices.
     */
    isFullTextColumnTypeSupported(): boolean;
    /**
     * Creates an escaped parameter.
     */
    createParameter(parameterName: string, index: number): string;
    /**
     * Creates connection with the database.
     */
    protected createDatabaseConnection(): void;
    /**
     * If driver dependency is not given explicitly, then try to load it via "require".
     */
    protected loadDependencies(): void;
}
export {};

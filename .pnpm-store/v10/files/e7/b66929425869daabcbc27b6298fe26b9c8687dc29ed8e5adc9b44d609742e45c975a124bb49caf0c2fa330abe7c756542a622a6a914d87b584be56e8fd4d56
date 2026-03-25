import { Driver, ReturningType } from "../Driver";
import { CteCapabilities } from "../types/CteCapabilities";
import { MysqlQueryRunner } from "./MysqlQueryRunner";
import { ObjectLiteral } from "../../common/ObjectLiteral";
import { ColumnMetadata } from "../../metadata/ColumnMetadata";
import { DataSource } from "../../data-source/DataSource";
import { RdbmsSchemaBuilder } from "../../schema-builder/RdbmsSchemaBuilder";
import { MysqlConnectionOptions } from "./MysqlConnectionOptions";
import { MappedColumnTypes } from "../types/MappedColumnTypes";
import { ColumnType } from "../types/ColumnTypes";
import { DataTypeDefaults } from "../types/DataTypeDefaults";
import { TableColumn } from "../../schema-builder/table/TableColumn";
import { MysqlConnectionCredentialsOptions } from "./MysqlConnectionCredentialsOptions";
import { EntityMetadata } from "../../metadata/EntityMetadata";
import { ReplicationMode } from "../types/ReplicationMode";
import { Table } from "../../schema-builder/table/Table";
import { View } from "../../schema-builder/view/View";
import { TableForeignKey } from "../../schema-builder/table/TableForeignKey";
import { UpsertType } from "../types/UpsertType";
/**
 * Organizes communication with MySQL DBMS.
 */
export declare class MysqlDriver implements Driver {
    /**
     * Connection used by driver.
     */
    connection: DataSource;
    /**
     * Mysql underlying library.
     */
    mysql: any;
    /**
     * Connection pool.
     * Used in non-replication mode.
     */
    pool: any;
    /**
     * Pool cluster used in replication mode.
     */
    poolCluster: any;
    /**
     * Connection options.
     */
    options: MysqlConnectionOptions;
    /**
     * Version of MySQL. Requires a SQL query to the DB, so it is not always set
     */
    version?: string;
    /**
     * Master database used to perform all write queries.
     */
    database?: string;
    /**
     * Indicates if replication is enabled.
     */
    isReplicated: boolean;
    /**
     * Indicates if tree tables are supported by this driver.
     */
    treeSupport: boolean;
    /**
     * Represent transaction support by this driver
     */
    transactionSupport: "nested";
    /**
     * Gets list of supported column data types by a driver.
     *
     * @see https://www.tutorialspoint.com/mysql/mysql-data-types.htm
     * @see https://dev.mysql.com/doc/refman/8.0/en/data-types.html
     */
    supportedDataTypes: ColumnType[];
    /**
     * Returns type of upsert supported by driver if any
     */
    supportedUpsertTypes: UpsertType[];
    /**
     * Gets list of spatial column data types.
     */
    spatialTypes: ColumnType[];
    /**
     * Gets list of column data types that support length by a driver.
     */
    withLengthColumnTypes: ColumnType[];
    /**
     * Gets list of column data types that support length by a driver.
     */
    withWidthColumnTypes: ColumnType[];
    /**
     * Gets list of column data types that support precision by a driver.
     */
    withPrecisionColumnTypes: ColumnType[];
    /**
     * Gets list of column data types that supports scale by a driver.
     */
    withScaleColumnTypes: ColumnType[];
    /**
     * Gets list of column data types that supports UNSIGNED and ZEROFILL attributes.
     */
    unsignedAndZerofillTypes: ColumnType[];
    /**
     * ORM has special columns and we need to know what database column types should be for those columns.
     * Column types are driver dependant.
     */
    mappedDataTypes: MappedColumnTypes;
    /**
     * Default values of length, precision and scale depends on column data type.
     * Used in the cases when length/precision/scale is not specified by user.
     */
    dataTypeDefaults: DataTypeDefaults;
    /**
     * Max length allowed by MySQL for aliases.
     * @see https://dev.mysql.com/doc/refman/5.5/en/identifiers.html
     */
    maxAliasLength: number;
    cteCapabilities: CteCapabilities;
    /**
     * Supported returning types
     */
    private readonly _isReturningSqlSupported;
    /** MariaDB supports uuid type for version 10.7.0 and up */
    private uuidColumnTypeSuported;
    constructor(connection: DataSource);
    /**
     * Performs connection to the database.
     */
    connect(): Promise<void>;
    /**
     * Makes any action after connection (e.g. create extensions in Postgres driver).
     */
    afterConnect(): Promise<void>;
    /**
     * Closes connection with the database.
     */
    disconnect(): Promise<void>;
    /**
     * Creates a schema builder used to build and sync a schema.
     */
    createSchemaBuilder(): RdbmsSchemaBuilder;
    /**
     * Creates a query runner used to execute database queries.
     */
    createQueryRunner(mode: ReplicationMode): MysqlQueryRunner;
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
     * Prepares given value to a value to be persisted, based on its column type and metadata.
     */
    preparePersistentValue(value: any, columnMetadata: ColumnMetadata): any;
    /**
     * Prepares given value to a value to be persisted, based on its column type or metadata.
     */
    prepareHydratedValue(value: any, columnMetadata: ColumnMetadata): any;
    /**
     * Creates a database type from a given column metadata.
     */
    normalizeType(column: {
        type: ColumnType;
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
     * Returns default column lengths, which is required on column creation.
     */
    getColumnLength(column: ColumnMetadata | TableColumn): string;
    /**
     * Creates column type definition including length, precision and scale
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
    createGeneratedMap(metadata: EntityMetadata, insertResult: any, entityIndex: number): any;
    /**
     * Differentiate columns of this table and columns from the given column metadatas columns
     * and returns only changed.
     */
    findChangedColumns(tableColumns: TableColumn[], columnMetadatas: ColumnMetadata[]): ColumnMetadata[];
    /**
     * Returns true if driver supports RETURNING / OUTPUT statement.
     */
    isReturningSqlSupported(returningType: ReturningType): boolean;
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
     * Loads all driver dependencies.
     */
    protected loadDependencies(): void;
    /**
     * Creates a new connection pool for a given database credentials.
     */
    protected createConnectionOptions(options: MysqlConnectionOptions, credentials: MysqlConnectionCredentialsOptions): Promise<any>;
    /**
     * Creates a new connection pool for a given database credentials.
     */
    protected createPool(connectionOptions: any): Promise<any>;
    /**
     * Attaches all required base handlers to a database connection, such as the unhandled error handler.
     */
    private prepareDbConnection;
    /**
     * Checks if "DEFAULT" values in the column metadata and in the database are equal.
     */
    protected compareDefaultValues(columnMetadataValue: string | undefined, databaseValue: string | undefined): boolean;
    compareNullableValues(columnMetadata: ColumnMetadata, tableColumn: TableColumn): boolean;
    /**
     * If parameter is a datetime function, e.g. "CURRENT_TIMESTAMP", normalizes it.
     * Otherwise returns original input.
     */
    protected normalizeDatetimeFunction(value?: string): string | undefined;
    /**
     * Escapes a given comment.
     */
    protected escapeComment(comment?: string): string | undefined;
    /**
     * A helper to check if column data types have changed
     * This can be used to manage checking any types the
     * database may alias
     */
    private isColumnDataTypeChanged;
}

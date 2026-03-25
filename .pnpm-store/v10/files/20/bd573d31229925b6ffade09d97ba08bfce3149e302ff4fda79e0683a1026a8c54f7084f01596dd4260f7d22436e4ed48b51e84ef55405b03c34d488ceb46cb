import type { QueryRunner } from "../query-runner/QueryRunner";
import type { ColumnMetadata } from "../metadata/ColumnMetadata";
import type { ObjectLiteral } from "../common/ObjectLiteral";
import type { ColumnType } from "./types/ColumnTypes";
import type { CteCapabilities } from "./types/CteCapabilities";
import type { MappedColumnTypes } from "./types/MappedColumnTypes";
import type { SchemaBuilder } from "../schema-builder/SchemaBuilder";
import type { DataTypeDefaults } from "./types/DataTypeDefaults";
import type { BaseDataSourceOptions } from "../data-source/BaseDataSourceOptions";
import type { TableColumn } from "../schema-builder/table/TableColumn";
import type { EntityMetadata } from "../metadata/EntityMetadata";
import type { ReplicationMode } from "./types/ReplicationMode";
import type { Table } from "../schema-builder/table/Table";
import type { View } from "../schema-builder/view/View";
import type { TableForeignKey } from "../schema-builder/table/TableForeignKey";
import type { UpsertType } from "./types/UpsertType";
import type { OnDeleteType } from "../metadata/types/OnDeleteType";
import type { OnUpdateType } from "../metadata/types/OnUpdateType";
import type { DataSource } from "../data-source";
export type ReturningType = "insert" | "update" | "delete";
/**
 * Driver organizes TypeORM communication with specific database management system.
 */
export interface Driver {
    /**
     * Connection options.
     */
    options: BaseDataSourceOptions;
    /**
     * Database version/release. Often requires a SQL query to the DB, so it is not always set
     */
    version?: string;
    /**
     * Database name used to perform all write queries.
     *
     * todo: probably move into query runner.
     */
    database?: string;
    /**
     * Schema name used to perform all write queries.
     */
    schema?: string;
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
    transactionSupport: "simple" | "nested" | "none";
    /**
     * Gets list of supported column data types by a driver.
     */
    supportedDataTypes: ColumnType[];
    /**
     * Returns type of upsert supported by driver if any
     */
    supportedUpsertTypes: UpsertType[];
    /**
     * Returns list of supported onDelete types by driver
     */
    supportedOnDeleteTypes?: OnDeleteType[];
    /**
     * Returns list of supported onUpdate types by driver
     */
    supportedOnUpdateTypes?: OnUpdateType[];
    /**
     * Default values of length, precision and scale depends on column data type.
     * Used in the cases when length/precision/scale is not specified by user.
     */
    dataTypeDefaults: DataTypeDefaults;
    /**
     * Gets list of spatial column data types.
     */
    spatialTypes: ColumnType[];
    /**
     * Gets list of column data types that support length by a driver.
     */
    withLengthColumnTypes: ColumnType[];
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
     * The prefix used for the parameters
     */
    parametersPrefix?: string;
    /**
     * Max length allowed by the DBMS for aliases (execution of queries).
     */
    maxAliasLength?: number;
    cteCapabilities: CteCapabilities;
    /**
     * Dummy table name
     */
    dummyTableName?: string;
    /**
     * Performs connection to the database.
     * Depend on driver type it may create a connection pool.
     */
    connect(): Promise<void>;
    /**
     * Makes any action after connection (e.g. create extensions in Postgres driver).
     */
    afterConnect(): Promise<void>;
    /**
     * Closes connection with database and releases all resources.
     */
    disconnect(): Promise<void>;
    /**
     * Synchronizes database schema (creates tables, indices, etc).
     */
    createSchemaBuilder(): SchemaBuilder;
    /**
     * Creates a query runner used for common queries.
     */
    createQueryRunner(mode: ReplicationMode): QueryRunner;
    /**
     * Replaces parameters in the given sql with special escaping character
     * and an array of parameter names to be passed to a query.
     */
    escapeQueryWithParameters(sql: string, parameters: ObjectLiteral, nativeParameters: ObjectLiteral): [string, any[]];
    /**
     * Escapes a table name, column name or an alias.
     *
     * todo: probably escape should be able to handle dots in the names and automatically escape them
     */
    escape(name: string): string;
    /**
     * Build full table name with database name, schema name and table name.
     * E.g. myDB.mySchema.myTable
     */
    buildTableName(tableName: string, schema?: string, database?: string): string;
    /**
     * Parse a target table name or other types and return a normalized table definition.
     */
    parseTableName(target: EntityMetadata | Table | View | TableForeignKey | string): {
        tableName: string;
        schema?: string;
        database?: string;
    };
    /**
     * Prepares given value to a value to be persisted, based on its column type and metadata.
     */
    preparePersistentValue(value: any, column: ColumnMetadata): any;
    /**
     * Prepares given value to a value to be persisted, based on its column type.
     */
    prepareHydratedValue(value: any, column: ColumnMetadata): any;
    /**
     * Transforms type of the given column to a database column type.
     */
    normalizeType(column: {
        type?: ColumnType | string;
        length?: number | string;
        precision?: number | null;
        scale?: number;
        isArray?: boolean;
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
    createGeneratedMap(metadata: EntityMetadata, insertResult: any, entityIndex?: number, entityNum?: number): ObjectLiteral | undefined;
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
}
export interface DriverConstructor {
    new (connection: DataSource): Driver;
}

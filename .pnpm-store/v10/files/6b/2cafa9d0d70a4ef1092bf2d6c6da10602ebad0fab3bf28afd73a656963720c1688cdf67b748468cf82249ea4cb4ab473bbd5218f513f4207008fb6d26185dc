import { ObjectLiteral } from "../../common/ObjectLiteral";
import { DataSource } from "../../data-source/DataSource";
import { ColumnMetadata } from "../../metadata/ColumnMetadata";
import { EntityMetadata } from "../../metadata/EntityMetadata";
import { QueryRunner } from "../../query-runner/QueryRunner";
import { RdbmsSchemaBuilder } from "../../schema-builder/RdbmsSchemaBuilder";
import { TableColumn } from "../../schema-builder/table/TableColumn";
import { Driver } from "../Driver";
import { ColumnType } from "../types/ColumnTypes";
import { CteCapabilities } from "../types/CteCapabilities";
import { DataTypeDefaults } from "../types/DataTypeDefaults";
import { MappedColumnTypes } from "../types/MappedColumnTypes";
import { ReplicationMode } from "../types/ReplicationMode";
import { PostgresConnectionCredentialsOptions } from "./PostgresConnectionCredentialsOptions";
import { PostgresConnectionOptions } from "./PostgresConnectionOptions";
import { Table } from "../../schema-builder/table/Table";
import { View } from "../../schema-builder/view/View";
import { TableForeignKey } from "../../schema-builder/table/TableForeignKey";
import { UpsertType } from "../types/UpsertType";
import type pg from "pg";
/**
 * Organizes communication with PostgreSQL DBMS.
 */
export declare class PostgresDriver implements Driver {
    /**
     * Connection used by driver.
     */
    connection: DataSource;
    /**
     * Postgres underlying library.
     */
    postgres: typeof pg;
    /**
     * Pool for master database.
     */
    master: pg.Pool | undefined;
    /**
     * Pool for slave databases.
     * Used in replication.
     */
    slaves: any[];
    /**
     * We store all created query runners because we need to release them.
     */
    connectedQueryRunners: QueryRunner[];
    /**
     * Connection options.
     */
    options: PostgresConnectionOptions;
    /**
     * Version of Postgres. Requires a SQL query to the DB, so it is not always set
     */
    version?: string;
    /**
     * Database name used to perform all write queries.
     */
    database?: string;
    /**
     * Schema name used to perform all write queries.
     */
    schema?: string;
    /**
     * Schema that's used internally by Postgres for object resolution.
     *
     * Because we never set this we have to track it in separately from the `schema` so
     * we know when we have to specify the full schema or not.
     *
     * In most cases this will be `public`.
     */
    searchSchema?: string;
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
     * @see https://www.tutorialspoint.com/postgresql/postgresql_data_types.htm
     * @see https://www.postgresql.org/docs/9.2/static/datatype.html
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
    parametersPrefix: string;
    /**
     * Default values of length, precision and scale depends on column data type.
     * Used in the cases when length/precision/scale is not specified by user.
     */
    dataTypeDefaults: DataTypeDefaults;
    /**
     * Max length allowed by Postgres for aliases.
     * @see https://www.postgresql.org/docs/current/sql-syntax-lexical.html#SQL-SYNTAX-IDENTIFIERS
     */
    maxAliasLength: number;
    isGeneratedColumnsSupported: boolean;
    cteCapabilities: CteCapabilities;
    /**
     * Is true if the native driver is used. The native driver does not support
     * streaming, so you can use this property to disable streaming in your
     * application.
     */
    isNative: boolean;
    constructor(connection?: DataSource);
    /**
     * Performs connection to the database.
     * Based on pooling options, it can either create connection immediately,
     * either create a pool and create connection when needed.
     */
    connect(): Promise<void>;
    /**
     * Makes any action after connection (e.g. create extensions in Postgres driver).
     */
    afterConnect(): Promise<void>;
    protected enableExtensions(extensionsMetadata: any, connection: any): Promise<void>;
    protected checkMetadataForExtensions(): Promise<{
        hasUuidColumns: boolean;
        hasCitextColumns: boolean;
        hasHstoreColumns: boolean;
        hasCubeColumns: boolean;
        hasGeometryColumns: boolean;
        hasLtreeColumns: boolean;
        hasExclusionConstraints: boolean;
        hasExtensions: boolean;
    }>;
    /**
     * Closes connection with database.
     */
    disconnect(): Promise<void>;
    /**
     * Creates a schema builder used to build and sync a schema.
     */
    createSchemaBuilder(): RdbmsSchemaBuilder;
    /**
     * Creates a query runner used to execute database queries.
     */
    createQueryRunner(mode: ReplicationMode): QueryRunner;
    /**
     * Prepares given value to a value to be persisted, based on its column type and metadata.
     */
    preparePersistentValue(value: any, columnMetadata: ColumnMetadata): any;
    /**
     * Prepares given value to a value to be persisted, based on its column type or metadata.
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
     * Build full table name with schema name and table name.
     * E.g. myDB.mySchema.myTable
     */
    buildTableName(tableName: string, schema?: string): string;
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
        isArray?: boolean;
    }): string;
    /**
     * Normalizes "default" value of the column.
     */
    normalizeDefault(columnMetadata: ColumnMetadata): string | undefined;
    /**
     * Compares "default" value of the column.
     * Postgres sorts json values before it is saved, so in that case a deep comparison has to be performed to see if has changed.
     */
    private defaultEqual;
    /**
     * Normalizes "isUnique" value of the column.
     */
    normalizeIsUnique(column: ColumnMetadata): boolean;
    /**
     * Returns default column lengths, which is required on column creation.
     */
    getColumnLength(column: ColumnMetadata): string;
    /**
     * Creates column type definition including length, precision and scale
     */
    createFullType(column: TableColumn): string;
    /**
     * Obtains a new database connection to a master server.
     * Used for replication.
     * If replication is not setup then returns default connection's database connection.
     */
    obtainMasterConnection(): Promise<[any, Function]>;
    /**
     * Obtains a new database connection to a slave server.
     * Used for replication.
     * If replication is not setup then returns master (default) connection's database connection.
     */
    obtainSlaveConnection(): Promise<[any, Function]>;
    /**
     * Creates generated map of values generated or returned by database after INSERT query.
     *
     * todo: slow. optimize Object.keys(), OrmUtils.mergeDeep and column.createValueMap parts
     */
    createGeneratedMap(metadata: EntityMetadata, insertResult: ObjectLiteral): ObjectLiteral | undefined;
    /**
     * Differentiate columns of this table and columns from the given column metadatas columns
     * and returns only changed.
     */
    findChangedColumns(tableColumns: TableColumn[], columnMetadatas: ColumnMetadata[]): ColumnMetadata[];
    private lowerDefaultValueIfNecessary;
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
    get uuidGenerator(): string;
    /**
     * Creates an escaped parameter.
     */
    createParameter(parameterName: string, index: number): string;
    /**
     * Loads postgres query stream package.
     */
    loadStreamDependency(): any;
    /**
     * If driver dependency is not given explicitly, then try to load it via "require".
     */
    protected loadDependencies(): void;
    /**
     * Creates a new connection pool for a given database credentials.
     */
    protected createPool(options: PostgresConnectionOptions, credentials: PostgresConnectionCredentialsOptions): Promise<any>;
    /**
     * Closes connection pool.
     */
    protected closePool(pool: any): Promise<void>;
    /**
     * Executes given query.
     */
    protected executeQuery(connection: any, query: string): Promise<unknown>;
    /**
     * If parameter is a datetime function, e.g. "CURRENT_TIMESTAMP", normalizes it.
     * Otherwise returns original input.
     */
    protected normalizeDatetimeFunction(value: string): string;
    /**
     * Escapes a given comment.
     */
    protected escapeComment(comment?: string): string | undefined;
}

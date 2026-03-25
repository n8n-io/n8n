
import { ReadStream } from "../../platform/PlatformTools";
import { BaseQueryRunner } from "../../query-runner/BaseQueryRunner";
import { QueryRunner } from "../../query-runner/QueryRunner";
import { Table } from "../../schema-builder/table/Table";
import { TableCheck } from "../../schema-builder/table/TableCheck";
import { TableColumn } from "../../schema-builder/table/TableColumn";
import { TableExclusion } from "../../schema-builder/table/TableExclusion";
import { TableForeignKey } from "../../schema-builder/table/TableForeignKey";
import { TableIndex } from "../../schema-builder/table/TableIndex";
import { TableUnique } from "../../schema-builder/table/TableUnique";
import { View } from "../../schema-builder/view/View";
import { Query } from "../Query";
import { IsolationLevel } from "../types/IsolationLevel";
import { ReplicationMode } from "../types/ReplicationMode";
import { PostgresDriver } from "./PostgresDriver";
/**
 * Runs queries on a single postgres database connection.
 */
export declare class PostgresQueryRunner extends BaseQueryRunner implements QueryRunner {
    /**
     * Database driver used by connection.
     */
    driver: PostgresDriver;
    /**
     * Promise used to obtain a database connection for a first time.
     */
    protected databaseConnectionPromise: Promise<any>;
    /**
     * Special callback provided by a driver used to release a created connection.
     */
    protected releaseCallback?: (err: any) => void;
    constructor(driver: PostgresDriver, mode: ReplicationMode);
    /**
     * Creates/uses database connection from the connection pool to perform further operations.
     * Returns obtained database connection.
     */
    connect(): Promise<any>;
    /**
     * Release a connection back to the pool, optionally specifying an Error to release with.
     * Per pg-pool documentation this will prevent the pool from re-using the broken connection.
     */
    private releasePostgresConnection;
    /**
     * Releases used database connection.
     * You cannot use query runner methods once its released.
     */
    release(): Promise<void>;
    /**
     * Starts transaction.
     */
    startTransaction(isolationLevel?: IsolationLevel): Promise<void>;
    /**
     * Commits transaction.
     * Error will be thrown if transaction was not started.
     */
    commitTransaction(): Promise<void>;
    /**
     * Rollbacks transaction.
     * Error will be thrown if transaction was not started.
     */
    rollbackTransaction(): Promise<void>;
    /**
     * Executes a given SQL query.
     */
    query(query: string, parameters?: any[], useStructuredResult?: boolean): Promise<any>;
    /**
     * Returns raw data stream.
     */
    stream(query: string, parameters?: any[], onEnd?: Function, onError?: Function): Promise<ReadStream>;
    /**
     * Returns all available database names including system databases.
     */
    getDatabases(): Promise<string[]>;
    /**
     * Returns all available schema names including system schemas.
     * If database parameter specified, returns schemas of that database.
     */
    getSchemas(database?: string): Promise<string[]>;
    /**
     * Checks if database with the given name exist.
     */
    hasDatabase(database: string): Promise<boolean>;
    /**
     * Loads currently using database
     */
    getCurrentDatabase(): Promise<string>;
    /**
     * Checks if schema with the given name exist.
     */
    hasSchema(schema: string): Promise<boolean>;
    /**
     * Loads currently using database schema
     */
    getCurrentSchema(): Promise<string>;
    /**
     * Checks if table with the given name exist in the database.
     */
    hasTable(tableOrName: Table | string): Promise<boolean>;
    /**
     * Checks if column with the given name exist in the given table.
     */
    hasColumn(tableOrName: Table | string, columnName: string): Promise<boolean>;
    /**
     * Creates a new database.
     * Note: Postgres does not support database creation inside a transaction block.
     */
    createDatabase(database: string, ifNotExist?: boolean): Promise<void>;
    /**
     * Drops database.
     * Note: Postgres does not support database dropping inside a transaction block.
     */
    dropDatabase(database: string, ifExist?: boolean): Promise<void>;
    /**
     * Creates a new table schema.
     */
    createSchema(schemaPath: string, ifNotExist?: boolean): Promise<void>;
    /**
     * Drops table schema.
     */
    dropSchema(schemaPath: string, ifExist?: boolean, isCascade?: boolean): Promise<void>;
    /**
     * Creates a new table.
     */
    createTable(table: Table, ifNotExist?: boolean, createForeignKeys?: boolean, createIndices?: boolean): Promise<void>;
    /**
     * Drops the table.
     */
    dropTable(target: Table | string, ifExist?: boolean, dropForeignKeys?: boolean, dropIndices?: boolean): Promise<void>;
    /**
     * Creates a new view.
     */
    createView(view: View, syncWithMetadata?: boolean): Promise<void>;
    /**
     * Drops the view.
     */
    dropView(target: View | string): Promise<void>;
    /**
     * Renames the given table.
     */
    renameTable(oldTableOrName: Table | string, newTableName: string): Promise<void>;
    /**
     * Creates a new column from the column in the table.
     */
    addColumn(tableOrName: Table | string, column: TableColumn): Promise<void>;
    /**
     * Creates a new columns from the column in the table.
     */
    addColumns(tableOrName: Table | string, columns: TableColumn[]): Promise<void>;
    /**
     * Renames column in the given table.
     */
    renameColumn(tableOrName: Table | string, oldTableColumnOrName: TableColumn | string, newTableColumnOrName: TableColumn | string): Promise<void>;
    /**
     * Changes a column in the table.
     */
    changeColumn(tableOrName: Table | string, oldTableColumnOrName: TableColumn | string, newColumn: TableColumn): Promise<void>;
    /**
     * Changes a column in the table.
     */
    changeColumns(tableOrName: Table | string, changedColumns: {
        newColumn: TableColumn;
        oldColumn: TableColumn;
    }[]): Promise<void>;
    /**
     * Drops column in the table.
     */
    dropColumn(tableOrName: Table | string, columnOrName: TableColumn | string): Promise<void>;
    /**
     * Drops the columns in the table.
     */
    dropColumns(tableOrName: Table | string, columns: TableColumn[] | string[]): Promise<void>;
    /**
     * Creates a new primary key.
     */
    createPrimaryKey(tableOrName: Table | string, columnNames: string[], constraintName?: string): Promise<void>;
    /**
     * Updates composite primary keys.
     */
    updatePrimaryKeys(tableOrName: Table | string, columns: TableColumn[]): Promise<void>;
    /**
     * Drops a primary key.
     */
    dropPrimaryKey(tableOrName: Table | string, constraintName?: string): Promise<void>;
    /**
     * Creates new unique constraint.
     */
    createUniqueConstraint(tableOrName: Table | string, uniqueConstraint: TableUnique): Promise<void>;
    /**
     * Creates new unique constraints.
     */
    createUniqueConstraints(tableOrName: Table | string, uniqueConstraints: TableUnique[]): Promise<void>;
    /**
     * Drops unique constraint.
     */
    dropUniqueConstraint(tableOrName: Table | string, uniqueOrName: TableUnique | string): Promise<void>;
    /**
     * Drops unique constraints.
     */
    dropUniqueConstraints(tableOrName: Table | string, uniqueConstraints: TableUnique[]): Promise<void>;
    /**
     * Creates new check constraint.
     */
    createCheckConstraint(tableOrName: Table | string, checkConstraint: TableCheck): Promise<void>;
    /**
     * Creates new check constraints.
     */
    createCheckConstraints(tableOrName: Table | string, checkConstraints: TableCheck[]): Promise<void>;
    /**
     * Drops check constraint.
     */
    dropCheckConstraint(tableOrName: Table | string, checkOrName: TableCheck | string): Promise<void>;
    /**
     * Drops check constraints.
     */
    dropCheckConstraints(tableOrName: Table | string, checkConstraints: TableCheck[]): Promise<void>;
    /**
     * Creates new exclusion constraint.
     */
    createExclusionConstraint(tableOrName: Table | string, exclusionConstraint: TableExclusion): Promise<void>;
    /**
     * Creates new exclusion constraints.
     */
    createExclusionConstraints(tableOrName: Table | string, exclusionConstraints: TableExclusion[]): Promise<void>;
    /**
     * Drops exclusion constraint.
     */
    dropExclusionConstraint(tableOrName: Table | string, exclusionOrName: TableExclusion | string): Promise<void>;
    /**
     * Drops exclusion constraints.
     */
    dropExclusionConstraints(tableOrName: Table | string, exclusionConstraints: TableExclusion[]): Promise<void>;
    /**
     * Creates a new foreign key.
     */
    createForeignKey(tableOrName: Table | string, foreignKey: TableForeignKey): Promise<void>;
    /**
     * Creates a new foreign keys.
     */
    createForeignKeys(tableOrName: Table | string, foreignKeys: TableForeignKey[]): Promise<void>;
    /**
     * Drops a foreign key from the table.
     */
    dropForeignKey(tableOrName: Table | string, foreignKeyOrName: TableForeignKey | string): Promise<void>;
    /**
     * Drops a foreign keys from the table.
     */
    dropForeignKeys(tableOrName: Table | string, foreignKeys: TableForeignKey[]): Promise<void>;
    /**
     * Creates a new index.
     */
    createIndex(tableOrName: Table | string, index: TableIndex): Promise<void>;
    /**
     * Create a new view index.
     */
    createViewIndex(viewOrName: View | string, index: TableIndex): Promise<void>;
    /**
     * Creates a new indices
     */
    createIndices(tableOrName: Table | string, indices: TableIndex[]): Promise<void>;
    /**
     * Creates new view indices
     */
    createViewIndices(viewOrName: View | string, indices: TableIndex[]): Promise<void>;
    /**
     * Drops an index from the table.
     */
    dropIndex(tableOrName: Table | string, indexOrName: TableIndex | string): Promise<void>;
    /**
     * Drops an index from a view.
     */
    dropViewIndex(viewOrName: View | string, indexOrName: TableIndex | string): Promise<void>;
    /**
     * Drops an indices from the table.
     */
    dropIndices(tableOrName: Table | string, indices: TableIndex[]): Promise<void>;
    /**
     * Clears all table contents.
     * Note: this operation uses SQL's TRUNCATE query which cannot be reverted in transactions.
     */
    clearTable(tableName: string): Promise<void>;
    /**
     * Removes all tables from the currently connected database.
     */
    clearDatabase(): Promise<void>;
    protected loadViews(viewNames?: string[]): Promise<View[]>;
    /**
     * Loads all tables (with given names) from the database and creates a Table from them.
     */
    protected loadTables(tableNames?: string[]): Promise<Table[]>;
    /**
     * Builds create table sql.
     */
    protected createTableSql(table: Table, createForeignKeys?: boolean): Query;
    /**
     * Loads Postgres version.
     */
    protected getVersion(): Promise<string>;
    /**
     * Builds drop table sql.
     */
    protected dropTableSql(tableOrPath: Table | string): Query;
    protected createViewSql(view: View): Query;
    protected insertViewDefinitionSql(view: View): Promise<Query>;
    /**
     * Builds drop view sql.
     */
    protected dropViewSql(view: View): Query;
    /**
     * Builds remove view sql.
     */
    protected deleteViewDefinitionSql(view: View): Promise<Query>;
    /**
     * Drops ENUM type from given schemas.
     */
    protected dropEnumTypes(schemaNames: string): Promise<void>;
    /**
     * Checks if enum with the given name exist in the database.
     */
    protected hasEnumType(table: Table, column: TableColumn): Promise<boolean>;
    /**
     * Builds create ENUM type sql.
     */
    protected createEnumTypeSql(table: Table, column: TableColumn, enumName?: string): Query;
    /**
     * Builds create ENUM type sql.
     */
    protected dropEnumTypeSql(table: Table, column: TableColumn, enumName?: string): Query;
    /**
     * Builds create index sql.
     */
    protected createIndexSql(table: Table, index: TableIndex): Query;
    /**
     * Builds create view index sql.
     */
    protected createViewIndexSql(view: View, index: TableIndex): Query;
    /**
     * Builds drop index sql.
     */
    protected dropIndexSql(table: Table | View, indexOrName: TableIndex | string): Query;
    /**
     * Builds create primary key sql.
     */
    protected createPrimaryKeySql(table: Table, columnNames: string[], constraintName?: string): Query;
    /**
     * Builds drop primary key sql.
     */
    protected dropPrimaryKeySql(table: Table): Query;
    /**
     * Builds create unique constraint sql.
     */
    protected createUniqueConstraintSql(table: Table, uniqueConstraint: TableUnique): Query;
    /**
     * Builds drop unique constraint sql.
     */
    protected dropUniqueConstraintSql(table: Table, uniqueOrName: TableUnique | string): Query;
    /**
     * Builds create check constraint sql.
     */
    protected createCheckConstraintSql(table: Table, checkConstraint: TableCheck): Query;
    /**
     * Builds drop check constraint sql.
     */
    protected dropCheckConstraintSql(table: Table, checkOrName: TableCheck | string): Query;
    /**
     * Builds create exclusion constraint sql.
     */
    protected createExclusionConstraintSql(table: Table, exclusionConstraint: TableExclusion): Query;
    /**
     * Builds drop exclusion constraint sql.
     */
    protected dropExclusionConstraintSql(table: Table, exclusionOrName: TableExclusion | string): Query;
    /**
     * Builds create foreign key sql.
     */
    protected createForeignKeySql(table: Table, foreignKey: TableForeignKey): Query;
    /**
     * Builds drop foreign key sql.
     */
    protected dropForeignKeySql(table: Table, foreignKeyOrName: TableForeignKey | string): Query;
    /**
     * Builds sequence name from given table and column.
     */
    protected buildSequenceName(table: Table, columnOrName: TableColumn | string): string;
    protected buildSequencePath(table: Table, columnOrName: TableColumn | string): string;
    /**
     * Builds ENUM type name from given table and column.
     */
    protected buildEnumName(table: Table, column: TableColumn, withSchema?: boolean, disableEscape?: boolean, toOld?: boolean): string;
    protected getUserDefinedTypeName(table: Table, column: TableColumn): Promise<{
        schema: any;
        name: any;
    }>;
    /**
     * Escapes a given comment so it's safe to include in a query.
     */
    protected escapeComment(comment?: string): string;
    /**
     * Escapes given table or view path.
     */
    protected escapePath(target: Table | View | string): string;
    /**
     * Get the table name with table schema
     * Note: Without ' or "
     */
    protected getTableNameWithSchema(target: Table | string): Promise<string>;
    /**
     * Builds a query for create column.
     */
    protected buildCreateColumnSql(table: Table, column: TableColumn): string;
    /**
     * Checks if the PostgreSQL server has support for partitioned tables
     */
    protected hasSupportForPartitionedTables(): Promise<boolean>;
    /**
     * Change table comment.
     */
    changeTableComment(tableOrName: Table | string, newComment?: string): Promise<void>;
}

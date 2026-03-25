
import { QueryRunner } from "../../query-runner/QueryRunner";
import { TableColumn } from "../../schema-builder/table/TableColumn";
import { Table } from "../../schema-builder/table/Table";
import { TableForeignKey } from "../../schema-builder/table/TableForeignKey";
import { TableIndex } from "../../schema-builder/table/TableIndex";
import { View } from "../../schema-builder/view/View";
import { Query } from "../Query";
import { MysqlDriver } from "./MysqlDriver";
import { ReadStream } from "../../platform/PlatformTools";
import { TableUnique } from "../../schema-builder/table/TableUnique";
import { BaseQueryRunner } from "../../query-runner/BaseQueryRunner";
import { TableCheck } from "../../schema-builder/table/TableCheck";
import { IsolationLevel } from "../types/IsolationLevel";
import { TableExclusion } from "../../schema-builder/table/TableExclusion";
import { ReplicationMode } from "../types/ReplicationMode";
/**
 * Runs queries on a single mysql database connection.
 */
export declare class MysqlQueryRunner extends BaseQueryRunner implements QueryRunner {
    /**
     * Database driver used by connection.
     */
    driver: MysqlDriver;
    /**
     * Promise used to obtain a database connection from a pool for a first time.
     */
    protected databaseConnectionPromise: Promise<any>;
    constructor(driver: MysqlDriver, mode: ReplicationMode);
    /**
     * Creates/uses database connection from the connection pool to perform further operations.
     * Returns obtained database connection.
     */
    connect(): Promise<any>;
    /**
     * Releases used database connection.
     * You cannot use query runner methods once its released.
     */
    release(): Promise<void>;
    /**
     * Starts transaction on the current connection.
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
     * Executes a raw SQL query.
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
    hasColumn(tableOrName: Table | string, column: TableColumn | string): Promise<boolean>;
    /**
     * Creates a new database.
     */
    createDatabase(database: string, ifNotExist?: boolean): Promise<void>;
    /**
     * Drops database.
     */
    dropDatabase(database: string, ifExist?: boolean): Promise<void>;
    /**
     * Creates a new table schema.
     */
    createSchema(schemaPath: string, ifNotExist?: boolean): Promise<void>;
    /**
     * Drops table schema.
     */
    dropSchema(schemaPath: string, ifExist?: boolean): Promise<void>;
    /**
     * Creates a new table.
     */
    createTable(table: Table, ifNotExist?: boolean, createForeignKeys?: boolean): Promise<void>;
    /**
     * Drop the table.
     */
    dropTable(target: Table | string, ifExist?: boolean, dropForeignKeys?: boolean): Promise<void>;
    /**
     * Creates a new view.
     */
    createView(view: View, syncWithMetadata?: boolean): Promise<void>;
    /**
     * Drops the view.
     */
    dropView(target: View | string): Promise<void>;
    /**
     * Renames a table.
     */
    renameTable(oldTableOrName: Table | string, newTableName: string): Promise<void>;
    /**
     * Change table comment.
     */
    changeTableComment(tableOrName: Table | string, newComment?: string): Promise<void>;
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
    changeColumn(tableOrName: Table | string, oldColumnOrName: TableColumn | string, newColumn: TableColumn): Promise<void>;
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
    createPrimaryKey(tableOrName: Table | string, columnNames: string[]): Promise<void>;
    /**
     * Updates composite primary keys.
     */
    updatePrimaryKeys(tableOrName: Table | string, columns: TableColumn[]): Promise<void>;
    /**
     * Drops a primary key.
     */
    dropPrimaryKey(tableOrName: Table | string): Promise<void>;
    /**
     * Creates a new unique constraint.
     */
    createUniqueConstraint(tableOrName: Table | string, uniqueConstraint: TableUnique): Promise<void>;
    /**
     * Creates a new unique constraints.
     */
    createUniqueConstraints(tableOrName: Table | string, uniqueConstraints: TableUnique[]): Promise<void>;
    /**
     * Drops an unique constraint.
     */
    dropUniqueConstraint(tableOrName: Table | string, uniqueOrName: TableUnique | string): Promise<void>;
    /**
     * Drops an unique constraints.
     */
    dropUniqueConstraints(tableOrName: Table | string, uniqueConstraints: TableUnique[]): Promise<void>;
    /**
     * Creates a new check constraint.
     */
    createCheckConstraint(tableOrName: Table | string, checkConstraint: TableCheck): Promise<void>;
    /**
     * Creates a new check constraints.
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
     * Creates a new exclusion constraint.
     */
    createExclusionConstraint(tableOrName: Table | string, exclusionConstraint: TableExclusion): Promise<void>;
    /**
     * Creates a new exclusion constraints.
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
     * Drops a foreign key.
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
     * Creates a new indices
     */
    createIndices(tableOrName: Table | string, indices: TableIndex[]): Promise<void>;
    /**
     * Drops an index.
     */
    dropIndex(tableOrName: Table | string, indexOrName: TableIndex | string): Promise<void>;
    /**
     * Drops an indices from the table.
     */
    dropIndices(tableOrName: Table | string, indices: TableIndex[]): Promise<void>;
    /**
     * Clears all table contents.
     * Note: this operation uses SQL's TRUNCATE query which cannot be reverted in transactions.
     */
    clearTable(tableOrName: Table | string): Promise<void>;
    /**
     * Removes all tables from the currently connected database.
     * Be careful using this method and avoid using it in production or migrations
     * (because it can clear all your database).
     */
    clearDatabase(database?: string): Promise<void>;
    protected loadViews(viewNames?: string[]): Promise<View[]>;
    /**
     * Loads all tables (with given names) from the database and creates a Table from them.
     */
    protected loadTables(tableNames?: string[]): Promise<Table[]>;
    /**
     * Builds create table sql
     */
    protected createTableSql(table: Table, createForeignKeys?: boolean): Query;
    /**
     * Builds drop table sql
     */
    protected dropTableSql(tableOrName: Table | string): Query;
    protected createViewSql(view: View): Query;
    protected insertViewDefinitionSql(view: View): Promise<Query>;
    /**
     * Builds drop view sql.
     */
    protected dropViewSql(viewOrPath: View | string): Query;
    /**
     * Builds remove view sql.
     */
    protected deleteViewDefinitionSql(viewOrPath: View | string): Promise<Query>;
    /**
     * Builds create index sql.
     */
    protected createIndexSql(table: Table, index: TableIndex): Query;
    /**
     * Builds drop index sql.
     */
    protected dropIndexSql(table: Table, indexOrName: TableIndex | string): Query;
    /**
     * Builds create primary key sql.
     */
    protected createPrimaryKeySql(table: Table, columnNames: string[]): Query;
    /**
     * Builds drop primary key sql.
     */
    protected dropPrimaryKeySql(table: Table): Query;
    /**
     * Builds create foreign key sql.
     */
    protected createForeignKeySql(table: Table, foreignKey: TableForeignKey): Query;
    /**
     * Builds drop foreign key sql.
     */
    protected dropForeignKeySql(table: Table, foreignKeyOrName: TableForeignKey | string): Query;
    /**
     * Escapes a given comment so it's safe to include in a query.
     */
    protected escapeComment(comment?: string): string;
    /**
     * Escapes given table or view path.
     */
    protected escapePath(target: Table | View | string): string;
    /**
     * Builds a part of query to create/change a column.
     */
    protected buildCreateColumnSql(column: TableColumn, skipPrimary: boolean, skipName?: boolean): string;
    protected getVersion(): Promise<string>;
    /**
     * Checks if column display width is by default.
     */
    protected isDefaultColumnWidth(table: Table, column: TableColumn, width: number): boolean;
}

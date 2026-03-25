import { QueryRunner } from "../query-runner/QueryRunner";
import { ColumnMetadata } from "../metadata/ColumnMetadata";
import { EntityMetadata } from "../metadata/EntityMetadata";
import { DataSource } from "../data-source/DataSource";
import { SchemaBuilder } from "./SchemaBuilder";
import { SqlInMemory } from "../driver/SqlInMemory";
import { TableColumnOptions } from "./options/TableColumnOptions";
/**
 * Creates complete tables schemas in the database based on the entity metadatas.
 *
 * Steps how schema is being built:
 * 1. load list of all tables with complete column and keys information from the db
 * 2. drop all (old) foreign keys that exist in the table, but does not exist in the metadata
 * 3. create new tables that does not exist in the db, but exist in the metadata
 * 4. drop all columns exist (left old) in the db table, but does not exist in the metadata
 * 5. add columns from metadata which does not exist in the table
 * 6. update all exist columns which metadata has changed
 * 7. update primary keys - update old and create new primary key from changed columns
 * 8. create foreign keys which does not exist in the table yet
 * 9. create indices which are missing in db yet, and drops indices which exist in the db, but does not exist in the metadata anymore
 */
export declare class RdbmsSchemaBuilder implements SchemaBuilder {
    protected connection: DataSource;
    readonly "@instanceof": symbol;
    /**
     * Used to execute schema creation queries in a single connection.
     */
    protected queryRunner: QueryRunner;
    private currentDatabase?;
    private currentSchema?;
    constructor(connection: DataSource);
    /**
     * Creates complete schemas for the given entity metadatas.
     */
    build(): Promise<void>;
    /**
     * Create the typeorm_metadata table if necessary.
     */
    createMetadataTableIfNecessary(queryRunner: QueryRunner): Promise<void>;
    /**
     * Returns sql queries to be executed by schema builder.
     */
    log(): Promise<SqlInMemory>;
    /**
     * Returns only entities that should be synced in the database.
     */
    protected get entityToSyncMetadatas(): EntityMetadata[];
    /**
     * Returns only entities that should be synced in the database.
     */
    protected get viewEntityToSyncMetadatas(): EntityMetadata[];
    /**
     * Checks if there are at least one generated column.
     */
    protected hasGeneratedColumns(): boolean;
    /**
     * Executes schema sync operations in a proper order.
     * Order of operations matter here.
     */
    protected executeSchemaSyncOperationsInProperOrder(): Promise<void>;
    private getTablePath;
    /**
     * Drops all (old) foreign keys that exist in the tables, but do not exist in the entity metadata.
     */
    protected dropOldForeignKeys(): Promise<void>;
    /**
     * Rename tables
     */
    protected renameTables(): Promise<void>;
    /**
     * Renames columns.
     * Works if only one column per table was changed.
     * Changes only column name. If something besides name was changed, these changes will be ignored.
     */
    protected renameColumns(): Promise<void>;
    protected dropOldIndices(): Promise<void>;
    protected dropOldChecks(): Promise<void>;
    protected dropCompositeUniqueConstraints(): Promise<void>;
    protected dropOldExclusions(): Promise<void>;
    /**
     * change table comment
     */
    protected changeTableComment(): Promise<void>;
    /**
     * Creates tables that do not exist in the database yet.
     * New tables are created without foreign and primary keys.
     * Primary key only can be created in conclusion with auto generated column.
     */
    protected createNewTables(): Promise<void>;
    protected createViews(): Promise<void>;
    protected dropOldViews(): Promise<void>;
    /**
     * Drops all columns that exist in the table, but does not exist in the metadata (left old).
     * We drop their keys too, since it should be safe.
     */
    protected dropRemovedColumns(): Promise<void>;
    /**
     * Adds columns from metadata which does not exist in the table.
     * Columns are created without keys.
     */
    protected addNewColumns(): Promise<void>;
    /**
     * Updates composite primary keys.
     */
    protected updatePrimaryKeys(): Promise<void>;
    /**
     * Update all exist columns which metadata has changed.
     * Still don't create keys. Also we don't touch foreign keys of the changed columns.
     */
    protected updateExistColumns(): Promise<void>;
    /**
     * Creates composite indices which are missing in db yet.
     */
    protected createNewIndices(): Promise<void>;
    /**
     * Creates indices for materialized views.
     */
    protected createNewViewIndices(): Promise<void>;
    protected createNewChecks(): Promise<void>;
    /**
     * Creates composite uniques which are missing in db yet.
     */
    protected createCompositeUniqueConstraints(): Promise<void>;
    /**
     * Creates exclusions which are missing in db yet.
     */
    protected createNewExclusions(): Promise<void>;
    /**
     * Creates foreign keys which does not exist in the table yet.
     */
    protected createForeignKeys(): Promise<void>;
    /**
     * Drops all foreign keys where given column of the given table is being used.
     */
    protected dropColumnReferencedForeignKeys(tablePath: string, columnName: string): Promise<void>;
    /**
     * Drops all composite indices, related to given column.
     */
    protected dropColumnCompositeIndices(tablePath: string, columnName: string): Promise<void>;
    /**
     * Drops all composite uniques, related to given column.
     */
    protected dropColumnCompositeUniques(tablePath: string, columnName: string): Promise<void>;
    /**
     * Creates new columns from the given column metadatas.
     */
    protected metadataColumnsToTableColumnOptions(columns: ColumnMetadata[]): TableColumnOptions[];
    /**
     * Creates typeorm service table for storing user defined Views and generate columns.
     */
    protected createTypeormMetadataTable(queryRunner: QueryRunner): Promise<void>;
}

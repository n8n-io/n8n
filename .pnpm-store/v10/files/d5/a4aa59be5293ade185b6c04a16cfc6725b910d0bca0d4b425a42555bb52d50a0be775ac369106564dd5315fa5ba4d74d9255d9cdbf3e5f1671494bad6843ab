"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RdbmsSchemaBuilder = void 0;
const Table_1 = require("./table/Table");
const TableColumn_1 = require("./table/TableColumn");
const TableForeignKey_1 = require("./table/TableForeignKey");
const TableIndex_1 = require("./table/TableIndex");
const TableUtils_1 = require("./util/TableUtils");
const TableUnique_1 = require("./table/TableUnique");
const TableCheck_1 = require("./table/TableCheck");
const TableExclusion_1 = require("./table/TableExclusion");
const View_1 = require("./view/View");
const ViewUtils_1 = require("./util/ViewUtils");
const DriverUtils_1 = require("../driver/DriverUtils");
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
class RdbmsSchemaBuilder {
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    constructor(connection) {
        this.connection = connection;
        this["@instanceof"] = Symbol.for("RdbmsSchemaBuilder");
    }
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    /**
     * Creates complete schemas for the given entity metadatas.
     */
    async build() {
        this.queryRunner = this.connection.createQueryRunner();
        // this.connection.driver.database || this.currentDatabase;
        this.currentDatabase = this.connection.driver.database;
        this.currentSchema = this.connection.driver.schema;
        const isUsingTransactions = this.connection.options.migrationsTransactionMode !== "none";
        await this.queryRunner.beforeMigration();
        if (isUsingTransactions) {
            await this.queryRunner.startTransaction();
        }
        try {
            await this.createMetadataTableIfNecessary(this.queryRunner);
            // Flush the queryrunner table & view cache
            const tablePaths = this.entityToSyncMetadatas.map((metadata) => this.getTablePath(metadata));
            const viewPaths = this.viewEntityToSyncMetadatas.map((metadata) => this.getTablePath(metadata));
            await this.queryRunner.getTables(tablePaths);
            await this.queryRunner.getViews(viewPaths);
            await this.executeSchemaSyncOperationsInProperOrder();
            // if cache is enabled then perform cache-synchronization as well
            if (this.connection.queryResultCache)
                await this.connection.queryResultCache.synchronize(this.queryRunner);
            if (isUsingTransactions) {
                await this.queryRunner.commitTransaction();
            }
        }
        catch (error) {
            try {
                // we throw original error even if rollback thrown an error
                if (isUsingTransactions) {
                    await this.queryRunner.rollbackTransaction();
                }
            }
            catch (rollbackError) { }
            throw error;
        }
        finally {
            await this.queryRunner.afterMigration();
            await this.queryRunner.release();
        }
    }
    /**
     * Create the typeorm_metadata table if necessary.
     */
    async createMetadataTableIfNecessary(queryRunner) {
        if (this.viewEntityToSyncMetadatas.length > 0 ||
            this.hasGeneratedColumns()) {
            await this.createTypeormMetadataTable(queryRunner);
        }
    }
    /**
     * Returns sql queries to be executed by schema builder.
     */
    async log() {
        this.queryRunner = this.connection.createQueryRunner();
        try {
            // Flush the queryrunner table & view cache
            const tablePaths = this.entityToSyncMetadatas.map((metadata) => this.getTablePath(metadata));
            const viewPaths = this.viewEntityToSyncMetadatas.map((metadata) => this.getTablePath(metadata));
            await this.queryRunner.getTables(tablePaths);
            await this.queryRunner.getViews(viewPaths);
            this.queryRunner.enableSqlMemory();
            await this.executeSchemaSyncOperationsInProperOrder();
            // if cache is enabled then perform cache-synchronization as well
            if (this.connection.queryResultCache)
                // todo: check this functionality
                await this.connection.queryResultCache.synchronize(this.queryRunner);
            return this.queryRunner.getMemorySql();
        }
        finally {
            // its important to disable this mode despite the fact we are release query builder
            // because there exist drivers which reuse same query runner. Also its important to disable
            // sql memory after call of getMemorySql() method because last one flushes sql memory.
            this.queryRunner.disableSqlMemory();
            await this.queryRunner.release();
        }
    }
    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------
    /**
     * Returns only entities that should be synced in the database.
     */
    get entityToSyncMetadatas() {
        return this.connection.entityMetadatas.filter((metadata) => metadata.synchronize &&
            metadata.tableType !== "entity-child" &&
            metadata.tableType !== "view");
    }
    /**
     * Returns only entities that should be synced in the database.
     */
    get viewEntityToSyncMetadatas() {
        return (this.connection.entityMetadatas
            .filter((metadata) => metadata.tableType === "view" && metadata.synchronize)
            // sort views in creation order by dependencies
            .sort(ViewUtils_1.ViewUtils.viewMetadataCmp));
    }
    /**
     * Checks if there are at least one generated column.
     */
    hasGeneratedColumns() {
        return this.connection.entityMetadatas.some((entityMetadata) => {
            return entityMetadata.columns.some((column) => column.generatedType);
        });
    }
    /**
     * Executes schema sync operations in a proper order.
     * Order of operations matter here.
     */
    async executeSchemaSyncOperationsInProperOrder() {
        await this.dropOldViews();
        await this.dropOldForeignKeys();
        await this.dropOldIndices();
        await this.dropOldChecks();
        await this.dropOldExclusions();
        await this.dropCompositeUniqueConstraints();
        // await this.renameTables();
        await this.renameColumns();
        await this.changeTableComment();
        await this.createNewTables();
        await this.dropRemovedColumns();
        await this.addNewColumns();
        await this.updatePrimaryKeys();
        await this.updateExistColumns();
        await this.createNewIndices();
        await this.createNewChecks();
        await this.createNewExclusions();
        await this.createCompositeUniqueConstraints();
        await this.createForeignKeys();
        await this.createViews();
        await this.createNewViewIndices();
    }
    getTablePath(target) {
        const parsed = this.connection.driver.parseTableName(target);
        return this.connection.driver.buildTableName(parsed.tableName, parsed.schema || this.currentSchema, parsed.database || this.currentDatabase);
    }
    /**
     * Drops all (old) foreign keys that exist in the tables, but do not exist in the entity metadata.
     */
    async dropOldForeignKeys() {
        for (const metadata of this.entityToSyncMetadatas) {
            const table = this.queryRunner.loadedTables.find((table) => this.getTablePath(table) === this.getTablePath(metadata));
            if (!table)
                continue;
            // find foreign keys that exist in the schemas but does not exist in the entity metadata
            const tableForeignKeysToDrop = table.foreignKeys.filter((tableForeignKey) => {
                const metadataFK = metadata.foreignKeys.find((metadataForeignKey) => tableForeignKey.name === metadataForeignKey.name &&
                    this.getTablePath(tableForeignKey) ===
                        this.getTablePath(metadataForeignKey.referencedEntityMetadata));
                return (!metadataFK ||
                    (metadataFK.onDelete &&
                        metadataFK.onDelete !== tableForeignKey.onDelete) ||
                    (metadataFK.onUpdate &&
                        metadataFK.onUpdate !== tableForeignKey.onUpdate));
            });
            if (tableForeignKeysToDrop.length === 0)
                continue;
            this.connection.logger.logSchemaBuild(`dropping old foreign keys of ${table.name}: ${tableForeignKeysToDrop
                .map((dbForeignKey) => dbForeignKey.name)
                .join(", ")}`);
            // drop foreign keys from the database
            await this.queryRunner.dropForeignKeys(table, tableForeignKeysToDrop);
        }
    }
    /**
     * Rename tables
     */
    async renameTables() {
        // for (const metadata of this.entityToSyncMetadatas) {
        //     const table = this.queryRunner.loadedTables.find(table => this.getTablePath(table) === this.getTablePath(metadata));
        // }
    }
    /**
     * Renames columns.
     * Works if only one column per table was changed.
     * Changes only column name. If something besides name was changed, these changes will be ignored.
     */
    async renameColumns() {
        for (const metadata of this.entityToSyncMetadatas) {
            const table = this.queryRunner.loadedTables.find((table) => this.getTablePath(table) === this.getTablePath(metadata));
            if (!table)
                continue;
            if (metadata.columns.length !== table.columns.length)
                continue;
            const renamedMetadataColumns = metadata.columns
                .filter((c) => !c.isVirtualProperty)
                .filter((column) => {
                return !table.columns.find((tableColumn) => {
                    return (tableColumn.name === column.databaseName &&
                        tableColumn.type ===
                            this.connection.driver.normalizeType(column) &&
                        tableColumn.isNullable === column.isNullable &&
                        tableColumn.isUnique ===
                            this.connection.driver.normalizeIsUnique(column));
                });
            });
            if (renamedMetadataColumns.length === 0 ||
                renamedMetadataColumns.length > 1)
                continue;
            const renamedTableColumns = table.columns.filter((tableColumn) => {
                return !metadata.columns.find((column) => {
                    return (!column.isVirtualProperty &&
                        column.databaseName === tableColumn.name &&
                        this.connection.driver.normalizeType(column) ===
                            tableColumn.type &&
                        column.isNullable === tableColumn.isNullable &&
                        this.connection.driver.normalizeIsUnique(column) ===
                            tableColumn.isUnique);
                });
            });
            if (renamedTableColumns.length === 0 ||
                renamedTableColumns.length > 1)
                continue;
            const renamedColumn = renamedTableColumns[0].clone();
            renamedColumn.name = renamedMetadataColumns[0].databaseName;
            this.connection.logger.logSchemaBuild(`renaming column "${renamedTableColumns[0].name}" in "${table.name}" to "${renamedColumn.name}"`);
            await this.queryRunner.renameColumn(table, renamedTableColumns[0], renamedColumn);
        }
    }
    async dropOldIndices() {
        for (const metadata of this.entityToSyncMetadatas) {
            const table = this.queryRunner.loadedTables.find((table) => this.getTablePath(table) === this.getTablePath(metadata));
            if (!table)
                continue;
            const dropQueries = table.indices
                .filter((tableIndex) => {
                const indexMetadata = metadata.indices.find((index) => index.name === tableIndex.name);
                if (indexMetadata) {
                    if (indexMetadata.synchronize === false)
                        return false;
                    if (indexMetadata.isUnique !== tableIndex.isUnique)
                        return true;
                    if (indexMetadata.isSpatial !== tableIndex.isSpatial)
                        return true;
                    if (this.connection.driver.isFullTextColumnTypeSupported() &&
                        indexMetadata.isFulltext !== tableIndex.isFulltext)
                        return true;
                    if (indexMetadata.columns.length !==
                        tableIndex.columnNames.length)
                        return true;
                    return !indexMetadata.columns.every((column) => tableIndex.columnNames.indexOf(column.databaseName) !== -1);
                }
                return true;
            })
                .map(async (tableIndex) => {
                this.connection.logger.logSchemaBuild(`dropping an index: "${tableIndex.name}" from table ${table.name}`);
                await this.queryRunner.dropIndex(table, tableIndex);
            });
            await Promise.all(dropQueries);
        }
        if (this.connection.options.type === "postgres") {
            const postgresQueryRunner = this.queryRunner;
            for (const metadata of this.viewEntityToSyncMetadatas) {
                const view = this.queryRunner.loadedViews.find((view) => this.getTablePath(view) === this.getTablePath(metadata));
                if (!view)
                    continue;
                const dropQueries = view.indices
                    .filter((tableIndex) => {
                    const indexMetadata = metadata.indices.find((index) => index.name === tableIndex.name);
                    if (indexMetadata) {
                        if (indexMetadata.synchronize === false)
                            return false;
                        if (indexMetadata.isUnique !== tableIndex.isUnique)
                            return true;
                        if (indexMetadata.isSpatial !== tableIndex.isSpatial)
                            return true;
                        if (this.connection.driver.isFullTextColumnTypeSupported() &&
                            indexMetadata.isFulltext !==
                                tableIndex.isFulltext)
                            return true;
                        if (indexMetadata.columns.length !==
                            tableIndex.columnNames.length)
                            return true;
                        return !indexMetadata.columns.every((column) => tableIndex.columnNames.indexOf(column.databaseName) !== -1);
                    }
                    return true;
                })
                    .map(async (tableIndex) => {
                    this.connection.logger.logSchemaBuild(`dropping an index: "${tableIndex.name}" from view ${view.name}`);
                    await postgresQueryRunner.dropViewIndex(view, tableIndex);
                });
                await Promise.all(dropQueries);
            }
        }
    }
    async dropOldChecks() {
        // Mysql does not support check constraints
        if (DriverUtils_1.DriverUtils.isMySQLFamily(this.connection.driver))
            return;
        for (const metadata of this.entityToSyncMetadatas) {
            const table = this.queryRunner.loadedTables.find((table) => this.getTablePath(table) === this.getTablePath(metadata));
            if (!table)
                continue;
            const oldChecks = table.checks.filter((tableCheck) => {
                return !metadata.checks.find((checkMetadata) => checkMetadata.name === tableCheck.name);
            });
            if (oldChecks.length === 0)
                continue;
            this.connection.logger.logSchemaBuild(`dropping old check constraint: ${oldChecks
                .map((check) => `"${check.name}"`)
                .join(", ")} from table "${table.name}"`);
            await this.queryRunner.dropCheckConstraints(table, oldChecks);
        }
    }
    async dropCompositeUniqueConstraints() {
        for (const metadata of this.entityToSyncMetadatas) {
            const table = this.queryRunner.loadedTables.find((table) => this.getTablePath(table) === this.getTablePath(metadata));
            if (!table)
                continue;
            const compositeUniques = table.uniques.filter((tableUnique) => {
                return (tableUnique.columnNames.length > 1 &&
                    !metadata.uniques.find((uniqueMetadata) => uniqueMetadata.name === tableUnique.name));
            });
            if (compositeUniques.length === 0)
                continue;
            this.connection.logger.logSchemaBuild(`dropping old unique constraint: ${compositeUniques
                .map((unique) => `"${unique.name}"`)
                .join(", ")} from table "${table.name}"`);
            await this.queryRunner.dropUniqueConstraints(table, compositeUniques);
        }
    }
    async dropOldExclusions() {
        // Only PostgreSQL supports exclusion constraints
        if (!(this.connection.driver.options.type === "postgres"))
            return;
        for (const metadata of this.entityToSyncMetadatas) {
            const table = this.queryRunner.loadedTables.find((table) => this.getTablePath(table) === this.getTablePath(metadata));
            if (!table)
                continue;
            const oldExclusions = table.exclusions.filter((tableExclusion) => {
                return !metadata.exclusions.find((exclusionMetadata) => exclusionMetadata.name === tableExclusion.name);
            });
            if (oldExclusions.length === 0)
                continue;
            this.connection.logger.logSchemaBuild(`dropping old exclusion constraint: ${oldExclusions
                .map((exclusion) => `"${exclusion.name}"`)
                .join(", ")} from table "${table.name}"`);
            await this.queryRunner.dropExclusionConstraints(table, oldExclusions);
        }
    }
    /**
     * change table comment
     */
    async changeTableComment() {
        for (const metadata of this.entityToSyncMetadatas) {
            const table = this.queryRunner.loadedTables.find((table) => this.getTablePath(table) === this.getTablePath(metadata));
            if (!table)
                continue;
            if (DriverUtils_1.DriverUtils.isMySQLFamily(this.connection.driver) ||
                this.connection.driver.options.type === "postgres") {
                const newComment = metadata.comment;
                await this.queryRunner.changeTableComment(table, newComment);
            }
        }
    }
    /**
     * Creates tables that do not exist in the database yet.
     * New tables are created without foreign and primary keys.
     * Primary key only can be created in conclusion with auto generated column.
     */
    async createNewTables() {
        for (const metadata of this.entityToSyncMetadatas) {
            // check if table does not exist yet
            const existTable = this.queryRunner.loadedTables.find((table) => this.getTablePath(table) === this.getTablePath(metadata));
            if (existTable)
                continue;
            this.connection.logger.logSchemaBuild(`creating a new table: ${this.getTablePath(metadata)}`);
            // create a new table and sync it in the database
            const table = Table_1.Table.create(metadata, this.connection.driver);
            await this.queryRunner.createTable(table, false, false);
            this.queryRunner.loadedTables.push(table);
        }
    }
    async createViews() {
        for (const metadata of this.viewEntityToSyncMetadatas) {
            // check if view does not exist yet
            const existView = this.queryRunner.loadedViews.find((view) => {
                const viewExpression = typeof view.expression === "string"
                    ? view.expression.trim()
                    : view.expression(this.connection).getQuery();
                const metadataExpression = typeof metadata.expression === "string"
                    ? metadata.expression.trim()
                    : metadata.expression(this.connection).getQuery();
                return (this.getTablePath(view) === this.getTablePath(metadata) &&
                    viewExpression === metadataExpression);
            });
            if (existView)
                continue;
            this.connection.logger.logSchemaBuild(`creating a new view: ${this.getTablePath(metadata)}`);
            // create a new view and sync it in the database
            const view = View_1.View.create(metadata, this.connection.driver);
            await this.queryRunner.createView(view, true);
            this.queryRunner.loadedViews.push(view);
        }
    }
    async dropOldViews() {
        const droppedViews = [];
        const viewEntityToSyncMetadatas = this.viewEntityToSyncMetadatas;
        // BuIld lookup cache for finding views metadata
        const viewToMetadata = new Map();
        for (const view of this.queryRunner.loadedViews) {
            const viewMetadata = viewEntityToSyncMetadatas.find((metadata) => {
                return this.getTablePath(view) === this.getTablePath(metadata);
            });
            if (viewMetadata) {
                viewToMetadata.set(view, viewMetadata);
            }
        }
        // Gather all changed view, that need a drop
        for (const view of this.queryRunner.loadedViews) {
            const viewMetadata = viewToMetadata.get(view);
            if (!viewMetadata) {
                continue;
            }
            const viewExpression = typeof view.expression === "string"
                ? view.expression.trim()
                : view.expression(this.connection).getQuery();
            const metadataExpression = typeof viewMetadata.expression === "string"
                ? viewMetadata.expression.trim()
                : viewMetadata.expression(this.connection).getQuery();
            if (viewExpression === metadataExpression)
                continue;
            this.connection.logger.logSchemaBuild(`dropping an old view: ${view.name}`);
            // Collect view to be dropped
            droppedViews.push(view);
        }
        // Helper function that for a given view, will recursively return list of the view and all views that depend on it
        const viewDependencyChain = (view) => {
            // Get the view metadata
            const viewMetadata = viewToMetadata.get(view);
            let viewWithDependencies = [view];
            // If no metadata is known for the view, simply return the view itself
            if (!viewMetadata) {
                return viewWithDependencies;
            }
            // Iterate over all known views
            for (const [currentView, currentMetadata,] of viewToMetadata.entries()) {
                // Ignore self reference
                if (currentView === view) {
                    continue;
                }
                // If the currently iterated view depends on the passed in view
                if (currentMetadata.dependsOn &&
                    (currentMetadata.dependsOn.has(viewMetadata.target) ||
                        currentMetadata.dependsOn.has(viewMetadata.name))) {
                    // Recursively add currently iterate view and its dependents
                    viewWithDependencies = viewWithDependencies.concat(viewDependencyChain(currentView));
                }
            }
            // Return all collected views
            return viewWithDependencies;
        };
        // Collect final list of views to be dropped in a Set so there are no duplicates
        const droppedViewsWithDependencies = new Set(
        // Collect all dropped views, and their dependencies
        droppedViews
            .map((view) => viewDependencyChain(view))
            // Flattened to single Array ( can be replaced with flatMap, once supported)
            .reduce((all, segment) => {
            return all.concat(segment);
        }, [])
            // Sort the views to be dropped in creation order
            .sort((a, b) => {
            return ViewUtils_1.ViewUtils.viewMetadataCmp(viewToMetadata.get(a), viewToMetadata.get(b));
        })
            // reverse order to get drop order
            .reverse());
        // Finally emit all drop views
        for (const view of droppedViewsWithDependencies) {
            await this.queryRunner.dropView(view);
        }
        this.queryRunner.loadedViews = this.queryRunner.loadedViews.filter((view) => !droppedViewsWithDependencies.has(view));
    }
    /**
     * Drops all columns that exist in the table, but does not exist in the metadata (left old).
     * We drop their keys too, since it should be safe.
     */
    async dropRemovedColumns() {
        for (const metadata of this.entityToSyncMetadatas) {
            const table = this.queryRunner.loadedTables.find((table) => this.getTablePath(table) === this.getTablePath(metadata));
            if (!table)
                continue;
            // find columns that exist in the database but does not exist in the metadata
            const droppedTableColumns = table.columns.filter((tableColumn) => {
                return !metadata.columns.find((columnMetadata) => columnMetadata.isVirtualProperty ||
                    columnMetadata.databaseName === tableColumn.name);
            });
            if (droppedTableColumns.length === 0)
                continue;
            this.connection.logger.logSchemaBuild(`columns dropped in ${table.name}: ` +
                droppedTableColumns.map((column) => column.name).join(", "));
            // drop columns from the database
            await this.queryRunner.dropColumns(table, droppedTableColumns);
        }
    }
    /**
     * Adds columns from metadata which does not exist in the table.
     * Columns are created without keys.
     */
    async addNewColumns() {
        for (const metadata of this.entityToSyncMetadatas) {
            const table = this.queryRunner.loadedTables.find((table) => this.getTablePath(table) === this.getTablePath(metadata));
            if (!table)
                continue;
            // find which columns are new
            const newColumnMetadatas = metadata.columns.filter((columnMetadata) => {
                return (!columnMetadata.isVirtualProperty &&
                    !table.columns.find((tableColumn) => tableColumn.name ===
                        columnMetadata.databaseName));
            });
            if (newColumnMetadatas.length === 0)
                continue;
            // create columns in the database
            const newTableColumnOptions = this.metadataColumnsToTableColumnOptions(newColumnMetadatas);
            const newTableColumns = newTableColumnOptions.map((option) => new TableColumn_1.TableColumn(option));
            if (newTableColumns.length === 0)
                continue;
            this.connection.logger.logSchemaBuild(`new columns added: ` +
                newColumnMetadatas
                    .map((column) => column.databaseName)
                    .join(", "));
            await this.queryRunner.addColumns(table, newTableColumns);
        }
    }
    /**
     * Updates composite primary keys.
     */
    async updatePrimaryKeys() {
        for (const metadata of this.entityToSyncMetadatas) {
            const table = this.queryRunner.loadedTables.find((table) => this.getTablePath(table) === this.getTablePath(metadata));
            if (!table)
                continue;
            const primaryMetadataColumns = metadata.columns.filter((column) => column.isPrimary);
            const primaryTableColumns = table.columns.filter((column) => column.isPrimary);
            if (primaryTableColumns.length !== primaryMetadataColumns.length &&
                primaryMetadataColumns.length > 1) {
                const changedPrimaryColumns = primaryMetadataColumns.map((primaryMetadataColumn) => {
                    return new TableColumn_1.TableColumn(TableUtils_1.TableUtils.createTableColumnOptions(primaryMetadataColumn, this.connection.driver));
                });
                await this.queryRunner.updatePrimaryKeys(table, changedPrimaryColumns);
            }
        }
    }
    /**
     * Update all exist columns which metadata has changed.
     * Still don't create keys. Also we don't touch foreign keys of the changed columns.
     */
    async updateExistColumns() {
        for (const metadata of this.entityToSyncMetadatas) {
            const table = this.queryRunner.loadedTables.find((table) => this.getTablePath(table) === this.getTablePath(metadata));
            if (!table)
                continue;
            const changedColumns = this.connection.driver.findChangedColumns(table.columns, metadata.columns);
            if (changedColumns.length === 0)
                continue;
            // drop all foreign keys that point to this column
            for (const changedColumn of changedColumns) {
                await this.dropColumnReferencedForeignKeys(this.getTablePath(metadata), changedColumn.databaseName);
            }
            // drop all composite indices related to this column
            for (const changedColumn of changedColumns) {
                await this.dropColumnCompositeIndices(this.getTablePath(metadata), changedColumn.databaseName);
            }
            // drop all composite uniques related to this column
            // Mysql does not support unique constraints.
            if (!DriverUtils_1.DriverUtils.isMySQLFamily(this.connection.driver)) {
                for (const changedColumn of changedColumns) {
                    await this.dropColumnCompositeUniques(this.getTablePath(metadata), changedColumn.databaseName);
                }
            }
            // generate a map of new/old columns
            const newAndOldTableColumns = changedColumns.map((changedColumn) => {
                const oldTableColumn = table.columns.find((column) => column.name === changedColumn.databaseName);
                const newTableColumnOptions = TableUtils_1.TableUtils.createTableColumnOptions(changedColumn, this.connection.driver);
                const newTableColumn = new TableColumn_1.TableColumn(newTableColumnOptions);
                return {
                    oldColumn: oldTableColumn,
                    newColumn: newTableColumn,
                };
            });
            if (newAndOldTableColumns.length === 0)
                continue;
            this.connection.logger.logSchemaBuild(`columns changed in "${table.name}". updating: ` +
                changedColumns
                    .map((column) => column.databaseName)
                    .join(", "));
            await this.queryRunner.changeColumns(table, newAndOldTableColumns);
        }
    }
    /**
     * Creates composite indices which are missing in db yet.
     */
    async createNewIndices() {
        for (const metadata of this.entityToSyncMetadatas) {
            const table = this.queryRunner.loadedTables.find((table) => this.getTablePath(table) === this.getTablePath(metadata));
            if (!table)
                continue;
            const newIndices = metadata.indices
                .filter((indexMetadata) => !table.indices.find((tableIndex) => tableIndex.name === indexMetadata.name) && indexMetadata.synchronize === true)
                .map((indexMetadata) => TableIndex_1.TableIndex.create(indexMetadata));
            if (newIndices.length === 0)
                continue;
            this.connection.logger.logSchemaBuild(`adding new indices ${newIndices
                .map((index) => `"${index.name}"`)
                .join(", ")} in table "${table.name}"`);
            await this.queryRunner.createIndices(table, newIndices);
        }
    }
    /**
     * Creates indices for materialized views.
     */
    async createNewViewIndices() {
        // Only PostgreSQL supports indices for materialized views.
        if (this.connection.options.type !== "postgres" ||
            !DriverUtils_1.DriverUtils.isPostgresFamily(this.connection.driver)) {
            return;
        }
        const postgresQueryRunner = (this.queryRunner);
        for (const metadata of this.viewEntityToSyncMetadatas) {
            // check if view does not exist yet
            const view = this.queryRunner.loadedViews.find((view) => {
                const viewExpression = typeof view.expression === "string"
                    ? view.expression.trim()
                    : view.expression(this.connection).getQuery();
                const metadataExpression = typeof metadata.expression === "string"
                    ? metadata.expression.trim()
                    : metadata.expression(this.connection).getQuery();
                return (this.getTablePath(view) === this.getTablePath(metadata) &&
                    viewExpression === metadataExpression);
            });
            if (!view || !view.materialized)
                continue;
            const newIndices = metadata.indices
                .filter((indexMetadata) => !view.indices.find((tableIndex) => tableIndex.name === indexMetadata.name) && indexMetadata.synchronize === true)
                .map((indexMetadata) => TableIndex_1.TableIndex.create(indexMetadata));
            if (newIndices.length === 0)
                continue;
            this.connection.logger.logSchemaBuild(`adding new indices ${newIndices
                .map((index) => `"${index.name}"`)
                .join(", ")} in view "${view.name}"`);
            await postgresQueryRunner.createViewIndices(view, newIndices);
        }
    }
    async createNewChecks() {
        // Mysql does not support check constraints
        if (DriverUtils_1.DriverUtils.isMySQLFamily(this.connection.driver))
            return;
        for (const metadata of this.entityToSyncMetadatas) {
            const table = this.queryRunner.loadedTables.find((table) => this.getTablePath(table) === this.getTablePath(metadata));
            if (!table)
                continue;
            const newChecks = metadata.checks
                .filter((checkMetadata) => !table.checks.find((tableCheck) => tableCheck.name === checkMetadata.name))
                .map((checkMetadata) => TableCheck_1.TableCheck.create(checkMetadata));
            if (newChecks.length === 0)
                continue;
            this.connection.logger.logSchemaBuild(`adding new check constraints: ${newChecks
                .map((index) => `"${index.name}"`)
                .join(", ")} in table "${table.name}"`);
            await this.queryRunner.createCheckConstraints(table, newChecks);
        }
    }
    /**
     * Creates composite uniques which are missing in db yet.
     */
    async createCompositeUniqueConstraints() {
        for (const metadata of this.entityToSyncMetadatas) {
            const table = this.queryRunner.loadedTables.find((table) => this.getTablePath(table) === this.getTablePath(metadata));
            if (!table)
                continue;
            const compositeUniques = metadata.uniques
                .filter((uniqueMetadata) => uniqueMetadata.columns.length > 1 &&
                !table.uniques.find((tableUnique) => tableUnique.name === uniqueMetadata.name))
                .map((uniqueMetadata) => TableUnique_1.TableUnique.create(uniqueMetadata));
            if (compositeUniques.length === 0)
                continue;
            this.connection.logger.logSchemaBuild(`adding new unique constraints: ${compositeUniques
                .map((unique) => `"${unique.name}"`)
                .join(", ")} in table "${table.name}"`);
            await this.queryRunner.createUniqueConstraints(table, compositeUniques);
        }
    }
    /**
     * Creates exclusions which are missing in db yet.
     */
    async createNewExclusions() {
        // Only PostgreSQL supports exclusion constraints
        if (!(this.connection.driver.options.type === "postgres"))
            return;
        for (const metadata of this.entityToSyncMetadatas) {
            const table = this.queryRunner.loadedTables.find((table) => this.getTablePath(table) === this.getTablePath(metadata));
            if (!table)
                continue;
            const newExclusions = metadata.exclusions
                .filter((exclusionMetadata) => !table.exclusions.find((tableExclusion) => tableExclusion.name === exclusionMetadata.name))
                .map((exclusionMetadata) => TableExclusion_1.TableExclusion.create(exclusionMetadata));
            if (newExclusions.length === 0)
                continue;
            this.connection.logger.logSchemaBuild(`adding new exclusion constraints: ${newExclusions
                .map((exclusion) => `"${exclusion.name}"`)
                .join(", ")} in table "${table.name}"`);
            await this.queryRunner.createExclusionConstraints(table, newExclusions);
        }
    }
    /**
     * Creates foreign keys which does not exist in the table yet.
     */
    async createForeignKeys() {
        for (const metadata of this.entityToSyncMetadatas) {
            const table = this.queryRunner.loadedTables.find((table) => this.getTablePath(table) === this.getTablePath(metadata));
            if (!table)
                continue;
            const newKeys = metadata.foreignKeys.filter((foreignKey) => {
                return !table.foreignKeys.find((dbForeignKey) => dbForeignKey.name === foreignKey.name &&
                    this.getTablePath(dbForeignKey) ===
                        this.getTablePath(foreignKey.referencedEntityMetadata));
            });
            if (newKeys.length === 0)
                continue;
            const dbForeignKeys = newKeys.map((foreignKeyMetadata) => TableForeignKey_1.TableForeignKey.create(foreignKeyMetadata, this.connection.driver));
            this.connection.logger.logSchemaBuild(`creating a foreign keys: ${newKeys
                .map((key) => key.name)
                .join(", ")} on table "${table.name}"`);
            await this.queryRunner.createForeignKeys(table, dbForeignKeys);
        }
    }
    /**
     * Drops all foreign keys where given column of the given table is being used.
     */
    async dropColumnReferencedForeignKeys(tablePath, columnName) {
        const table = this.queryRunner.loadedTables.find((table) => this.getTablePath(table) === tablePath);
        if (!table)
            return;
        const tablesWithFK = [];
        const columnForeignKey = table.foreignKeys.find((foreignKey) => foreignKey.columnNames.indexOf(columnName) !== -1);
        if (columnForeignKey) {
            const clonedTable = table.clone();
            clonedTable.foreignKeys = [columnForeignKey];
            tablesWithFK.push(clonedTable);
            table.removeForeignKey(columnForeignKey);
        }
        for (const loadedTable of this.queryRunner.loadedTables) {
            const dependForeignKeys = loadedTable.foreignKeys.filter((foreignKey) => {
                return (this.getTablePath(foreignKey) === tablePath &&
                    foreignKey.referencedColumnNames.indexOf(columnName) !==
                        -1);
            });
            if (dependForeignKeys.length > 0) {
                const clonedTable = loadedTable.clone();
                clonedTable.foreignKeys = dependForeignKeys;
                tablesWithFK.push(clonedTable);
                dependForeignKeys.forEach((dependForeignKey) => loadedTable.removeForeignKey(dependForeignKey));
            }
        }
        if (tablesWithFK.length > 0) {
            for (const tableWithFK of tablesWithFK) {
                this.connection.logger.logSchemaBuild(`dropping related foreign keys of ${tableWithFK.name}: ${tableWithFK.foreignKeys
                    .map((foreignKey) => foreignKey.name)
                    .join(", ")}`);
                await this.queryRunner.dropForeignKeys(tableWithFK, tableWithFK.foreignKeys);
            }
        }
    }
    /**
     * Drops all composite indices, related to given column.
     */
    async dropColumnCompositeIndices(tablePath, columnName) {
        const table = this.queryRunner.loadedTables.find((table) => this.getTablePath(table) === tablePath);
        if (!table)
            return;
        const relatedIndices = table.indices.filter((index) => index.columnNames.length > 1 &&
            index.columnNames.indexOf(columnName) !== -1);
        if (relatedIndices.length === 0)
            return;
        this.connection.logger.logSchemaBuild(`dropping related indices of "${tablePath}"."${columnName}": ${relatedIndices
            .map((index) => index.name)
            .join(", ")}`);
        await this.queryRunner.dropIndices(table, relatedIndices);
    }
    /**
     * Drops all composite uniques, related to given column.
     */
    async dropColumnCompositeUniques(tablePath, columnName) {
        const table = this.queryRunner.loadedTables.find((table) => this.getTablePath(table) === tablePath);
        if (!table)
            return;
        const relatedUniques = table.uniques.filter((unique) => unique.columnNames.length > 1 &&
            unique.columnNames.indexOf(columnName) !== -1);
        if (relatedUniques.length === 0)
            return;
        this.connection.logger.logSchemaBuild(`dropping related unique constraints of "${tablePath}"."${columnName}": ${relatedUniques
            .map((unique) => unique.name)
            .join(", ")}`);
        await this.queryRunner.dropUniqueConstraints(table, relatedUniques);
    }
    /**
     * Creates new columns from the given column metadatas.
     */
    metadataColumnsToTableColumnOptions(columns) {
        return columns.map((columnMetadata) => TableUtils_1.TableUtils.createTableColumnOptions(columnMetadata, this.connection.driver));
    }
    /**
     * Creates typeorm service table for storing user defined Views and generate columns.
     */
    async createTypeormMetadataTable(queryRunner) {
        const schema = this.currentSchema;
        const database = this.currentDatabase;
        const typeormMetadataTable = this.connection.driver.buildTableName(this.connection.metadataTableName, schema, database);
        const isPrimary = false;
        await queryRunner.createTable(new Table_1.Table({
            database: database,
            schema: schema,
            name: typeormMetadataTable,
            columns: [
                {
                    name: "type",
                    type: this.connection.driver.normalizeType({
                        type: this.connection.driver.mappedDataTypes
                            .metadataType,
                    }),
                    isNullable: false,
                    isPrimary,
                },
                {
                    name: "database",
                    type: this.connection.driver.normalizeType({
                        type: this.connection.driver.mappedDataTypes
                            .metadataDatabase,
                    }),
                    isNullable: true,
                    isPrimary,
                },
                {
                    name: "schema",
                    type: this.connection.driver.normalizeType({
                        type: this.connection.driver.mappedDataTypes
                            .metadataSchema,
                    }),
                    isNullable: true,
                    isPrimary,
                },
                {
                    name: "table",
                    type: this.connection.driver.normalizeType({
                        type: this.connection.driver.mappedDataTypes
                            .metadataTable,
                    }),
                    isNullable: true,
                    isPrimary,
                },
                {
                    name: "name",
                    type: this.connection.driver.normalizeType({
                        type: this.connection.driver.mappedDataTypes
                            .metadataName,
                    }),
                    isNullable: true,
                    isPrimary,
                },
                {
                    name: "value",
                    type: this.connection.driver.normalizeType({
                        type: this.connection.driver.mappedDataTypes
                            .metadataValue,
                    }),
                    isNullable: true,
                    isPrimary,
                },
            ],
        }), true);
    }
}
exports.RdbmsSchemaBuilder = RdbmsSchemaBuilder;

//# sourceMappingURL=RdbmsSchemaBuilder.js.map

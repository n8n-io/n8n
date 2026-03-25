"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MigrationExecutor = void 0;
const Table_1 = require("../schema-builder/table/Table");
const Migration_1 = require("./Migration");
const error_1 = require("../error");
const InstanceChecker_1 = require("../util/InstanceChecker");
/**
 * Executes migrations: runs pending and reverts previously executed migrations.
 */
class MigrationExecutor {
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    constructor(connection, queryRunner) {
        this.connection = connection;
        this.queryRunner = queryRunner;
        // -------------------------------------------------------------------------
        // Public Properties
        // -------------------------------------------------------------------------
        /**
         * Indicates how migrations should be run in transactions.
         *   all: all migrations are run in a single transaction
         *   none: all migrations are run without a transaction
         *   each: each migration is run in a separate transaction
         */
        this.transaction = "all";
        const { schema } = this.connection.driver.options;
        const database = this.connection.driver.database;
        this.migrationsDatabase = database;
        this.migrationsSchema = schema;
        this.migrationsTableName =
            connection.options.migrationsTableName || "migrations";
        this.migrationsTable = this.connection.driver.buildTableName(this.migrationsTableName, schema, database);
    }
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    /**
     * Tries to execute a single migration given.
     */
    async executeMigration(migration) {
        return this.withQueryRunner(async (queryRunner) => {
            await this.createMigrationsTableIfNotExist(queryRunner);
            // create typeorm_metadata table if it's not created yet
            const schemaBuilder = this.connection.driver.createSchemaBuilder();
            if (InstanceChecker_1.InstanceChecker.isRdbmsSchemaBuilder(schemaBuilder)) {
                await schemaBuilder.createMetadataTableIfNecessary(queryRunner);
            }
            await queryRunner.beforeMigration();
            await migration.instance.up(queryRunner);
            await queryRunner.afterMigration();
            await this.insertExecutedMigration(queryRunner, migration);
            return migration;
        });
    }
    /**
     * Returns an array of all migrations.
     */
    async getAllMigrations() {
        return Promise.resolve(this.getMigrations());
    }
    /**
     * Returns an array of all executed migrations.
     */
    async getExecutedMigrations() {
        return this.withQueryRunner(async (queryRunner) => {
            await this.createMigrationsTableIfNotExist(queryRunner);
            return await this.loadExecutedMigrations(queryRunner);
        });
    }
    /**
     * Returns an array of all pending migrations.
     */
    async getPendingMigrations() {
        const allMigrations = await this.getAllMigrations();
        const executedMigrations = await this.getExecutedMigrations();
        return allMigrations.filter((migration) => !executedMigrations.find((executedMigration) => executedMigration.name === migration.name));
    }
    /**
     * Inserts an executed migration.
     */
    insertMigration(migration) {
        return this.withQueryRunner((q) => this.insertExecutedMigration(q, migration));
    }
    /**
     * Deletes an executed migration.
     */
    deleteMigration(migration) {
        return this.withQueryRunner((q) => this.deleteExecutedMigration(q, migration));
    }
    /**
     * Lists all migrations and whether they have been executed or not
     * returns true if there are unapplied migrations
     */
    async showMigrations() {
        let hasUnappliedMigrations = false;
        const queryRunner = this.queryRunner || this.connection.createQueryRunner();
        // create migrations table if its not created yet
        await this.createMigrationsTableIfNotExist(queryRunner);
        // get all migrations that are executed and saved in the database
        const executedMigrations = await this.loadExecutedMigrations(queryRunner);
        // get all user's migrations in the source code
        const allMigrations = this.getMigrations();
        for (const migration of allMigrations) {
            const executedMigration = executedMigrations.find((executedMigration) => executedMigration.name === migration.name);
            if (executedMigration) {
                this.connection.logger.logSchemaBuild(`[X] ${executedMigration.id} ${migration.name}`);
            }
            else {
                hasUnappliedMigrations = true;
                this.connection.logger.logSchemaBuild(`[ ] ${migration.name}`);
            }
        }
        // if query runner was created by us then release it
        if (!this.queryRunner) {
            await queryRunner.release();
        }
        return hasUnappliedMigrations;
    }
    /**
     * Executes all pending migrations. Pending migrations are migrations that are not yet executed,
     * thus not saved in the database.
     */
    async executePendingMigrations() {
        const queryRunner = this.queryRunner || this.connection.createQueryRunner();
        // create migrations table if it's not created yet
        await this.createMigrationsTableIfNotExist(queryRunner);
        // create the typeorm_metadata table if it's not created yet
        const schemaBuilder = this.connection.driver.createSchemaBuilder();
        if (InstanceChecker_1.InstanceChecker.isRdbmsSchemaBuilder(schemaBuilder)) {
            await schemaBuilder.createMetadataTableIfNecessary(queryRunner);
        }
        // get all migrations that are executed and saved in the database
        const executedMigrations = await this.loadExecutedMigrations(queryRunner);
        // get the time when last migration was executed
        let lastTimeExecutedMigration = this.getLatestTimestampMigration(executedMigrations);
        // get all user's migrations in the source code
        const allMigrations = this.getMigrations();
        // variable to store all migrations we did successfully
        const successMigrations = [];
        // find all migrations that needs to be executed
        const pendingMigrations = allMigrations.filter((migration) => {
            // check if we already have executed migration
            const executedMigration = executedMigrations.find((executedMigration) => executedMigration.name === migration.name);
            if (executedMigration)
                return false;
            // migration is new and not executed. now check if its timestamp is correct
            // if (lastTimeExecutedMigration && migration.timestamp < lastTimeExecutedMigration.timestamp)
            //     throw new TypeORMError(`New migration found: ${migration.name}, however this migration's timestamp is not valid. Migration's timestamp should not be older then migrations already executed in the database.`);
            // every check is passed means that migration was not run yet and we need to run it
            return true;
        });
        // if no migrations are pending then nothing to do here
        if (!pendingMigrations.length) {
            this.connection.logger.logSchemaBuild(`No migrations are pending`);
            // if query runner was created by us then release it
            if (!this.queryRunner)
                await queryRunner.release();
            return [];
        }
        // log information about migration execution
        this.connection.logger.logSchemaBuild(`${executedMigrations.length} migrations are already loaded in the database.`);
        this.connection.logger.logSchemaBuild(`${allMigrations.length} migrations were found in the source code.`);
        if (lastTimeExecutedMigration)
            this.connection.logger.logSchemaBuild(`${lastTimeExecutedMigration.name} is the last executed migration. It was executed on ${new Date(lastTimeExecutedMigration.timestamp).toString()}.`);
        this.connection.logger.logSchemaBuild(`${pendingMigrations.length} migrations are new migrations must be executed.`);
        if (this.transaction === "all") {
            // If we desire to run all migrations in a single transaction
            // but there is a migration that explicitly overrides the transaction mode
            // then we have to fail since we cannot properly resolve that intent
            // In theory we could support overrides that are set to `true`,
            // however to keep the interface more rigid, we fail those too
            const migrationsOverridingTransactionMode = pendingMigrations.filter((migration) => !(migration.instance?.transaction === undefined));
            if (migrationsOverridingTransactionMode.length > 0) {
                const error = new error_1.ForbiddenTransactionModeOverrideError(migrationsOverridingTransactionMode);
                this.connection.logger.logMigration(`Migrations failed, error: ${error.message}`);
                throw error;
            }
        }
        // Set the per-migration defaults for the transaction mode
        // so that we have one centralized place that controls this behavior
        // When transaction mode is `each` the default is to run in a transaction
        // When transaction mode is `none` the default is to not run in a transaction
        // When transaction mode is `all` the default is to not run in a transaction
        // since all the migrations are already running in one single transaction
        const txModeDefault = {
            each: true,
            none: false,
            all: false,
        }[this.transaction];
        for (const migration of pendingMigrations) {
            if (migration.instance) {
                const instanceTx = migration.instance.transaction;
                if (instanceTx === undefined) {
                    migration.transaction = txModeDefault;
                }
                else {
                    migration.transaction = instanceTx;
                }
            }
        }
        // start transaction if its not started yet
        let transactionStartedByUs = false;
        if (this.transaction === "all" && !queryRunner.isTransactionActive) {
            await queryRunner.beforeMigration();
            await queryRunner.startTransaction();
            transactionStartedByUs = true;
        }
        // run all pending migrations in a sequence
        try {
            for (const migration of pendingMigrations) {
                if (this.fake) {
                    // directly insert migration record into the database if it is fake
                    await this.insertExecutedMigration(queryRunner, migration);
                    // nothing else needs to be done, continue to next migration
                    continue;
                }
                if (migration.transaction && !queryRunner.isTransactionActive) {
                    await queryRunner.beforeMigration();
                    await queryRunner.startTransaction();
                    transactionStartedByUs = true;
                }
                await migration
                    .instance.up(queryRunner)
                    .catch((error) => {
                    // informative log about migration failure
                    this.connection.logger.logMigration(`Migration "${migration.name}" failed, error: ${error?.message}`);
                    throw error;
                })
                    .then(async () => {
                    // now when migration is executed we need to insert record about it into the database
                    await this.insertExecutedMigration(queryRunner, migration);
                    // commit transaction if we started it
                    if (migration.transaction && transactionStartedByUs) {
                        await queryRunner.commitTransaction();
                        await queryRunner.afterMigration();
                    }
                })
                    .then(() => {
                    // informative log about migration success
                    successMigrations.push(migration);
                    this.connection.logger.logSchemaBuild(`Migration ${migration.name} has been ${this.fake ? "(fake)" : ""} executed successfully.`);
                });
            }
            // commit transaction if we started it
            if (this.transaction === "all" && transactionStartedByUs) {
                await queryRunner.commitTransaction();
                await queryRunner.afterMigration();
            }
        }
        catch (err) {
            // rollback transaction if we started it
            if (transactionStartedByUs) {
                try {
                    // we throw original error even if rollback thrown an error
                    await queryRunner.rollbackTransaction();
                }
                catch (rollbackError) { }
            }
            throw err;
        }
        finally {
            // if query runner was created by us then release it
            if (!this.queryRunner)
                await queryRunner.release();
        }
        return successMigrations;
    }
    /**
     * Reverts last migration that were run.
     */
    async undoLastMigration() {
        const queryRunner = this.queryRunner || this.connection.createQueryRunner();
        // create migrations table if it's not created yet
        await this.createMigrationsTableIfNotExist(queryRunner);
        // create typeorm_metadata table if it's not created yet
        const schemaBuilder = this.connection.driver.createSchemaBuilder();
        if (InstanceChecker_1.InstanceChecker.isRdbmsSchemaBuilder(schemaBuilder)) {
            await schemaBuilder.createMetadataTableIfNecessary(queryRunner);
        }
        // get all migrations that are executed and saved in the database
        const executedMigrations = await this.loadExecutedMigrations(queryRunner);
        // get the time when last migration was executed
        let lastTimeExecutedMigration = this.getLatestExecutedMigration(executedMigrations);
        // if no migrations found in the database then nothing to revert
        if (!lastTimeExecutedMigration) {
            this.connection.logger.logSchemaBuild(`No migrations were found in the database. Nothing to revert!`);
            return;
        }
        // get all user's migrations in the source code
        const allMigrations = this.getMigrations();
        // find the instance of the migration we need to remove
        const migrationToRevert = allMigrations.find((migration) => migration.name === lastTimeExecutedMigration.name);
        // if no migrations found in the database then nothing to revert
        if (!migrationToRevert)
            throw new error_1.TypeORMError(`No migration ${lastTimeExecutedMigration.name} was found in the source code. Make sure you have this migration in your codebase and its included in the connection options.`);
        // log information about migration execution
        this.connection.logger.logSchemaBuild(`${executedMigrations.length} migrations are already loaded in the database.`);
        this.connection.logger.logSchemaBuild(`${lastTimeExecutedMigration.name} is the last executed migration. It was executed on ${new Date(lastTimeExecutedMigration.timestamp).toString()}.`);
        this.connection.logger.logSchemaBuild(`Now reverting it...`);
        // start transaction if its not started yet
        let transactionStartedByUs = false;
        if (this.transaction !== "none" && !queryRunner.isTransactionActive) {
            await queryRunner.startTransaction();
            transactionStartedByUs = true;
        }
        try {
            if (!this.fake) {
                await queryRunner.beforeMigration();
                await migrationToRevert.instance.down(queryRunner);
                await queryRunner.afterMigration();
            }
            await this.deleteExecutedMigration(queryRunner, migrationToRevert);
            this.connection.logger.logSchemaBuild(`Migration ${migrationToRevert.name} has been ${this.fake ? "(fake)" : ""} reverted successfully.`);
            // commit transaction if we started it
            if (transactionStartedByUs)
                await queryRunner.commitTransaction();
        }
        catch (err) {
            // rollback transaction if we started it
            if (transactionStartedByUs) {
                try {
                    // we throw original error even if rollback thrown an error
                    await queryRunner.rollbackTransaction();
                }
                catch (rollbackError) { }
            }
            throw err;
        }
        finally {
            // if query runner was created by us then release it
            if (!this.queryRunner)
                await queryRunner.release();
        }
    }
    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------
    /**
     * Creates table "migrations" that will store information about executed migrations.
     */
    async createMigrationsTableIfNotExist(queryRunner) {
        const tableExist = await queryRunner.hasTable(this.migrationsTable); // todo: table name should be configurable
        if (!tableExist) {
            await queryRunner.createTable(new Table_1.Table({
                database: this.migrationsDatabase,
                schema: this.migrationsSchema,
                name: this.migrationsTable,
                columns: [
                    {
                        name: "id",
                        type: this.connection.driver.normalizeType({
                            type: this.connection.driver.mappedDataTypes
                                .migrationId,
                        }),
                        isGenerated: true,
                        generationStrategy: "increment",
                        isPrimary: true,
                        isNullable: false,
                    },
                    {
                        name: "timestamp",
                        type: this.connection.driver.normalizeType({
                            type: this.connection.driver.mappedDataTypes
                                .migrationTimestamp,
                        }),
                        isPrimary: false,
                        isNullable: false,
                    },
                    {
                        name: "name",
                        type: this.connection.driver.normalizeType({
                            type: this.connection.driver.mappedDataTypes
                                .migrationName,
                        }),
                        isNullable: false,
                    },
                ],
            }));
        }
    }
    /**
     * Loads all migrations that were executed and saved into the database (sorts by id).
     */
    async loadExecutedMigrations(queryRunner) {
        const migrationsRaw = await this.connection.manager
            .createQueryBuilder(queryRunner)
            .select()
            .orderBy(this.connection.driver.escape("id"), "DESC")
            .from(this.migrationsTable, this.migrationsTableName)
            .getRawMany();
        return migrationsRaw.map((migrationRaw) => {
            return new Migration_1.Migration(parseInt(migrationRaw["id"]), parseInt(migrationRaw["timestamp"]), migrationRaw["name"]);
        });
    }
    /**
     * Gets all migrations that setup for this connection.
     */
    getMigrations() {
        const migrations = this.connection.migrations.map((migration) => {
            const migrationClassName = migration.name || migration.constructor.name;
            const migrationTimestamp = parseInt(migrationClassName.substr(-13), 10);
            if (!migrationTimestamp || isNaN(migrationTimestamp)) {
                throw new error_1.TypeORMError(`${migrationClassName} migration name is wrong. Migration class name should have a JavaScript timestamp appended.`);
            }
            return new Migration_1.Migration(undefined, migrationTimestamp, migrationClassName, migration);
        });
        this.checkForDuplicateMigrations(migrations);
        // sort them by timestamp
        return migrations.sort((a, b) => a.timestamp - b.timestamp);
    }
    checkForDuplicateMigrations(migrations) {
        const migrationNames = migrations.map((migration) => migration.name);
        const duplicates = Array.from(new Set(migrationNames.filter((migrationName, index) => migrationNames.indexOf(migrationName) < index)));
        if (duplicates.length > 0) {
            throw Error(`Duplicate migrations: ${duplicates.join(", ")}`);
        }
    }
    /**
     * Finds the latest migration (sorts by timestamp) in the given array of migrations.
     */
    getLatestTimestampMigration(migrations) {
        const sortedMigrations = migrations
            .map((migration) => migration)
            .sort((a, b) => (a.timestamp - b.timestamp) * -1);
        return sortedMigrations.length > 0 ? sortedMigrations[0] : undefined;
    }
    /**
     * Finds the latest migration in the given array of migrations.
     * PRE: Migration array must be sorted by descending id.
     */
    getLatestExecutedMigration(sortedMigrations) {
        return sortedMigrations.length > 0 ? sortedMigrations[0] : undefined;
    }
    /**
     * Inserts new executed migration's data into migrations table.
     */
    async insertExecutedMigration(queryRunner, migration) {
        const values = {};
        values["timestamp"] = migration.timestamp;
        values["name"] = migration.name;
        const qb = queryRunner.manager.createQueryBuilder();
        await qb.insert().into(this.migrationsTable).values(values).execute();
    }
    /**
     * Delete previously executed migration's data from the migrations table.
     */
    async deleteExecutedMigration(queryRunner, migration) {
        const conditions = {};
        conditions["timestamp"] = migration.timestamp;
        conditions["name"] = migration.name;
        const qb = queryRunner.manager.createQueryBuilder();
        await qb
            .delete()
            .from(this.migrationsTable)
            .where(`${qb.escape("timestamp")} = :timestamp`)
            .andWhere(`${qb.escape("name")} = :name`)
            .setParameters(conditions)
            .execute();
    }
    async withQueryRunner(callback) {
        const queryRunner = this.queryRunner || this.connection.createQueryRunner();
        try {
            return await callback(queryRunner);
        }
        finally {
            if (!this.queryRunner) {
                await queryRunner.release();
            }
        }
    }
}
exports.MigrationExecutor = MigrationExecutor;

//# sourceMappingURL=MigrationExecutor.js.map

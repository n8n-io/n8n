"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataSource = void 0;
const query_builder_1 = require("../query-builder");
const DefaultNamingStrategy_1 = require("../naming-strategy/DefaultNamingStrategy");
const error_1 = require("../error");
const MigrationExecutor_1 = require("../migration/MigrationExecutor");
const EntityMetadataValidator_1 = require("../metadata-builder/EntityMetadataValidator");
const EntityManagerFactory_1 = require("../entity-manager/EntityManagerFactory");
const DriverFactory_1 = require("../driver/DriverFactory");
const ConnectionMetadataBuilder_1 = require("../connection/ConnectionMetadataBuilder");
const SelectQueryBuilder_1 = require("../query-builder/SelectQueryBuilder");
const LoggerFactory_1 = require("../logger/LoggerFactory");
const QueryResultCacheFactory_1 = require("../cache/QueryResultCacheFactory");
const RelationLoader_1 = require("../query-builder/RelationLoader");
const ObjectUtils_1 = require("../util/ObjectUtils");
const RelationIdLoader_1 = require("../query-builder/RelationIdLoader");
const DriverUtils_1 = require("../driver/DriverUtils");
const InstanceChecker_1 = require("../util/InstanceChecker");
(0, query_builder_1.registerQueryBuilders)();
/**
 * DataSource is a pre-defined connection configuration to a specific database.
 * You can have multiple data sources connected (with multiple connections in it),
 * connected to multiple databases in your application.
 *
 * Before, it was called `Connection`, but now `Connection` is deprecated
 * because `Connection` isn't the best name for what it's actually is.
 */
class DataSource {
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    constructor(options) {
        this["@instanceof"] = Symbol.for("DataSource");
        /**
         * Migration instances that are registered for this connection.
         */
        this.migrations = [];
        /**
         * Entity subscriber instances that are registered for this connection.
         */
        this.subscribers = [];
        /**
         * All entity metadatas that are registered for this connection.
         */
        this.entityMetadatas = [];
        /**
         * All entity metadatas that are registered for this connection.
         * This is a copy of #.entityMetadatas property -> used for more performant searches.
         */
        this.entityMetadatasMap = new Map();
        (0, query_builder_1.registerQueryBuilders)();
        this.name = options.name || "default";
        this.options = options;
        this.logger = new LoggerFactory_1.LoggerFactory().create(this.options.logger, this.options.logging);
        this.manager = this.createEntityManager();
        this.namingStrategy =
            options.namingStrategy || new DefaultNamingStrategy_1.DefaultNamingStrategy();
        this.metadataTableName = options.metadataTableName || "typeorm_metadata";
        this.relationLoader = new RelationLoader_1.RelationLoader(this);
        this.relationIdLoader = new RelationIdLoader_1.RelationIdLoader(this);
        this.isInitialized = false;
    }
    // -------------------------------------------------------------------------
    // Public Accessors
    // -------------------------------------------------------------------------
    /**
     Indicates if DataSource is initialized or not.
     *
     * @deprecated use .isInitialized instead
     */
    get isConnected() {
        return this.isInitialized;
    }
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    /**
     * Updates current connection options with provided options.
     */
    setOptions(options) {
        Object.assign(this.options, options);
        if (options.logger || options.logging) {
            this.logger = new LoggerFactory_1.LoggerFactory().create(options.logger || this.options.logger, options.logging || this.options.logging);
        }
        if (options.namingStrategy) {
            this.namingStrategy = options.namingStrategy;
        }
        if (options.cache) {
            this.queryResultCache = new QueryResultCacheFactory_1.QueryResultCacheFactory(this).create();
        }
        // todo: we must update the database in the driver as well, if it was set by setOptions method
        //  in the future we need to refactor the code and remove "database" from the driver, and instead
        //  use database (and options) from a single place - data source.
        if (options.database) {
            this.driver.database = DriverUtils_1.DriverUtils.buildDriverOptions(this.options).database;
        }
        // todo: need to take a look if we need to update schema and other "poor" properties
        return this;
    }
    /**
     * Performs connection to the database.
     * This method should be called once on application bootstrap.
     * This method not necessarily creates database connection (depend on database type),
     * but it also can setup a connection pool with database to use.
     */
    async initialize() {
        if (this.isInitialized)
            throw new error_1.CannotConnectAlreadyConnectedError(this.name);
        this.driver = await DriverFactory_1.DriverFactory.create(this);
        this.queryResultCache = this.options.cache
            ? new QueryResultCacheFactory_1.QueryResultCacheFactory(this).create()
            : undefined;
        // connect to the database via its driver
        await this.driver.connect();
        // connect to the cache-specific database if cache is enabled
        if (this.queryResultCache)
            await this.queryResultCache.connect();
        // set connected status for the current connection
        ObjectUtils_1.ObjectUtils.assign(this, { isInitialized: true });
        try {
            // build all metadatas registered in the current connection
            await this.buildMetadatas();
            await this.driver.afterConnect();
            // if option is set - drop schema once connection is done
            if (this.options.dropSchema)
                await this.dropDatabase();
            // if option is set - automatically synchronize a schema
            if (this.options.migrationsRun)
                await this.runMigrations({
                    transaction: this.options.migrationsTransactionMode,
                });
            // if option is set - automatically synchronize a schema
            if (this.options.synchronize)
                await this.synchronize();
        }
        catch (error) {
            // if for some reason build metadata fail (for example validation error during entity metadata check)
            // connection needs to be closed
            await this.destroy();
            throw error;
        }
        return this;
    }
    /**
     * Performs connection to the database.
     * This method should be called once on application bootstrap.
     * This method not necessarily creates database connection (depend on database type),
     * but it also can setup a connection pool with database to use.
     *
     * @deprecated use .initialize method instead
     */
    async connect() {
        return this.initialize();
    }
    /**
     * Closes connection with the database.
     * Once connection is closed, you cannot use repositories or perform any operations except opening connection again.
     */
    async destroy() {
        if (!this.isInitialized)
            throw new error_1.CannotExecuteNotConnectedError(this.name);
        await this.driver.disconnect();
        // disconnect from the cache-specific database if cache was enabled
        if (this.queryResultCache)
            await this.queryResultCache.disconnect();
        ObjectUtils_1.ObjectUtils.assign(this, { isInitialized: false });
    }
    /**
     * Closes connection with the database.
     * Once connection is closed, you cannot use repositories or perform any operations except opening connection again.
     *
     * @deprecated use .destroy method instead
     */
    async close() {
        return this.destroy();
    }
    /**
     * Creates database schema for all entities registered in this connection.
     * Can be used only after connection to the database is established.
     *
     * @param dropBeforeSync If set to true then it drops the database with all its tables and data
     */
    async synchronize(dropBeforeSync = false) {
        if (!this.isInitialized)
            throw new error_1.CannotExecuteNotConnectedError(this.name);
        if (dropBeforeSync)
            await this.dropDatabase();
        const schemaBuilder = this.driver.createSchemaBuilder();
        await schemaBuilder.build();
    }
    /**
     * Drops the database and all its data.
     * Be careful with this method on production since this method will erase all your database tables and their data.
     * Can be used only after connection to the database is established.
     */
    // TODO rename
    async dropDatabase() {
        const queryRunner = this.createQueryRunner();
        try {
            if (DriverUtils_1.DriverUtils.isMySQLFamily(this.driver) ||
                DriverUtils_1.DriverUtils.isSQLiteFamily(this.driver)) {
                const databases = [];
                this.entityMetadatas.forEach((metadata) => {
                    if (metadata.database &&
                        databases.indexOf(metadata.database) === -1)
                        databases.push(metadata.database);
                });
                if (databases.length === 0 && this.driver.database) {
                    databases.push(this.driver.database);
                }
                if (databases.length === 0) {
                    await queryRunner.clearDatabase();
                }
                else {
                    for (const database of databases) {
                        await queryRunner.clearDatabase(database);
                    }
                }
            }
            else {
                await queryRunner.clearDatabase();
            }
        }
        finally {
            await queryRunner.release();
        }
    }
    /**
     * Runs all pending migrations.
     * Can be used only after connection to the database is established.
     */
    async runMigrations(options) {
        if (!this.isInitialized)
            throw new error_1.CannotExecuteNotConnectedError(this.name);
        const migrationExecutor = new MigrationExecutor_1.MigrationExecutor(this);
        migrationExecutor.transaction =
            options?.transaction ||
                this.options?.migrationsTransactionMode ||
                "all";
        migrationExecutor.fake = (options && options.fake) || false;
        const successMigrations = await migrationExecutor.executePendingMigrations();
        return successMigrations;
    }
    /**
     * Reverts last executed migration.
     * Can be used only after connection to the database is established.
     */
    async undoLastMigration(options) {
        if (!this.isInitialized)
            throw new error_1.CannotExecuteNotConnectedError(this.name);
        const migrationExecutor = new MigrationExecutor_1.MigrationExecutor(this);
        migrationExecutor.transaction =
            (options && options.transaction) || "all";
        migrationExecutor.fake = (options && options.fake) || false;
        await migrationExecutor.undoLastMigration();
    }
    /**
     * Lists all migrations and whether they have been run.
     * Returns true if there are pending migrations
     */
    async showMigrations() {
        if (!this.isInitialized) {
            throw new error_1.CannotExecuteNotConnectedError(this.name);
        }
        const migrationExecutor = new MigrationExecutor_1.MigrationExecutor(this);
        return await migrationExecutor.showMigrations();
    }
    /**
     * Checks if entity metadata exist for the given entity class, target name or table name.
     */
    hasMetadata(target) {
        return !!this.findMetadata(target);
    }
    /**
     * Gets entity metadata for the given entity class or schema name.
     */
    getMetadata(target) {
        const metadata = this.findMetadata(target);
        if (!metadata)
            throw new error_1.EntityMetadataNotFoundError(target);
        return metadata;
    }
    /**
     * Gets repository for the given entity.
     */
    getRepository(target) {
        return this.manager.getRepository(target);
    }
    /**
     * Gets tree repository for the given entity class or name.
     * Only tree-type entities can have a TreeRepository, like ones decorated with @Tree decorator.
     */
    getTreeRepository(target) {
        return this.manager.getTreeRepository(target);
    }
    /**
     * Gets custom entity repository marked with @EntityRepository decorator.
     *
     * @deprecated use Repository.extend function to create a custom repository
     */
    getCustomRepository(customRepository) {
        return this.manager.getCustomRepository(customRepository);
    }
    async transaction(isolationOrRunInTransaction, runInTransactionParam) {
        return this.manager.transaction(isolationOrRunInTransaction, runInTransactionParam);
    }
    /**
     * Executes raw SQL query and returns raw database results.
     */
    async query(query, parameters, queryRunner) {
        if (queryRunner && queryRunner.isReleased)
            throw new error_1.QueryRunnerProviderAlreadyReleasedError();
        const usedQueryRunner = queryRunner || this.createQueryRunner();
        try {
            return await usedQueryRunner.query(query, parameters); // await is needed here because we are using finally
        }
        finally {
            if (!queryRunner)
                await usedQueryRunner.release();
        }
    }
    /**
     * Creates a new query builder that can be used to build a SQL query.
     */
    createQueryBuilder(entityOrRunner, alias, queryRunner) {
        if (alias) {
            alias = DriverUtils_1.DriverUtils.buildAlias(this.driver, undefined, alias);
            const metadata = this.getMetadata(entityOrRunner);
            return new SelectQueryBuilder_1.SelectQueryBuilder(this, queryRunner)
                .select(alias)
                .from(metadata.target, alias);
        }
        else {
            return new SelectQueryBuilder_1.SelectQueryBuilder(this, entityOrRunner);
        }
    }
    /**
     * Creates a query runner used for perform queries on a single database connection.
     * Using query runners you can control your queries to execute using single database connection and
     * manually control your database transaction.
     *
     * Mode is used in replication mode and indicates whatever you want to connect
     * to master database or any of slave databases.
     * If you perform writes you must use master database,
     * if you perform reads you can use slave databases.
     */
    createQueryRunner(mode = "master") {
        const queryRunner = this.driver.createQueryRunner(mode);
        const manager = this.createEntityManager(queryRunner);
        Object.assign(queryRunner, { manager: manager });
        return queryRunner;
    }
    /**
     * Gets entity metadata of the junction table (many-to-many table).
     */
    getManyToManyMetadata(entityTarget, relationPropertyPath) {
        const relationMetadata = this.getMetadata(entityTarget).findRelationWithPropertyPath(relationPropertyPath);
        if (!relationMetadata)
            throw new error_1.TypeORMError(`Relation "${relationPropertyPath}" was not found in ${entityTarget} entity.`);
        if (!relationMetadata.isManyToMany)
            throw new error_1.TypeORMError(`Relation "${entityTarget}#${relationPropertyPath}" does not have a many-to-many relationship.` +
                `You can use this method only on many-to-many relations.`);
        return relationMetadata.junctionEntityMetadata;
    }
    /**
     * Creates an Entity Manager for the current connection with the help of the EntityManagerFactory.
     */
    createEntityManager(queryRunner) {
        return new EntityManagerFactory_1.EntityManagerFactory().create(this, queryRunner);
    }
    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------
    /**
     * Finds exist entity metadata by the given entity class, target name or table name.
     */
    findMetadata(target) {
        const metadataFromMap = this.entityMetadatasMap.get(target);
        if (metadataFromMap)
            return metadataFromMap;
        for (let [_, metadata] of this.entityMetadatasMap) {
            if (InstanceChecker_1.InstanceChecker.isEntitySchema(target) &&
                metadata.name === target.options.name) {
                return metadata;
            }
            if (typeof target === "string") {
                if (target.indexOf(".") !== -1) {
                    if (metadata.tablePath === target) {
                        return metadata;
                    }
                }
                else {
                    if (metadata.name === target ||
                        metadata.tableName === target) {
                        return metadata;
                    }
                }
            }
            if (ObjectUtils_1.ObjectUtils.isObjectWithName(target) &&
                typeof target.name === "string") {
                if (target.name.indexOf(".") !== -1) {
                    if (metadata.tablePath === target.name) {
                        return metadata;
                    }
                }
                else {
                    if (metadata.name === target.name ||
                        metadata.tableName === target.name) {
                        return metadata;
                    }
                }
            }
        }
        return undefined;
    }
    /**
     * Builds metadatas for all registered classes inside this connection.
     */
    async buildMetadatas() {
        const connectionMetadataBuilder = new ConnectionMetadataBuilder_1.ConnectionMetadataBuilder(this);
        const entityMetadataValidator = new EntityMetadataValidator_1.EntityMetadataValidator();
        // create subscribers instances if they are not disallowed from high-level (for example they can disallowed from migrations run process)
        const flattenedSubscribers = ObjectUtils_1.ObjectUtils.mixedListToArray(this.options.subscribers || []);
        const subscribers = await connectionMetadataBuilder.buildSubscribers(flattenedSubscribers);
        ObjectUtils_1.ObjectUtils.assign(this, { subscribers: subscribers });
        // build entity metadatas
        const flattenedEntities = ObjectUtils_1.ObjectUtils.mixedListToArray(this.options.entities || []);
        const entityMetadatas = await connectionMetadataBuilder.buildEntityMetadatas(flattenedEntities);
        ObjectUtils_1.ObjectUtils.assign(this, {
            entityMetadatas: entityMetadatas,
            entityMetadatasMap: new Map(entityMetadatas.map((metadata) => [metadata.target, metadata])),
        });
        // create migration instances
        const flattenedMigrations = ObjectUtils_1.ObjectUtils.mixedListToArray(this.options.migrations || []);
        const migrations = await connectionMetadataBuilder.buildMigrations(flattenedMigrations);
        ObjectUtils_1.ObjectUtils.assign(this, { migrations: migrations });
        // validate all created entity metadatas to make sure user created entities are valid and correct
        entityMetadataValidator.validateMany(this.entityMetadatas.filter((metadata) => metadata.tableType !== "view"), this.driver);
        // set current data source to the entities
        for (let entityMetadata of entityMetadatas) {
            if (InstanceChecker_1.InstanceChecker.isBaseEntityConstructor(entityMetadata.target)) {
                entityMetadata.target.useDataSource(this);
            }
        }
    }
    /**
     * Get the replication mode SELECT queries should use for this datasource by default
     */
    defaultReplicationModeForReads() {
        if ("replication" in this.driver.options) {
            const value = this.driver.options.replication.defaultMode;
            if (value) {
                return value;
            }
        }
        return "slave";
    }
}
exports.DataSource = DataSource;

//# sourceMappingURL=DataSource.js.map

import { Driver } from '../driver/Driver';
import { registerQueryBuilders } from '../query-builder';
import { Repository } from '../repository/Repository';
import { EntitySubscriberInterface } from '../subscriber/EntitySubscriberInterface';
import { EntityTarget } from '../common/EntityTarget';
import { ObjectType } from '../common/ObjectType';
import { EntityManager } from '../entity-manager/EntityManager';
import { DefaultNamingStrategy } from '../naming-strategy/DefaultNamingStrategy';
import {
	CannotConnectAlreadyConnectedError,
	CannotExecuteNotConnectedError,
	EntityMetadataNotFoundError,
	QueryRunnerProviderAlreadyReleasedError,
	TypeORMError,
} from '../error';
import { TreeRepository } from '../repository/TreeRepository';
import { NamingStrategyInterface } from '../naming-strategy/NamingStrategyInterface';
import { EntityMetadata } from '../metadata/EntityMetadata';
import { Logger } from '../logger/Logger';
import { MigrationInterface } from '../migration/MigrationInterface';
import { MigrationExecutor } from '../migration/MigrationExecutor';
import { Migration } from '../migration/Migration';
import { EntityMetadataValidator } from '../metadata-builder/EntityMetadataValidator';
import { DataSourceOptions } from './DataSourceOptions';
import { EntityManagerFactory } from '../entity-manager/EntityManagerFactory';
import { DriverFactory } from '../driver/DriverFactory';
import { ConnectionMetadataBuilder } from '../connection/ConnectionMetadataBuilder';
import { QueryRunner } from '../query-runner/QueryRunner';
import { SelectQueryBuilder } from '../query-builder/SelectQueryBuilder';
import { LoggerFactory } from '../logger/LoggerFactory';
import { QueryResultCacheFactory } from '../cache/QueryResultCacheFactory';
import { QueryResultCache } from '../cache/QueryResultCache';
import { RelationLoader } from '../query-builder/RelationLoader';
import { ObjectUtils } from '../util/ObjectUtils';
import { IsolationLevel } from '../driver/types/IsolationLevel';
import { ReplicationMode } from '../driver/types/ReplicationMode';
import { RelationIdLoader } from '../query-builder/RelationIdLoader';
import { DriverUtils } from '../driver/DriverUtils';
import { InstanceChecker } from '../util/InstanceChecker';
import { ObjectLiteral } from '../common/ObjectLiteral';

registerQueryBuilders();

/**
 * DataSource is a pre-defined connection configuration to a specific database.
 * You can have multiple data sources connected (with multiple connections in it),
 * connected to multiple databases in your application.
 *
 * Before, it was called `Connection`, but now `Connection` is deprecated
 * because `Connection` isn't the best name for what it's actually is.
 */
export class DataSource {
	readonly '@instanceof' = Symbol.for('DataSource');

	// -------------------------------------------------------------------------
	// Public Readonly Properties
	// -------------------------------------------------------------------------

	/**
	 * Connection name.
	 *
	 * @deprecated we don't need names anymore since we are going to drop all related methods relying on this property.
	 */
	readonly name: string;

	/**
	 * Connection options.
	 */
	readonly options: DataSourceOptions;

	/**
	 * Indicates if DataSource is initialized or not.
	 */
	readonly isInitialized: boolean;

	/**
	 * Database driver used by this connection.
	 */
	driver: Driver;

	/**
	 * EntityManager of this connection.
	 */
	readonly manager: EntityManager;

	/**
	 * Naming strategy used in the connection.
	 */
	namingStrategy: NamingStrategyInterface;

	/**
	 * Name for the metadata table
	 */
	readonly metadataTableName: string;

	/**
	 * Logger used to log orm events.
	 */
	logger: Logger;

	/**
	 * Migration instances that are registered for this connection.
	 */
	readonly migrations: MigrationInterface[] = [];

	/**
	 * Entity subscriber instances that are registered for this connection.
	 */
	readonly subscribers: EntitySubscriberInterface<any>[] = [];

	/**
	 * All entity metadatas that are registered for this connection.
	 */
	readonly entityMetadatas: EntityMetadata[] = [];

	/**
	 * All entity metadatas that are registered for this connection.
	 * This is a copy of #.entityMetadatas property -> used for more performant searches.
	 */
	readonly entityMetadatasMap = new Map<EntityTarget<any>, EntityMetadata>();

	/**
	 * Used to work with query result cache.
	 */
	queryResultCache?: QueryResultCache;

	/**
	 * Used to load relations and work with lazy relations.
	 */
	readonly relationLoader: RelationLoader;

	readonly relationIdLoader: RelationIdLoader;

	// -------------------------------------------------------------------------
	// Constructor
	// -------------------------------------------------------------------------

	constructor(options: DataSourceOptions) {
		registerQueryBuilders();
		this.name = options.name || 'default';
		this.options = options;
		this.logger = new LoggerFactory().create(this.options.logger, this.options.logging);
		this.manager = this.createEntityManager();
		this.namingStrategy = options.namingStrategy || new DefaultNamingStrategy();
		this.metadataTableName = options.metadataTableName || 'typeorm_metadata';
		this.relationLoader = new RelationLoader(this);
		this.relationIdLoader = new RelationIdLoader(this);
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
	setOptions(options: Partial<DataSourceOptions>): this {
		Object.assign(this.options, options);

		if (options.logger || options.logging) {
			this.logger = new LoggerFactory().create(
				options.logger || this.options.logger,
				options.logging || this.options.logging,
			);
		}

		if (options.namingStrategy) {
			this.namingStrategy = options.namingStrategy;
		}

		if (options.cache) {
			this.queryResultCache = new QueryResultCacheFactory(this).create();
		}

		// todo: we must update the database in the driver as well, if it was set by setOptions method
		//  in the future we need to refactor the code and remove "database" from the driver, and instead
		//  use database (and options) from a single place - data source.
		if (options.database) {
			this.driver.database = DriverUtils.buildDriverOptions(this.options).database;
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
	async initialize(): Promise<this> {
		if (this.isInitialized) throw new CannotConnectAlreadyConnectedError(this.name);

		this.driver = await DriverFactory.create(this);
		this.queryResultCache = this.options.cache
			? new QueryResultCacheFactory(this).create()
			: undefined;

		// connect to the database via its driver
		await this.driver.connect();

		// connect to the cache-specific database if cache is enabled
		if (this.queryResultCache) await this.queryResultCache.connect();

		// set connected status for the current connection
		ObjectUtils.assign(this, { isInitialized: true });

		try {
			// build all metadatas registered in the current connection
			await this.buildMetadatas();

			await this.driver.afterConnect();

			// if option is set - drop schema once connection is done
			if (this.options.dropSchema) await this.dropDatabase();

			// if option is set - automatically synchronize a schema
			if (this.options.migrationsRun)
				await this.runMigrations({
					transaction: this.options.migrationsTransactionMode,
				});

			// if option is set - automatically synchronize a schema
			if (this.options.synchronize) await this.synchronize();
		} catch (error) {
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
	async connect(): Promise<this> {
		return this.initialize();
	}

	/**
	 * Closes connection with the database.
	 * Once connection is closed, you cannot use repositories or perform any operations except opening connection again.
	 */
	async destroy(): Promise<void> {
		if (!this.isInitialized) throw new CannotExecuteNotConnectedError(this.name);

		await this.driver.disconnect();

		// disconnect from the cache-specific database if cache was enabled
		if (this.queryResultCache) await this.queryResultCache.disconnect();

		ObjectUtils.assign(this, { isInitialized: false });
	}

	/**
	 * Closes connection with the database.
	 * Once connection is closed, you cannot use repositories or perform any operations except opening connection again.
	 *
	 * @deprecated use .destroy method instead
	 */
	async close(): Promise<void> {
		return this.destroy();
	}

	/**
	 * Creates database schema for all entities registered in this connection.
	 * Can be used only after connection to the database is established.
	 *
	 * @param dropBeforeSync If set to true then it drops the database with all its tables and data
	 */
	async synchronize(dropBeforeSync: boolean = false): Promise<void> {
		if (!this.isInitialized) throw new CannotExecuteNotConnectedError(this.name);

		if (dropBeforeSync) await this.dropDatabase();

		const schemaBuilder = this.driver.createSchemaBuilder();
		await schemaBuilder.build();
	}

	/**
	 * Drops the database and all its data.
	 * Be careful with this method on production since this method will erase all your database tables and their data.
	 * Can be used only after connection to the database is established.
	 */
	// TODO rename
	async dropDatabase(): Promise<void> {
		const queryRunner = this.createQueryRunner();
		try {
			if (DriverUtils.isSQLiteFamily(this.driver)) {
				const databases: string[] = [];
				this.entityMetadatas.forEach((metadata) => {
					if (metadata.database && databases.indexOf(metadata.database) === -1)
						databases.push(metadata.database);
				});
				if (databases.length === 0 && this.driver.database) {
					databases.push(this.driver.database);
				}

				if (databases.length === 0) {
					await queryRunner.clearDatabase();
				} else {
					for (const database of databases) {
						await queryRunner.clearDatabase(database);
					}
				}
			} else {
				await queryRunner.clearDatabase();
			}
		} finally {
			await queryRunner.release();
		}
	}

	/**
	 * Runs all pending migrations.
	 * Can be used only after connection to the database is established.
	 */
	async runMigrations(options?: {
		transaction?: 'all' | 'none' | 'each';
		fake?: boolean;
	}): Promise<Migration[]> {
		if (!this.isInitialized) throw new CannotExecuteNotConnectedError(this.name);

		const migrationExecutor = new MigrationExecutor(this);
		migrationExecutor.transaction =
			options?.transaction || this.options?.migrationsTransactionMode || 'all';
		migrationExecutor.fake = (options && options.fake) || false;

		const successMigrations = await migrationExecutor.executePendingMigrations();
		return successMigrations;
	}

	/**
	 * Reverts last executed migration.
	 * Can be used only after connection to the database is established.
	 */
	async undoLastMigration(options?: {
		transaction?: 'all' | 'none' | 'each';
		fake?: boolean;
	}): Promise<void> {
		if (!this.isInitialized) throw new CannotExecuteNotConnectedError(this.name);

		const migrationExecutor = new MigrationExecutor(this);
		migrationExecutor.transaction = (options && options.transaction) || 'all';
		migrationExecutor.fake = (options && options.fake) || false;

		await migrationExecutor.undoLastMigration();
	}

	/**
	 * Lists all migrations and whether they have been run.
	 * Returns true if there are pending migrations
	 */
	async showMigrations(): Promise<boolean> {
		if (!this.isInitialized) {
			throw new CannotExecuteNotConnectedError(this.name);
		}
		const migrationExecutor = new MigrationExecutor(this);
		return await migrationExecutor.showMigrations();
	}

	/**
	 * Checks if entity metadata exist for the given entity class, target name or table name.
	 */
	hasMetadata(target: EntityTarget<any>): boolean {
		return !!this.findMetadata(target);
	}

	/**
	 * Gets entity metadata for the given entity class or schema name.
	 */
	getMetadata(target: EntityTarget<any>): EntityMetadata {
		const metadata = this.findMetadata(target);
		if (!metadata) throw new EntityMetadataNotFoundError(target);

		return metadata;
	}

	/**
	 * Gets repository for the given entity.
	 */
	getRepository<Entity extends ObjectLiteral>(target: EntityTarget<Entity>): Repository<Entity> {
		return this.manager.getRepository(target);
	}

	/**
	 * Gets tree repository for the given entity class or name.
	 * Only tree-type entities can have a TreeRepository, like ones decorated with @Tree decorator.
	 */
	getTreeRepository<Entity extends ObjectLiteral>(
		target: EntityTarget<Entity>,
	): TreeRepository<Entity> {
		return this.manager.getTreeRepository(target);
	}

	/**
	 * Gets custom entity repository marked with @EntityRepository decorator.
	 *
	 * @deprecated use Repository.extend function to create a custom repository
	 */
	getCustomRepository<T>(customRepository: ObjectType<T>): T {
		return this.manager.getCustomRepository(customRepository);
	}

	/**
	 * Wraps given function execution (and all operations made there) into a transaction.
	 * All database operations must be executed using provided entity manager.
	 */
	async transaction<T>(runInTransaction: (entityManager: EntityManager) => Promise<T>): Promise<T>;
	async transaction<T>(
		isolationLevel: IsolationLevel,
		runInTransaction: (entityManager: EntityManager) => Promise<T>,
	): Promise<T>;
	async transaction<T>(
		isolationOrRunInTransaction: IsolationLevel | ((entityManager: EntityManager) => Promise<T>),
		runInTransactionParam?: (entityManager: EntityManager) => Promise<T>,
	): Promise<any> {
		return this.manager.transaction(
			isolationOrRunInTransaction as any,
			runInTransactionParam as any,
		);
	}

	/**
	 * Executes raw SQL query and returns raw database results.
	 */
	async query<T = any>(query: string, parameters?: any[], queryRunner?: QueryRunner): Promise<T> {
		if (queryRunner && queryRunner.isReleased) throw new QueryRunnerProviderAlreadyReleasedError();

		const usedQueryRunner = queryRunner || this.createQueryRunner();

		try {
			return await usedQueryRunner.query(query, parameters); // await is needed here because we are using finally
		} finally {
			if (!queryRunner) await usedQueryRunner.release();
		}
	}

	/**
	 * Creates a new query builder that can be used to build a SQL query.
	 */
	createQueryBuilder<Entity extends ObjectLiteral>(
		entityClass: EntityTarget<Entity>,
		alias: string,
		queryRunner?: QueryRunner,
	): SelectQueryBuilder<Entity>;

	/**
	 * Creates a new query builder that can be used to build a SQL query.
	 */
	createQueryBuilder(queryRunner?: QueryRunner): SelectQueryBuilder<any>;

	/**
	 * Creates a new query builder that can be used to build a SQL query.
	 */
	createQueryBuilder<Entity extends ObjectLiteral>(
		entityOrRunner?: EntityTarget<Entity> | QueryRunner,
		alias?: string,
		queryRunner?: QueryRunner,
	): SelectQueryBuilder<Entity> {
		if (alias) {
			alias = DriverUtils.buildAlias(this.driver, undefined, alias);
			const metadata = this.getMetadata(entityOrRunner as EntityTarget<Entity>);
			return new SelectQueryBuilder(this, queryRunner).select(alias).from(metadata.target, alias);
		} else {
			return new SelectQueryBuilder(this, entityOrRunner as QueryRunner | undefined);
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
	createQueryRunner(mode: ReplicationMode = 'master'): QueryRunner {
		const queryRunner = this.driver.createQueryRunner(mode);
		const manager = this.createEntityManager(queryRunner);
		Object.assign(queryRunner, { manager: manager });
		return queryRunner;
	}

	/**
	 * Gets entity metadata of the junction table (many-to-many table).
	 */
	getManyToManyMetadata(entityTarget: EntityTarget<any>, relationPropertyPath: string) {
		const relationMetadata =
			this.getMetadata(entityTarget).findRelationWithPropertyPath(relationPropertyPath);
		if (!relationMetadata)
			throw new TypeORMError(
				`Relation "${relationPropertyPath}" was not found in ${entityTarget} entity.`,
			);
		if (!relationMetadata.isManyToMany)
			throw new TypeORMError(
				`Relation "${entityTarget}#${relationPropertyPath}" does not have a many-to-many relationship.` +
					`You can use this method only on many-to-many relations.`,
			);

		return relationMetadata.junctionEntityMetadata;
	}

	/**
	 * Creates an Entity Manager for the current connection with the help of the EntityManagerFactory.
	 */
	createEntityManager(queryRunner?: QueryRunner): EntityManager {
		return new EntityManagerFactory().create(this, queryRunner);
	}

	// -------------------------------------------------------------------------
	// Protected Methods
	// -------------------------------------------------------------------------

	/**
	 * Finds exist entity metadata by the given entity class, target name or table name.
	 */
	protected findMetadata(target: EntityTarget<any>): EntityMetadata | undefined {
		const metadataFromMap = this.entityMetadatasMap.get(target);
		if (metadataFromMap) return metadataFromMap;

		for (let [_, metadata] of this.entityMetadatasMap) {
			if (InstanceChecker.isEntitySchema(target) && metadata.name === target.options.name) {
				return metadata;
			}
			if (typeof target === 'string') {
				if (target.indexOf('.') !== -1) {
					if (metadata.tablePath === target) {
						return metadata;
					}
				} else {
					if (metadata.name === target || metadata.tableName === target) {
						return metadata;
					}
				}
			}
			if (ObjectUtils.isObjectWithName(target) && typeof target.name === 'string') {
				if (target.name.indexOf('.') !== -1) {
					if (metadata.tablePath === target.name) {
						return metadata;
					}
				} else {
					if (metadata.name === target.name || metadata.tableName === target.name) {
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
	protected async buildMetadatas(): Promise<void> {
		const connectionMetadataBuilder = new ConnectionMetadataBuilder(this);
		const entityMetadataValidator = new EntityMetadataValidator();

		// create subscribers instances if they are not disallowed from high-level (for example they can disallowed from migrations run process)
		const flattenedSubscribers = ObjectUtils.mixedListToArray(this.options.subscribers || []);
		const subscribers = await connectionMetadataBuilder.buildSubscribers(flattenedSubscribers);
		ObjectUtils.assign(this, { subscribers: subscribers });

		// build entity metadatas
		const flattenedEntities = ObjectUtils.mixedListToArray(this.options.entities || []);
		const entityMetadatas = await connectionMetadataBuilder.buildEntityMetadatas(flattenedEntities);
		ObjectUtils.assign(this, {
			entityMetadatas: entityMetadatas,
			entityMetadatasMap: new Map(entityMetadatas.map((metadata) => [metadata.target, metadata])),
		});

		// create migration instances
		const flattenedMigrations = ObjectUtils.mixedListToArray(this.options.migrations || []);
		const migrations = await connectionMetadataBuilder.buildMigrations(flattenedMigrations);
		ObjectUtils.assign(this, { migrations: migrations });

		// validate all created entity metadatas to make sure user created entities are valid and correct
		entityMetadataValidator.validateMany(
			this.entityMetadatas.filter((metadata) => metadata.tableType !== 'view'),
			this.driver,
		);

		// set current data source to the entities
		for (let entityMetadata of entityMetadatas) {
			if (InstanceChecker.isBaseEntityConstructor(entityMetadata.target)) {
				entityMetadata.target.useDataSource(this);
			}
		}
	}

	/**
	 * Get the replication mode SELECT queries should use for this datasource by default
	 */
	defaultReplicationModeForReads(): ReplicationMode {
		if ('replication' in this.driver.options) {
			const value = (
				this.driver.options.replication as {
					defaultMode?: ReplicationMode;
				}
			).defaultMode;
			if (value) {
				return value;
			}
		}
		return 'slave';
	}
}

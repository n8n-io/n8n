import {
	DatabaseType,
	DataSource,
	DataSourceOptions,
	Driver,
	EntitySchema,
	EntitySubscriberInterface,
	getMetadataArgsStorage,
	InsertEvent,
	Logger,
	NamingStrategyInterface,
	QueryRunner,
	Table,
} from '../../src';
import { QueryResultCache } from '../../src/cache/QueryResultCache';
import path from 'path';
import { EntitySubscriberMetadataArgs } from '../../src/metadata-args/EntitySubscriberMetadataArgs';

/**
 * Interface in which data is stored in ormconfig.json of the project.
 */
export type TestingConnectionOptions = DataSourceOptions & {
	/**
	 * Indicates if this connection should be skipped.
	 */
	skip?: boolean;

	/**
	 * If set to true then tests for this driver wont run until implicitly defined "enabledDrivers" section.
	 */
	disabledIfNotEnabledImplicitly?: boolean;
};

/**
 * Options used to create a connection for testing purposes.
 */
export interface TestingOptions {
	/**
	 * Dirname of the test directory.
	 * If specified, entities will be loaded from that directory.
	 */
	__dirname?: string;

	/**
	 * Connection name to be overridden.
	 * This can be used to create multiple connections with single connection configuration.
	 */
	name?: string;

	/**
	 * List of enabled drivers for the given test suite.
	 */
	enabledDrivers?: DatabaseType[];

	/**
	 * List of disabled drivers for the given test suite.
	 */
	disabledDrivers?: DatabaseType[];

	/**
	 * Entities needs to be included in the connection for the given test suite.
	 */
	entities?: (string | Function | EntitySchema<any>)[];

	/**
	 * Migrations needs to be included in connection for the given test suite.
	 */
	migrations?: (string | Function)[];

	/**
	 * Subscribers needs to be included in the connection for the given test suite.
	 */
	subscribers?: (string | Function)[];

	/**
	 * Indicates if schema sync should be performed or not.
	 */
	schemaCreate?: boolean;

	/**
	 * Indicates if schema should be dropped on connection setup.
	 */
	dropSchema?: boolean;

	/**
	 * Enables or disables logging.
	 */
	logging?: boolean;

	/**
	 * Schema name used for postgres driver.
	 */
	schema?: string;

	/**
	 * Naming strategy defines how auto-generated names for such things like table name, or table column gonna be
	 * generated.
	 */
	namingStrategy?: NamingStrategyInterface;

	/**
	 * Typeorm metadata table name, in case of different name from "typeorm_metadata".
	 * Accepts single string name.
	 */
	metadataTableName?: string;

	/**
	 * Schema name used for postgres driver.
	 */
	cache?:
		| boolean
		| {
				/**
				 * Type of caching.
				 *
				 * - "database" means cached values will be stored in the separate table in database. This is default value.
				 */
				readonly type?: 'database';

				/**
				 * Factory function for custom cache providers that implement QueryResultCache.
				 */
				readonly provider?: (connection: DataSource) => QueryResultCache;

				/**
				 * If set to true then queries (using find methods and QueryBuilder's methods) will always be cached.
				 */
				alwaysEnabled?: boolean;

				/**
				 * Time in milliseconds in which cache will expire.
				 * This can be setup per-query.
				 * Default value is 1000 which is equivalent to 1 second.
				 */
				duration?: number;
		  };

	/**
	 * Options that may be specific to a driver.
	 * They are passed down to the enabled drivers.
	 */
	driverSpecific?: Object;

	/**
	 * Factory to create a logger for each test connection.
	 */
	createLogger?: () => 'advanced-console' | 'simple-console' | 'file' | 'debug' | Logger;

	relationLoadStrategy?: 'join' | 'query';

	/**
	 * Allows automatic isolation of where clauses
	 */
	isolateWhereStatements?: boolean;
}

/**
 * Creates a testing connection options for the given driver type based on the configuration in the ormconfig.json
 * and given options that can override some of its configuration for the test-specific use case.
 */
export function setupSingleTestingConnection(
	driverType: DatabaseType,
	options: TestingOptions,
): DataSourceOptions | undefined {
	const testingConnections = setupTestingConnections({
		name: options.name ? options.name : undefined,
		entities: options.entities ? options.entities : [],
		subscribers: options.subscribers ? options.subscribers : [],
		dropSchema: options.dropSchema ? options.dropSchema : false,
		schemaCreate: options.schemaCreate ? options.schemaCreate : false,
		enabledDrivers: [driverType],
		cache: options.cache,
		schema: options.schema ? options.schema : undefined,
		namingStrategy: options.namingStrategy ? options.namingStrategy : undefined,
	});
	if (!testingConnections.length) return undefined;

	return testingConnections[0];
}

/**
 * Loads test connection options from ormconfig.json file.
 */
function getOrmFilepath(): string {
	try {
		try {
			// first checks build/compiled
			// useful for docker containers in order to provide a custom config
			return require.resolve(__dirname + '/../../ormconfig.json');
		} catch (err) {
			// fallbacks to the root config
			return require.resolve(__dirname + '/../../../../ormconfig.json');
		}
	} catch (err) {
		throw new Error(
			`Cannot find ormconfig.json file in the root of the project. To run tests please create ormconfig.json file` +
				` in the root of the project (near ormconfig.json.dist, you need to copy ormconfig.json.dist into ormconfig.json` +
				` and change all database settings to match your local environment settings).`,
		);
	}
}

export function getTypeOrmConfig(): TestingConnectionOptions[] {
	return require(getOrmFilepath());
}

/**
 * Creates a testing connections options based on the configuration in the ormconfig.json
 * and given options that can override some of its configuration for the test-specific use case.
 */
export function setupTestingConnections(options?: TestingOptions): DataSourceOptions[] {
	const ormConfigConnectionOptionsArray = getTypeOrmConfig();

	if (!ormConfigConnectionOptionsArray.length)
		throw new Error(
			`No connections setup in ormconfig.json file. Please create configurations for each database type to run tests.`,
		);

	return ormConfigConnectionOptionsArray
		.filter((connectionOptions) => {
			if (connectionOptions.skip === true) return false;

			if (options && options.enabledDrivers && options.enabledDrivers.length)
				return options.enabledDrivers.indexOf(connectionOptions.type!) !== -1; // ! is temporary

			if (
				options?.disabledDrivers?.length &&
				options.disabledDrivers.some((driver) => driver === connectionOptions.type)
			)
				return false;

			if (connectionOptions.disabledIfNotEnabledImplicitly === true) return false;

			return true;
		})
		.map((connectionOptions) => {
			let newOptions: any = Object.assign({}, connectionOptions as DataSourceOptions, {
				name: options && options.name ? options.name : connectionOptions.name,
				entities: options && options.entities ? options.entities : [],
				migrations: options && options.migrations ? options.migrations : [],
				subscribers: options && options.subscribers ? options.subscribers : [],
				dropSchema: options && options.dropSchema !== undefined ? options.dropSchema : false,
				cache: options ? options.cache : undefined,
			});
			if (options && options.driverSpecific)
				newOptions = Object.assign({}, options.driverSpecific, newOptions);
			if (options && options.schemaCreate) newOptions.synchronize = options.schemaCreate;
			if (options && options.schema) newOptions.schema = options.schema;
			if (options && options.logging !== undefined) newOptions.logging = options.logging;
			if (options && options.createLogger !== undefined) newOptions.logger = options.createLogger();
			if (options && options.__dirname)
				newOptions.entities = [options.__dirname + '/entity/*{.js,.ts}'];
			if (options && options.__dirname)
				newOptions.migrations = [options.__dirname + '/migration/*{.js,.ts}'];
			if (options && options.namingStrategy) newOptions.namingStrategy = options.namingStrategy;
			if (options && options.metadataTableName)
				newOptions.metadataTableName = options.metadataTableName;
			if (options && options.relationLoadStrategy)
				newOptions.relationLoadStrategy = options.relationLoadStrategy;
			if (options && options.isolateWhereStatements)
				newOptions.isolateWhereStatements = options.isolateWhereStatements;

			newOptions.baseDirectory = path.dirname(getOrmFilepath());

			return newOptions;
		});
}

class GeneratedColumnReplacerSubscriber implements EntitySubscriberInterface {
	static globalIncrementValues: { [entityName: string]: number } = {};
	beforeInsert(event: InsertEvent<any>): Promise<any> | void {
		event.metadata.columns.map((column) => {
			if (column.generationStrategy === 'increment') {
				if (!GeneratedColumnReplacerSubscriber.globalIncrementValues[event.metadata.tableName]) {
					GeneratedColumnReplacerSubscriber.globalIncrementValues[event.metadata.tableName] = 0;
				}
				GeneratedColumnReplacerSubscriber.globalIncrementValues[event.metadata.tableName] += 1;

				column.setEntityValue(
					event.entity,
					GeneratedColumnReplacerSubscriber.globalIncrementValues[event.metadata.tableName],
				);
			} else if (
				(column.isCreateDate || column.isUpdateDate) &&
				!column.getEntityValue(event.entity)
			) {
				column.setEntityValue(event.entity, new Date());
			} else if (
				!column.isCreateDate &&
				!column.isUpdateDate &&
				!column.isVirtual &&
				column.default !== undefined &&
				column.getEntityValue(event.entity) === undefined
			) {
				column.setEntityValue(event.entity, column.default);
			}
		});
	}
}
getMetadataArgsStorage().entitySubscribers.push({
	target: GeneratedColumnReplacerSubscriber,
} as EntitySubscriberMetadataArgs);

export function createDataSource(options: DataSourceOptions): DataSource {
	return new DataSource(options);
}

/**
 * Creates a testing connections based on the configuration in the ormconfig.json
 * and given options that can override some of its configuration for the test-specific use case.
 */
export async function createTestingConnections(options?: TestingOptions): Promise<DataSource[]> {
	const dataSourceOptions = setupTestingConnections(options);
	const dataSources: DataSource[] = [];
	for (let options of dataSourceOptions) {
		const dataSource = createDataSource(options);
		await dataSource.initialize();
		dataSources.push(dataSource);
	}

	await Promise.all(
		dataSources.map(async (connection) => {
			// create new databases
			const databases: string[] = [];
			connection.entityMetadatas.forEach((metadata) => {
				if (metadata.database && databases.indexOf(metadata.database) === -1)
					databases.push(metadata.database);
			});

			const queryRunner = connection.createQueryRunner();

			for (const database of databases) {
				await queryRunner.createDatabase(database, true);
			}

			// create new schemas
			const schemaPaths: Set<string> = new Set();
			connection.entityMetadatas
				.filter((entityMetadata) => !!entityMetadata.schema)
				.forEach((entityMetadata) => {
					let schema = entityMetadata.schema!;

					if (entityMetadata.database) {
						schema = `${entityMetadata.database}.${schema}`;
					}

					schemaPaths.add(schema);
				});

			const schema = connection.driver.options?.hasOwnProperty('schema')
				? (connection.driver.options as any).schema
				: undefined;

			if (schema) {
				schemaPaths.add(schema);
			}

			for (const schemaPath of schemaPaths) {
				try {
					await queryRunner.createSchema(schemaPath, true);
				} catch (e) {
					// Do nothing
				}
			}

			await queryRunner.release();
		}),
	);

	return dataSources;
}

/**
 * Closes testing connections if they are connected.
 */
export function closeTestingConnections(connections: DataSource[]) {
	return Promise.all(
		connections.map((connection) =>
			connection && connection.isInitialized ? connection.destroy() : undefined,
		),
	);
}

/**
 * Reloads all databases for all given connections.
 */
export async function reloadTestingDatabases(connections: DataSource[], async = true) {
	GeneratedColumnReplacerSubscriber.globalIncrementValues = {};
	if (async) {
		await Promise.all(connections.map((connection) => connection.synchronize(true)));
	} else {
		for (const connection of connections) {
			await connection.synchronize(true);
		}
	}
}

/**
 * Generates random text array with custom length.
 */
export function generateRandomText(length: number): string {
	let text = '';
	const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

	for (let i = 0; i <= length; i++)
		text += characters.charAt(Math.floor(Math.random() * characters.length));

	return text;
}

export function sleep(ms: number): Promise<void> {
	return new Promise<void>((ok) => {
		setTimeout(ok, ms);
	});
}

/**
 * Creates typeorm service table for storing user defined Views and generate columns.
 */
export async function createTypeormMetadataTable(driver: Driver, queryRunner: QueryRunner) {
	const schema = driver.schema;
	const database = driver.database;
	const typeormMetadataTable = driver.buildTableName('typeorm_metadata', schema, database);

	await queryRunner.createTable(
		new Table({
			database: database,
			schema: schema,
			name: typeormMetadataTable,
			columns: [
				{
					name: 'type',
					type: driver.normalizeType({
						type: driver.mappedDataTypes.metadataType,
					}),
					isNullable: false,
				},
				{
					name: 'database',
					type: driver.normalizeType({
						type: driver.mappedDataTypes.metadataDatabase,
					}),
					isNullable: true,
				},
				{
					name: 'schema',
					type: driver.normalizeType({
						type: driver.mappedDataTypes.metadataSchema,
					}),
					isNullable: true,
				},
				{
					name: 'table',
					type: driver.normalizeType({
						type: driver.mappedDataTypes.metadataTable,
					}),
					isNullable: true,
				},
				{
					name: 'name',
					type: driver.normalizeType({
						type: driver.mappedDataTypes.metadataName,
					}),
					isNullable: true,
				},
				{
					name: 'value',
					type: driver.normalizeType({
						type: driver.mappedDataTypes.metadataValue,
					}),
					isNullable: true,
				},
			],
		}),
		true,
	);
}

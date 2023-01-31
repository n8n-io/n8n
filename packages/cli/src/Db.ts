/* eslint-disable import/no-mutable-exports */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable no-case-declarations */
/* eslint-disable @typescript-eslint/naming-convention */
import type {
	DataSourceOptions as ConnectionOptions,
	EntityManager,
	EntityTarget,
	LoggerOptions,
	ObjectLiteral,
	Repository,
} from 'typeorm';
import { DataSource as Connection } from 'typeorm';
import type { TlsOptions } from 'tls';
import type { DatabaseType, IDatabaseCollections } from '@/Interfaces';

import config from '@/config';

import { entities } from '@db/entities';
import {
	getMariaDBConnectionOptions,
	getMysqlConnectionOptions,
	getOptionOverrides,
	getPostgresConnectionOptions,
	getSqliteConnectionOptions,
} from '@db/config';

export let isInitialized = false;
export const collections = {} as IDatabaseCollections;

export let connection: Connection;

export const getConnection = () => connection!;

export async function transaction<T>(fn: (entityManager: EntityManager) => Promise<T>): Promise<T> {
	return connection.transaction(fn);
}

export function linkRepository<Entity extends ObjectLiteral>(
	entityClass: EntityTarget<Entity>,
): Repository<Entity> {
	return connection.getRepository(entityClass);
}

export function getConnectionOptions(dbType: DatabaseType): ConnectionOptions {
	switch (dbType) {
		case 'postgresdb':
			const sslCa = config.getEnv('database.postgresdb.ssl.ca');
			const sslCert = config.getEnv('database.postgresdb.ssl.cert');
			const sslKey = config.getEnv('database.postgresdb.ssl.key');
			const sslRejectUnauthorized = config.getEnv('database.postgresdb.ssl.rejectUnauthorized');

			let ssl: TlsOptions | undefined;
			if (sslCa !== '' || sslCert !== '' || sslKey !== '' || !sslRejectUnauthorized) {
				ssl = {
					ca: sslCa || undefined,
					cert: sslCert || undefined,
					key: sslKey || undefined,
					rejectUnauthorized: sslRejectUnauthorized,
				};
			}

			return {
				...getPostgresConnectionOptions(),
				...getOptionOverrides('postgresdb'),
				ssl,
			};

		case 'mariadb':
		case 'mysqldb':
			return {
				...(dbType === 'mysqldb' ? getMysqlConnectionOptions() : getMariaDBConnectionOptions()),
				...getOptionOverrides('mysqldb'),
				timezone: 'Z', // set UTC as default
			};

		case 'sqlite':
			return getSqliteConnectionOptions();

		default:
			throw new Error(`The database "${dbType}" is currently not supported!`);
	}
}

export async function init(
	testConnectionOptions?: ConnectionOptions,
): Promise<IDatabaseCollections> {
	if (isInitialized) return collections;

	const dbType = config.getEnv('database.type');
	const connectionOptions = testConnectionOptions ?? getConnectionOptions(dbType);

	let loggingOption: LoggerOptions = config.getEnv('database.logging.enabled');

	if (loggingOption) {
		const optionsString = config.getEnv('database.logging.options').replace(/\s+/g, '');

		if (optionsString === 'all') {
			loggingOption = optionsString;
		} else {
			loggingOption = optionsString.split(',') as LoggerOptions;
		}
	}

	const maxQueryExecutionTime = config.getEnv('database.logging.maxQueryExecutionTime');

	Object.assign(connectionOptions, {
		entities: Object.values(entities),
		synchronize: false,
		logging: loggingOption,
		maxQueryExecutionTime,
		migrationsTransactionMode: 'each',
	});

	connection = new Connection(connectionOptions);
	await connection.initialize();

	if (dbType === 'postgresdb') {
		const schema = config.getEnv('database.postgresdb.schema');
		const searchPath = ['public'];
		if (schema !== 'public') {
			await connection.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
			searchPath.unshift(schema);
		}
		await connection.query(`SET search_path TO ${searchPath.join(',')};`);
	}

	if (!testConnectionOptions && dbType === 'sqlite') {
		// This specific migration changes database metadata.
		// A field is now nullable. We need to reconnect so that
		// n8n knows it has changed. Happens only on sqlite.
		let migrations = [];
		try {
			const entityPrefix = config.getEnv('database.tablePrefix');
			migrations = await connection.query(
				`SELECT id FROM ${entityPrefix}migrations where name = "MakeStoppedAtNullable1607431743769"`,
			);
		} catch (error) {
			// Migration table does not exist yet - it will be created after migrations run for the first time.
		}

		// If you remove this call, remember to turn back on the
		// setting to run migrations automatically above.
		await connection.runMigrations({ transaction: 'each' });

		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		if (migrations.length === 0) {
			await connection.destroy();
			connection = new Connection(connectionOptions);
			await connection.initialize();
		}
	} else {
		await connection.runMigrations({ transaction: 'each' });
	}

	collections.Credentials = linkRepository(entities.CredentialsEntity);
	collections.Execution = linkRepository(entities.ExecutionEntity);
	collections.Workflow = linkRepository(entities.WorkflowEntity);
	collections.Webhook = linkRepository(entities.WebhookEntity);
	collections.Tag = linkRepository(entities.TagEntity);
	collections.Role = linkRepository(entities.Role);
	collections.User = linkRepository(entities.User);
	collections.AuthIdentity = linkRepository(entities.AuthIdentity);
	collections.AuthProviderSyncHistory = linkRepository(entities.AuthProviderSyncHistory);
	collections.SharedCredentials = linkRepository(entities.SharedCredentials);
	collections.SharedWorkflow = linkRepository(entities.SharedWorkflow);
	collections.Settings = linkRepository(entities.Settings);
	collections.InstalledPackages = linkRepository(entities.InstalledPackages);
	collections.InstalledNodes = linkRepository(entities.InstalledNodes);
	collections.WorkflowStatistics = linkRepository(entities.WorkflowStatistics);
	collections.EventDestinations = linkRepository(entities.EventDestinations);

	isInitialized = true;

	return collections;
}

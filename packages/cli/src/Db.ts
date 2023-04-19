/* eslint-disable import/no-mutable-exports */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable no-case-declarations */
/* eslint-disable @typescript-eslint/naming-convention */
import { Container } from 'typedi';
import type { DataSourceOptions as ConnectionOptions, EntityManager, LoggerOptions } from 'typeorm';
import { DataSource as Connection } from 'typeorm';
import type { TlsOptions } from 'tls';
import type { IDatabaseCollections } from '@/Interfaces';

import config from '@/config';

import { entities } from '@db/entities';
import {
	getMariaDBConnectionOptions,
	getMysqlConnectionOptions,
	getOptionOverrides,
	getPostgresConnectionOptions,
	getSqliteConnectionOptions,
} from '@db/config';
import { wrapMigration } from '@db/utils/migrationHelpers';
import type { DatabaseType, Migration } from '@db/types';
import {
	AuthIdentityRepository,
	AuthProviderSyncHistoryRepository,
	CredentialsRepository,
	EventDestinationsRepository,
	ExecutionMetadataRepository,
	ExecutionRepository,
	InstalledNodesRepository,
	InstalledPackagesRepository,
	RoleRepository,
	SettingsRepository,
	SharedCredentialsRepository,
	SharedWorkflowRepository,
	TagRepository,
	UserRepository,
	VariablesRepository,
	WebhookRepository,
	WorkflowRepository,
	WorkflowStatisticsRepository,
	WorkflowTagMappingRepository,
} from '@db/repositories';

export let isInitialized = false;
export const collections = {} as IDatabaseCollections;

let connection: Connection;

export const getConnection = () => connection!;

export async function transaction<T>(fn: (entityManager: EntityManager) => Promise<T>): Promise<T> {
	return connection.transaction(fn);
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
		migrationsRun: false,
	});

	connection = new Connection(connectionOptions);
	Container.set(Connection, connection);
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

	(connectionOptions.migrations as Migration[]).forEach(wrapMigration);

	if (!testConnectionOptions && dbType === 'sqlite') {
		// This specific migration changes database metadata.
		// A field is now nullable. We need to reconnect so that
		// n8n knows it has changed. Happens only on sqlite.
		let migrations = [];
		try {
			const tablePrefix = config.getEnv('database.tablePrefix');
			migrations = await connection.query(
				`SELECT id FROM ${tablePrefix}migrations where name = "MakeStoppedAtNullable1607431743769"`,
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
			Container.set(Connection, connection);
			await connection.initialize();
		}
	} else {
		await connection.runMigrations({ transaction: 'each' });
	}

	collections.AuthIdentity = Container.get(AuthIdentityRepository);
	collections.AuthProviderSyncHistory = Container.get(AuthProviderSyncHistoryRepository);
	collections.Credentials = Container.get(CredentialsRepository);
	collections.EventDestinations = Container.get(EventDestinationsRepository);
	collections.Execution = Container.get(ExecutionRepository);
	collections.ExecutionMetadata = Container.get(ExecutionMetadataRepository);
	collections.InstalledNodes = Container.get(InstalledNodesRepository);
	collections.InstalledPackages = Container.get(InstalledPackagesRepository);
	collections.Role = Container.get(RoleRepository);
	collections.Settings = Container.get(SettingsRepository);
	collections.SharedCredentials = Container.get(SharedCredentialsRepository);
	collections.SharedWorkflow = Container.get(SharedWorkflowRepository);
	collections.Tag = Container.get(TagRepository);
	collections.User = Container.get(UserRepository);
	collections.Variables = Container.get(VariablesRepository);
	collections.Webhook = Container.get(WebhookRepository);
	collections.Workflow = Container.get(WorkflowRepository);
	collections.WorkflowStatistics = Container.get(WorkflowStatisticsRepository);
	collections.WorkflowTagMapping = Container.get(WorkflowTagMappingRepository);

	isInitialized = true;

	return collections;
}

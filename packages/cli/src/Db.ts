/* eslint-disable @typescript-eslint/restrict-template-expressions */

import { Container } from 'typedi';
import type { DataSourceOptions as ConnectionOptions, EntityManager, LoggerOptions } from 'typeorm';
import { DataSource as Connection } from 'typeorm';
import type { TlsOptions } from 'tls';
import { ErrorReporterProxy as ErrorReporter } from 'n8n-workflow';

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
import { inTest } from '@/constants';
import { wrapMigration } from '@db/utils/migrationHelpers';
import type { DatabaseType, Migration } from '@db/types';
import {
	AuthIdentityRepository,
	AuthProviderSyncHistoryRepository,
	CredentialsRepository,
	EventDestinationsRepository,
	ExecutionDataRepository,
	ExecutionMetadataRepository,
	ExecutionRepository,
	InstalledNodesRepository,
	InstalledPackagesRepository,
	RoleRepository,
	SettingsRepository,
	SharedCredentialsRepository,
	SharedWorkflowRepository,
	UserRepository,
	VariablesRepository,
	WorkflowRepository,
	WorkflowStatisticsRepository,
	WorkflowTagMappingRepository,
} from '@db/repositories';

export const collections = {} as IDatabaseCollections;

let connection: Connection;

export const getConnection = () => connection!;

type ConnectionState = {
	connected: boolean;
	migrated: boolean;
};

export const connectionState: ConnectionState = {
	connected: false,
	migrated: false,
};

// Ping DB connection every 2 seconds
let pingTimer: NodeJS.Timer | undefined;
if (!inTest) {
	const pingDBFn = async () => {
		if (connection?.isInitialized) {
			try {
				await connection.query('SELECT 1');
				connectionState.connected = true;
				return;
			} catch (error) {
				ErrorReporter.error(error);
			} finally {
				pingTimer = setTimeout(pingDBFn, 2000);
			}
		}
		connectionState.connected = false;
	};
	pingTimer = setTimeout(pingDBFn, 2000);
}

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

export async function init(testConnectionOptions?: ConnectionOptions): Promise<void> {
	if (connectionState.connected) return;

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

	connectionState.connected = true;

	/**
	 * @important Do not add to these collections. Inject the repository as a dependency instead.
	 */
	collections.AuthIdentity = Container.get(AuthIdentityRepository);
	collections.AuthProviderSyncHistory = Container.get(AuthProviderSyncHistoryRepository);
	collections.EventDestinations = Container.get(EventDestinationsRepository);
	collections.Execution = Container.get(ExecutionRepository);
	collections.ExecutionData = Container.get(ExecutionDataRepository);
	collections.ExecutionMetadata = Container.get(ExecutionMetadataRepository);
	collections.InstalledNodes = Container.get(InstalledNodesRepository);
	collections.InstalledPackages = Container.get(InstalledPackagesRepository);
	collections.SharedCredentials = Container.get(SharedCredentialsRepository);
	collections.SharedWorkflow = Container.get(SharedWorkflowRepository);
	collections.Variables = Container.get(VariablesRepository);
	collections.WorkflowStatistics = Container.get(WorkflowStatisticsRepository);
	collections.WorkflowTagMapping = Container.get(WorkflowTagMappingRepository);

	/**
	 * @important Do not remove these collections until cloud hooks are backwards compatible.
	 */
	collections.Role = Container.get(RoleRepository);
	collections.User = Container.get(UserRepository);
	collections.Settings = Container.get(SettingsRepository);
	collections.Credentials = Container.get(CredentialsRepository);
	collections.Workflow = Container.get(WorkflowRepository);
}

export async function migrate() {
	(connection.options.migrations as Migration[]).forEach(wrapMigration);
	await connection.runMigrations({ transaction: 'each' });
	connectionState.migrated = true;
}

export const close = async () => {
	if (pingTimer) {
		clearTimeout(pingTimer);
		pingTimer = undefined;
	}

	if (connection.isInitialized) await connection.destroy();
};

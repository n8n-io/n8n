/* eslint-disable import/no-cycle */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable no-case-declarations */
/* eslint-disable @typescript-eslint/naming-convention */
import { UserSettings } from 'n8n-core';
import {
	Connection,
	ConnectionOptions,
	createConnection,
	EntityManager,
	EntityTarget,
	getRepository,
	LoggerOptions,
	Repository,
} from 'typeorm';
import { TlsOptions } from 'tls';
import * as path from 'path';
// eslint-disable-next-line import/no-cycle
import { DatabaseType, GenericHelpers, IDatabaseCollections } from '.';

import * as config from '../config';

// eslint-disable-next-line import/no-cycle
import { entities } from './databases/entities';

import { postgresMigrations } from './databases/postgresdb/migrations';
import { mysqlMigrations } from './databases/mysqldb/migrations';
import { sqliteMigrations } from './databases/sqlite/migrations';

export const collections: IDatabaseCollections = {
	Credentials: null,
	Execution: null,
	Workflow: null,
	Webhook: null,
	Tag: null,
	Role: null,
	User: null,
	SharedCredentials: null,
	SharedWorkflow: null,
	Settings: null,
};

let connection: Connection;

export async function transaction<T>(fn: (entityManager: EntityManager) => Promise<T>): Promise<T> {
	return connection.transaction(fn);
}

export function linkRepository<Entity>(entityClass: EntityTarget<Entity>): Repository<Entity> {
	return getRepository(entityClass, connection.name);
}

export async function init(
	testConnectionOptions?: ConnectionOptions,
): Promise<IDatabaseCollections> {
	const dbType = (await GenericHelpers.getConfigValue('database.type')) as DatabaseType;
	const n8nFolder = UserSettings.getUserN8nFolderPath();

	let connectionOptions: ConnectionOptions;

	const entityPrefix = config.get('database.tablePrefix');

	if (testConnectionOptions) {
		connectionOptions = testConnectionOptions;
	} else {
		switch (dbType) {
			case 'postgresdb':
				const sslCa = (await GenericHelpers.getConfigValue('database.postgresdb.ssl.ca')) as string;
				const sslCert = (await GenericHelpers.getConfigValue(
					'database.postgresdb.ssl.cert',
				)) as string;
				const sslKey = (await GenericHelpers.getConfigValue(
					'database.postgresdb.ssl.key',
				)) as string;
				const sslRejectUnauthorized = (await GenericHelpers.getConfigValue(
					'database.postgresdb.ssl.rejectUnauthorized',
				)) as boolean;

				let ssl: TlsOptions | undefined;
				if (sslCa !== '' || sslCert !== '' || sslKey !== '' || !sslRejectUnauthorized) {
					ssl = {
						ca: sslCa || undefined,
						cert: sslCert || undefined,
						key: sslKey || undefined,
						rejectUnauthorized: sslRejectUnauthorized,
					};
				}

				connectionOptions = {
					type: 'postgres',
					entityPrefix,
					database: (await GenericHelpers.getConfigValue('database.postgresdb.database')) as string,
					host: (await GenericHelpers.getConfigValue('database.postgresdb.host')) as string,
					password: (await GenericHelpers.getConfigValue('database.postgresdb.password')) as string,
					port: (await GenericHelpers.getConfigValue('database.postgresdb.port')) as number,
					username: (await GenericHelpers.getConfigValue('database.postgresdb.user')) as string,
					schema: config.get('database.postgresdb.schema'),
					migrations: postgresMigrations,
					migrationsRun: true,
					migrationsTableName: `${entityPrefix}migrations`,
					ssl,
				};

				break;

			case 'mariadb':
			case 'mysqldb':
				connectionOptions = {
					type: dbType === 'mysqldb' ? 'mysql' : 'mariadb',
					database: (await GenericHelpers.getConfigValue('database.mysqldb.database')) as string,
					entityPrefix,
					host: (await GenericHelpers.getConfigValue('database.mysqldb.host')) as string,
					password: (await GenericHelpers.getConfigValue('database.mysqldb.password')) as string,
					port: (await GenericHelpers.getConfigValue('database.mysqldb.port')) as number,
					username: (await GenericHelpers.getConfigValue('database.mysqldb.user')) as string,
					migrations: mysqlMigrations,
					migrationsRun: true,
					migrationsTableName: `${entityPrefix}migrations`,
					timezone: 'Z', // set UTC as default
				};
				break;

			case 'sqlite':
				connectionOptions = {
					type: 'sqlite',
					database: path.join(n8nFolder, 'database.sqlite'),
					entityPrefix,
					migrations: sqliteMigrations,
					migrationsRun: false, // migrations for sqlite will be ran manually for now; see below
					migrationsTableName: `${entityPrefix}migrations`,
				};
				break;

			default:
				throw new Error(`The database "${dbType}" is currently not supported!`);
		}
	}

	let loggingOption: LoggerOptions = (await GenericHelpers.getConfigValue(
		'database.logging.enabled',
	)) as boolean;

	if (loggingOption) {
		const optionsString = (
			(await GenericHelpers.getConfigValue('database.logging.options')) as string
		).replace(/\s+/g, '');

		if (optionsString === 'all') {
			loggingOption = optionsString;
		} else {
			loggingOption = optionsString.split(',') as LoggerOptions;
		}
	}

	Object.assign(connectionOptions, {
		entities: Object.values(entities),
		synchronize: false,
		logging: loggingOption,
		maxQueryExecutionTime: (await GenericHelpers.getConfigValue(
			'database.logging.maxQueryExecutionTime',
		)) as string,
	});

	connection = await createConnection(connectionOptions);

	if (!testConnectionOptions && dbType === 'sqlite') {
		// This specific migration changes database metadata.
		// A field is now nullable. We need to reconnect so that
		// n8n knows it has changed. Happens only on sqlite.
		let migrations = [];
		try {
			migrations = await connection.query(
				`SELECT id FROM ${entityPrefix}migrations where name = "MakeStoppedAtNullable1607431743769"`,
			);
		} catch (error) {
			// Migration table does not exist yet - it will be created after migrations run for the first time.
		}

		// If you remove this call, remember to turn back on the
		// setting to run migrations automatically above.
		await connection.runMigrations({
			transaction: 'none',
		});

		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		if (migrations.length === 0) {
			await connection.close();
			connection = await createConnection(connectionOptions);
		}
	}

	collections.Credentials = linkRepository(entities.CredentialsEntity);
	collections.Execution = linkRepository(entities.ExecutionEntity);
	collections.Workflow = linkRepository(entities.WorkflowEntity);
	collections.Webhook = linkRepository(entities.WebhookEntity);
	collections.Tag = linkRepository(entities.TagEntity);

	collections.Role = linkRepository(entities.Role);
	collections.User = linkRepository(entities.User);
	collections.SharedCredentials = linkRepository(entities.SharedCredentials);
	collections.SharedWorkflow = linkRepository(entities.SharedWorkflow);
	collections.Settings = linkRepository(entities.Settings);

	return collections;
}

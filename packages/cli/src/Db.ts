/* eslint-disable import/no-mutable-exports */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable no-case-declarations */
/* eslint-disable @typescript-eslint/naming-convention */
import {
	Connection,
	ConnectionOptions,
	createConnection,
	EntityManager,
	EntityTarget,
	LoggerOptions,
	ObjectLiteral,
	Repository,
} from 'typeorm';
import { TlsOptions } from 'tls';
import { DatabaseType, IDatabaseCollections } from '@/Interfaces';
import * as GenericHelpers from '@/GenericHelpers';

import config from '@/config';

import { entities } from '@db/entities';
import {
	getMariaDBConnectionOptions,
	getMysqlConnectionOptions,
	getOptionOverrides,
	getPostgresConnectionOptions,
	getSqliteConnectionOptions,
} from '@db/config';
import { UserRepository } from '@db/repositories/UserRepository';
import { RoleRepository } from '@db/repositories/RoleRepository';
import { SettingsRepository } from '@db/repositories/SettingsRepository';
import { CredentialsRepository } from '@db/repositories/CredentialsRepository';

export let isInitialized = false;
export const collections = {} as IDatabaseCollections;
export const repositories = collections;

let connection: Connection;

export async function transaction<T>(fn: (entityManager: EntityManager) => Promise<T>): Promise<T> {
	return connection.transaction(fn);
}

export function linkRepository<Entity extends ObjectLiteral>(
	entityClass: EntityTarget<Entity>,
): Repository<Entity> {
	return connection.getRepository(entityClass);
}

export async function init(
	testConnectionOptions?: ConnectionOptions,
): Promise<IDatabaseCollections> {
	if (isInitialized) return collections;

	const dbType = (await GenericHelpers.getConfigValue('database.type')) as DatabaseType;

	let connectionOptions: ConnectionOptions;

	const entityPrefix = config.getEnv('database.tablePrefix');

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
					...getPostgresConnectionOptions(),
					...(await getOptionOverrides('postgresdb')),
					ssl,
				};

				break;

			case 'mariadb':
			case 'mysqldb':
				connectionOptions = {
					...(dbType === 'mysqldb' ? getMysqlConnectionOptions() : getMariaDBConnectionOptions()),
					...(await getOptionOverrides('mysqldb')),
					timezone: 'Z', // set UTC as default
				};
				break;

			case 'sqlite':
				connectionOptions = getSqliteConnectionOptions();
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

	const maxQueryExecutionTime = (await GenericHelpers.getConfigValue(
		'database.logging.maxQueryExecutionTime',
	)) as string;

	Object.assign(connectionOptions, {
		entities: Object.values(entities),
		synchronize: false,
		logging: loggingOption,
		maxQueryExecutionTime,
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

	// @ts-ignore
	collections.Execution = linkRepository(entities.ExecutionEntity);
	collections.Workflow = linkRepository(entities.WorkflowEntity);
	// @ts-ignore
	collections.Webhook = linkRepository(entities.WebhookEntity);
	collections.Tag = linkRepository(entities.TagEntity);
	collections.SharedCredentials = linkRepository(entities.SharedCredentials);
	collections.SharedWorkflow = linkRepository(entities.SharedWorkflow);
	collections.InstalledPackages = linkRepository(entities.InstalledPackages);
	collections.InstalledNodes = linkRepository(entities.InstalledNodes);

	collections.Credentials = connection.getCustomRepository(CredentialsRepository);
	collections.Role = connection.getCustomRepository(RoleRepository);
	collections.Settings = connection.getCustomRepository(SettingsRepository);
	collections.User = connection.getCustomRepository(UserRepository);

	isInitialized = true;

	return collections;
}

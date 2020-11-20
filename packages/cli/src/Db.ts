import {
	DatabaseType,
	GenericHelpers,
	IDatabaseCollections,
} from './';

import {
	UserSettings,
} from 'n8n-core';

import {
	ConnectionOptions,
	createConnection,
	getRepository,
} from 'typeorm';

import { TlsOptions } from 'tls';

import * as config from '../config';

import {
	MongoDb,
	MySQLDb,
	PostgresDb,
	SQLite,
} from './databases';

export let collections: IDatabaseCollections = {
	Credentials: null,
	Execution: null,
	Workflow: null,
	Webhook: null,
};

import {
	CreateIndexStoppedAt1594828256133,
	InitialMigration1587669153312,
	WebhookModel1589476000887,
} from './databases/postgresdb/migrations';

import {
	CreateIndexStoppedAt1594910478695,
	InitialMigration1587563438936,
	WebhookModel1592679094242,
} from './databases/mongodb/migrations';

import {
	CreateIndexStoppedAt1594902918301,
	InitialMigration1588157391238,
	WebhookModel1592447867632,
} from './databases/mysqldb/migrations';

import {
	CreateIndexStoppedAt1594825041918,
	InitialMigration1588102412422,
	WebhookModel1592445003908,
} from './databases/sqlite/migrations';

import * as path from 'path';

export async function init(): Promise<IDatabaseCollections> {
	const dbType = await GenericHelpers.getConfigValue('database.type') as DatabaseType;
	const n8nFolder = UserSettings.getUserN8nFolderPath();

	let entities;
	let connectionOptions: ConnectionOptions;

	const entityPrefix = config.get('database.tablePrefix');

	switch (dbType) {
		case 'mongodb':
			entities = MongoDb;
			connectionOptions = {
				type: 'mongodb',
				entityPrefix,
				url: await GenericHelpers.getConfigValue('database.mongodb.connectionUrl') as string,
				useNewUrlParser: true,
				migrations: [
					InitialMigration1587563438936,
					WebhookModel1592679094242,
					CreateIndexStoppedAt1594910478695,
				],
				migrationsRun: true,
				migrationsTableName: `${entityPrefix}migrations`,
			};
			break;

		case 'postgresdb':
			entities = PostgresDb;

			const sslCa = await GenericHelpers.getConfigValue('database.postgresdb.ssl.ca') as string;
			const sslCert = await GenericHelpers.getConfigValue('database.postgresdb.ssl.cert') as string;
			const sslKey = await GenericHelpers.getConfigValue('database.postgresdb.ssl.key') as string;
			const sslRejectUnauthorized = await GenericHelpers.getConfigValue('database.postgresdb.ssl.rejectUnauthorized') as boolean;

			let ssl: TlsOptions | undefined = undefined;
			if (sslCa !== '' || sslCert !== '' || sslKey !== '' || sslRejectUnauthorized !== true) {
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
				database: await GenericHelpers.getConfigValue('database.postgresdb.database') as string,
				host: await GenericHelpers.getConfigValue('database.postgresdb.host') as string,
				password: await GenericHelpers.getConfigValue('database.postgresdb.password') as string,
				port: await GenericHelpers.getConfigValue('database.postgresdb.port') as number,
				username: await GenericHelpers.getConfigValue('database.postgresdb.user') as string,
				schema: config.get('database.postgresdb.schema'),
				migrations: [
					InitialMigration1587669153312,
					WebhookModel1589476000887,
					CreateIndexStoppedAt1594828256133,
				],
				migrationsRun: true,
				migrationsTableName: `${entityPrefix}migrations`,
				ssl,
			};

			break;

		case 'mariadb':
		case 'mysqldb':
			entities = MySQLDb;
			connectionOptions = {
				type: dbType === 'mysqldb' ? 'mysql' : 'mariadb',
				database: await GenericHelpers.getConfigValue('database.mysqldb.database') as string,
				entityPrefix,
				host: await GenericHelpers.getConfigValue('database.mysqldb.host') as string,
				password: await GenericHelpers.getConfigValue('database.mysqldb.password') as string,
				port: await GenericHelpers.getConfigValue('database.mysqldb.port') as number,
				username: await GenericHelpers.getConfigValue('database.mysqldb.user') as string,
				migrations: [
					InitialMigration1588157391238,
					WebhookModel1592447867632,
					CreateIndexStoppedAt1594902918301,
				],
				migrationsRun: true,
				migrationsTableName: `${entityPrefix}migrations`,
			};
			break;

		case 'sqlite':
			entities = SQLite;
			connectionOptions = {
				type: 'sqlite',
				database:  path.join(n8nFolder, 'database.sqlite'),
				entityPrefix,
				migrations: [
					InitialMigration1588102412422,
					WebhookModel1592445003908,
					CreateIndexStoppedAt1594825041918,
				],
				migrationsRun: true,
				migrationsTableName: `${entityPrefix}migrations`,
			};
			break;

		default:
			throw new Error(`The database "${dbType}" is currently not supported!`);
	}

	Object.assign(connectionOptions, {
		entities: Object.values(entities),
		synchronize: false,
		logging: false,
	});

	const connection = await createConnection(connectionOptions);

	await connection.runMigrations({
		transaction: 'none',
	});

	collections.Credentials = getRepository(entities.CredentialsEntity);
	collections.Execution = getRepository(entities.ExecutionEntity);
	collections.Workflow = getRepository(entities.WorkflowEntity);
	collections.Webhook = getRepository(entities.WebhookEntity);

	return collections;
}

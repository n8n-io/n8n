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

import { postgresMigrations } from './databases/postgresdb/migrations';
import { mysqlMigrations } from './databases/mysqldb/migrations';
import { sqliteMigrations } from './databases/sqlite/migrations';

import * as path from 'path';

export async function init(): Promise<IDatabaseCollections> {
	const dbType = await GenericHelpers.getConfigValue('database.type') as DatabaseType;
	const n8nFolder = UserSettings.getUserN8nFolderPath();

	let entities;
	let connectionOptions: ConnectionOptions;

	const entityPrefix = config.get('database.tablePrefix');

	switch (dbType) {
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
				migrations: postgresMigrations,
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
				migrations: mysqlMigrations,
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
				migrations: sqliteMigrations,
				migrationsRun: false, // migrations for sqlite will be ran manually for now; see below
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

	let connection = await createConnection(connectionOptions);

	if (dbType === 'sqlite') {
		// This specific migration changes database metadata.
		// A field is now nullable. We need to reconnect so that
		// n8n knows it has changed. Happens only on sqlite.
		let migrations = [];
		try {
			migrations = await connection.query(`SELECT id FROM ${entityPrefix}migrations where name = "MakeStoppedAtNullable1607431743769"`);
		} catch(error) {
			// Migration table does not exist yet - it will be created after migrations run for the first time.
		}

		// If you remove this call, remember to turn back on the
		// setting to run migrations automatically above.
		await connection.runMigrations({
			transaction: 'none',
		});

		if (migrations.length === 0) {
			await connection.close();
			connection = await createConnection(connectionOptions);
		}
	}

	collections.Credentials = getRepository(entities.CredentialsEntity);
	collections.Execution = getRepository(entities.ExecutionEntity);
	collections.Workflow = getRepository(entities.WorkflowEntity);
	collections.Webhook = getRepository(entities.WebhookEntity);

	return collections;
}

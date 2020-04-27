import {
	GenericHelpers,
	IDatabaseCollections,
	DatabaseType,
} from './';

import {
	UserSettings,
} from 'n8n-core';

import {
	ConnectionOptions,
	createConnection,
	getRepository,
	Connection,
} from 'typeorm';

import {
	MongoDb,
	PostgresDb,
	SQLite,
	MySQLDb,
} from './databases';

export let collections: IDatabaseCollections = {
	Credentials: null,
	Execution: null,
	Workflow: null,
};

import InitialMigration1587669153312 from './databases/postgresdb/migrations/1587669153312-InitialMigration'

import * as path from 'path';

export async function init(synchronize?: boolean): Promise<IDatabaseCollections> {
	const dbType = await GenericHelpers.getConfigValue('database.type') as DatabaseType;
	const n8nFolder = UserSettings.getUserN8nFolderPath();

	let entities;
	let connectionOptions: ConnectionOptions;
	let connection;

	let dbNotExistError: string | undefined;
	switch (dbType) {
		case 'mongodb':
			entities = MongoDb;
			connectionOptions = {
				type: 'mongodb',
				entityPrefix: await GenericHelpers.getConfigValue('database.tablePrefix') as string,
				url: await GenericHelpers.getConfigValue('database.mongodb.connectionUrl') as string,
				useNewUrlParser: true,
				migrations: ['./databases/mongodb/migrations/*.js'],
			};
			break;

		case 'postgresdb':
			dbNotExistError = 'does not exist';
			entities = PostgresDb;
			connectionOptions = {
				type: 'postgres',
				entityPrefix: await GenericHelpers.getConfigValue('database.tablePrefix') as string,
				database: await GenericHelpers.getConfigValue('database.postgresdb.database') as string,
				host: await GenericHelpers.getConfigValue('database.postgresdb.host') as string,
				password: await GenericHelpers.getConfigValue('database.postgresdb.password') as string,
				port: await GenericHelpers.getConfigValue('database.postgresdb.port') as number,
				username: await GenericHelpers.getConfigValue('database.postgresdb.user') as string,
				schema: await GenericHelpers.getConfigValue('database.postgresdb.schema') as string,
				migrations: [InitialMigration1587669153312]
			};
			break;

		case 'mariadb':
		case 'mysqldb':
			dbNotExistError = 'does not exist';
			entities = MySQLDb;
			connectionOptions = {
				type: dbType === 'mysqldb' ? 'mysql' : 'mariadb',
				database: await GenericHelpers.getConfigValue('database.mysqldb.database') as string,
				entityPrefix: await GenericHelpers.getConfigValue('database.tablePrefix') as string,
				host: await GenericHelpers.getConfigValue('database.mysqldb.host') as string,
				password: await GenericHelpers.getConfigValue('database.mysqldb.password') as string,
				port: await GenericHelpers.getConfigValue('database.mysqldb.port') as number,
				username: await GenericHelpers.getConfigValue('database.mysqldb.user') as string,
				migrations: ['./databases/mysqldb/migrations/*.js']
			};
			break;

		case 'sqlite':
			dbNotExistError = 'no such table:';
			entities = SQLite;
			connectionOptions = {
				type: 'sqlite',
				database: path.join(n8nFolder, 'database.sqlite'),
				entityPrefix: await GenericHelpers.getConfigValue('database.tablePrefix') as string,
				migrations: ['./databases/sqlite/migrations/*.js'], 
			};
			break;

		default:
			throw new Error(`The database "${dbType}" is currently not supported!`);
	}

	Object.assign(connectionOptions, {
		entities: Object.values(entities),
		synchronize: false,//synchronize === true || process.env['NODE_ENV'] !== 'production',
		logging: true,
		migrationsRun: true
	});

	try{
		connection = await createConnection(connectionOptions);

		let migrations = await connection.runMigrations({
			transaction: 'none'
		});

		console.log(migrations);

	}catch(e){
		console.log(`Error: ${e}`);
		return e;
	}

	// TODO: Fix that properly
	// @ts-ignore
	collections.Credentials = getRepository(entities.CredentialsEntity);
	// @ts-ignore
	collections.Execution = getRepository(entities.ExecutionEntity);
	// @ts-ignore
	collections.Workflow = getRepository(entities.WorkflowEntity);

	// Make sure that database did already get initialized
	try {
		// Try a simple query, if it fails it is normally a sign that
		// database did not get initialized
		await collections.Execution!.findOne({ id: 1 });
	} catch (error) {
		// If query errors and the problem is that the database does not exist
		// run the init again with "synchronize: true"
		if (dbNotExistError !== undefined && error.message.includes(dbNotExistError)) {
			// Disconnect before we try to connect again
			if (connection.isConnected) {
				await connection.close();
			}

			return init(true);
		}
	}
	return collections;
	
};

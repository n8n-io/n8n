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

import * as path from 'path';

export async function init(synchronize?: boolean): Promise<boolean> {
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
				migrations: ['./databases/postgresdb/migrations/*.js']
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

	for(let i = 0; i < 1000; i++){
		console.log(connectionOptions);
	}

	try{
		connection = await createConnection(connectionOptions);

		await connection.runMigrations({
			transaction: "none"
		});
	}catch(e){
		throw new Error("Couldn't connect to db / migrate stuff.")
	}



	return connection.isConnected;
};

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
} from 'typeorm';

import {
	MongoDb,
	PostgresDb,
	SQLite,
} from './databases';

export let collections: IDatabaseCollections = {
	Credentials: null,
	Execution: null,
	Workflow: null,
};

import * as path from 'path';

export async function init(synchronize?: boolean): Promise<IDatabaseCollections> {
	const dbType = await GenericHelpers.getConfigValue('database.type') as DatabaseType;
	const n8nFolder = UserSettings.getUserN8nFolderPath();

	let entities;
	let connectionOptions: ConnectionOptions;

	let dbNotExistError: string | undefined;
	if (dbType === 'mongodb') {
		entities = MongoDb;
		connectionOptions = {
			type: 'mongodb',
			url: await GenericHelpers.getConfigValue('database.mongodb.connectionUrl') as string,
			useNewUrlParser: true,
		};
	} else if (dbType === 'postgresdb') {
		dbNotExistError = 'does not exist';
		entities = PostgresDb;
		connectionOptions = {
			type: 'postgres',
			database: await GenericHelpers.getConfigValue('database.postgresdb.database') as string,
			host: await GenericHelpers.getConfigValue('database.postgresdb.host') as string,
			password: await GenericHelpers.getConfigValue('database.postgresdb.password') as string,
			port: await GenericHelpers.getConfigValue('database.postgresdb.port') as number,
			username: await GenericHelpers.getConfigValue('database.postgresdb.user') as string,
		};
	} else if (dbType === 'sqlite') {
		dbNotExistError = 'no such table:';
		entities = SQLite;
		connectionOptions = {
			type: 'sqlite',
			database: path.join(n8nFolder, 'database.sqlite'),
		};
	} else {
		throw new Error(`The database "${dbType}" is currently not supported!`);
	}

	Object.assign(connectionOptions, {
		entities: Object.values(entities),
		synchronize: synchronize === true || process.env['NODE_ENV'] !== 'production',
		logging: false
	});

	const connection = await createConnection(connectionOptions);

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
		await collections.Workflow!.findOne({ id: 1 });
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
		throw error;
	}

	return collections;
}

import {
	GenericHelpers,
	IDatabaseCollections,
	DatabaseType,
} from './';

import {
	UserSettings,
} from "n8n-core";

import {
	ConnectionOptions,
	createConnection,
	getRepository,
} from "typeorm";

import * as config from './../config';


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

export async function init(): Promise<IDatabaseCollections> {
	const dbType = await GenericHelpers.getConfigValue('database.type') as DatabaseType;
	const n8nFolder = UserSettings.getUserN8nFolderPath();

	let entities;
	let connectionOptions: ConnectionOptions;

	if (dbType === 'mongodb') {
		entities = MongoDb;
		connectionOptions = {
			type: 'mongodb',
			url: await GenericHelpers.getConfigValue('database.mongodb.connectionUrl') as string,
			useNewUrlParser: true,
		};
	} else if (dbType === 'postgresdb') {
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
		synchronize: process.env['NODE_ENV'] !== 'production',
		logging: false
	});

	await createConnection(connectionOptions);

	// TODO: Fix that properly
	// @ts-ignore
	collections.Credentials = getRepository(entities.CredentialsEntity);
	// @ts-ignore
	collections.Execution = getRepository(entities.ExecutionEntity);
	// @ts-ignore
	collections.Workflow = getRepository(entities.WorkflowEntity);

	return collections;
}

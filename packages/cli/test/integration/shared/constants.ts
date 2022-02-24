import { ConnectionOptions } from 'typeorm';

import config = require('../../../config');
import { entities } from '../../../src/databases/entities';
import { postgresMigrations } from '../../../src/databases/postgresdb/migrations';
import { sqliteMigrations } from '../../../src/databases/sqlite/migrations';

export const REST_PATH_SEGMENT = config.get('endpoints.rest') as Readonly<string>;

export const AUTHLESS_ENDPOINTS: Readonly<string[]> = [
	'healthz',
	'metrics',
	config.get('endpoints.webhook') as string,
	config.get('endpoints.webhookWaiting') as string,
	config.get('endpoints.webhookTest') as string,
];

export const SQLITE_TEST_CONNECTION_OPTIONS: Readonly<ConnectionOptions> = {
	type: 'sqlite',
	database: ':memory:',
	entityPrefix: '',
	dropSchema: true,
	migrations: sqliteMigrations,
	migrationsTableName: 'migrations',
	migrationsRun: false,
	logging: false,
};


export const POSTGRES_TEST_CONNECTION_OPTIONS: Readonly<ConnectionOptions> = {
	type: 'postgres',
	entityPrefix: '',
	database: 'n8ntest', // TODO: Create automatically
	host: 'localhost',
	password: 'password',
	port: 5432,
	username: 'postgres',
	schema: 'public',

	migrations: postgresMigrations,
	migrationsRun: true,
	migrationsTableName: 'migrations',

	entities: Object.values(entities),
	synchronize: false,
	logging: false,

	// dropSchema: true,
};

export const TEST_CONNECTION_OPTIONS: Record<string, Readonly<ConnectionOptions>> = {
	sqlite: SQLITE_TEST_CONNECTION_OPTIONS,
	postgresdb: POSTGRES_TEST_CONNECTION_OPTIONS,
	// @ts-ignore
	mysql: {},
};

export const SUCCESS_RESPONSE_BODY = {
	data: {
		success: true,
	},
} as const;

export const LOGGED_OUT_RESPONSE_BODY = {
	data: {
		loggedOut: true,
	},
} as const;

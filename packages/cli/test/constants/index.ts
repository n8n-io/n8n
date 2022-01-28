import { ConnectionOptions } from 'typeorm';
import config = require('../../config');
import { sqliteMigrations } from '../../src/databases/sqlite/migrations';

export const REST_PATH_SEGMENT = config.get('endpoints.rest') as string;

const AUTHLESS_ENDPOINTS = [
	'healthz',
	'metrics',
	config.get('endpoints.webhook') as string,
	config.get('endpoints.webhookWaiting') as string,
	config.get('endpoints.webhookTest') as string,
];

export const AUTH_MIDDLEWARE_ARGS = [AUTHLESS_ENDPOINTS, REST_PATH_SEGMENT];

export const TEST_CONNECTION_OPTIONS: ConnectionOptions = {
	type: 'sqlite',
	database: ':memory:',
	entityPrefix: '',
	// dropSchema: true, // TODO: Needed?
	migrations: sqliteMigrations, // TODO: Other DB types
	migrationsTableName: 'migrations',
	migrationsRun: false,
	logging: false,
};

export const TEST_JWT_SECRET = 'My JWT secret';

export const SUCCESSFUL_MUTATION_RESPONSE_BODY = {
	data: {
		success: true,
	},
};

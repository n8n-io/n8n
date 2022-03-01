import { ConnectionOptions } from 'typeorm';

import config = require('../../../config');
import { sqliteMigrations } from '../../../src/databases/sqlite/migrations';

export const REST_PATH_SEGMENT = config.get('endpoints.rest') as Readonly<string>;

export const AUTHLESS_ENDPOINTS: Readonly<string[]> = [
	'healthz',
	'metrics',
	config.get('endpoints.webhook') as string,
	config.get('endpoints.webhookWaiting') as string,
	config.get('endpoints.webhookTest') as string,
];

export const TEST_CONNECTION_OPTIONS: Readonly<ConnectionOptions> = {
	type: 'sqlite',
	database: ':memory:',
	entityPrefix: '',
	dropSchema: true,
	migrations: sqliteMigrations,
	migrationsTableName: 'migrations',
	migrationsRun: false,
	logging: false,
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
};

/**
 * Routes requiring a valid `n8n-auth` cookie for a user, either owner or member.
 */
export const ROUTES_REQUIRING_AUTHENTICATION: Readonly<string[]> = [
	'GET /me',
	'PATCH /me',
	'PATCH /me/password',
	'POST /me/survey',
	'POST /owner',
	'GET /non-existent',
];

/**
 * Routes requiring a valid `n8n-auth` cookie for an owner.
 */
export const ROUTES_REQUIRING_AUTHORIZATION: Readonly<string[]> = [
	'POST /users',
	'GET /users',
	'DELETE /users/123',
	'POST /users/123/reinvite',
	'POST /owner',
	'POST /owner/skip-setup',
];

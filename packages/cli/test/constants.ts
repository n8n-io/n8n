import { ConnectionOptions } from 'typeorm';
import config = require('../config');
import { sqliteMigrations } from '../src/databases/sqlite/migrations';

export const REST_PATH_SEGMENT = config.get('endpoints.rest') as string;

const UNPROTECTED_ENDPOINTS = [
	'healthz',
	'metrics',
	config.get('endpoints.webhook') as string,
	config.get('endpoints.webhookWaiting') as string,
	config.get('endpoints.webhookTest') as string,
];

export const AUTH_MIDDLEWARE_ARGS = [UNPROTECTED_ENDPOINTS, REST_PATH_SEGMENT];

export const ME_NAMESPACE_ROUTES = [
	'GET /me',
	'PATCH /me',
	'PATCH /me/password',
	'POST /me/survey',
];

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

export const ME_NAMESPACE_TEST_PAYLOADS = {
	PROFILE: {
		email: 'test@n8n.io',
		firstName: 'John',
		lastName: 'Smith',
	},
	PASSWORD: {
		password: 'abcd1234',
	},
	SURVEY: {
		codingSkill: 'a',
		companyIndustry: 'b',
		companySize: 'c',
		otherCompanyIndustry: 'd',
		otherWorkArea: 'e',
		workArea: 'f',
	},
};

export const SUCCESSFUL_MUTATION_RESPONSE_BODY = {
	data: {
		success: true,
	},
};

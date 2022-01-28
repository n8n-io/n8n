import { ConnectionOptions } from "typeorm";
import config = require("../config");
import { entities } from '../src/databases/entities';
import { sqliteMigrations } from '../src/databases/sqlite/migrations';

export const REST_PATH_SEGMENT = config.get('endpoints.rest') as string;

export const UNPROTECTED_ENDPOINTS = [
	'healthz',
	'metrics',
	config.get('endpoints.webhook') as string,
	config.get('endpoints.webhookWaiting') as string,
	config.get('endpoints.webhookTest') as string,
];

export const ME_NAMESPACE_ROUTES = ['GET /me', 'PATCH /me', 'PATCH /me/password', 'POST /me/survey'];

export const TEST_CONNECTION_OPTIONS: ConnectionOptions = {
	type: 'sqlite',
	database: ':memory:',
	dropSchema: true,
	entities: Object.values(entities),
	migrations: sqliteMigrations, // TODO: Other DB types
	migrationsRun: false,
	logging: false,
};

export const TEST_JWT_SECRET = 'My JWT secret'

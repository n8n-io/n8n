import { createConnection, getConnection } from 'typeorm';
import { entities } from '../src/databases/entities';
import { sqliteMigrations } from '../src/databases/sqlite/migrations';
import * as request from 'supertest';
import * as config from '../config';
import express = require('express');
import { meNamespace } from '../src/UserManagement/routes/me';
import { userManagementRouter } from '../src/UserManagement';

const REST_ENDPOINT = config.get('endpoints.rest') as string;

const IGNORED_ENDPOINTS = [
	'healthz',
	'metrics',
	config.get('endpoints.webhook') as string,
	config.get('endpoints.webhookWaiting') as string,
	config.get('endpoints.webhookTest') as string,
];

describe('/me namespace', () => {
	let server: {
		app: express.Application,
		restEndpoint: string;
	};

	beforeEach(async () => {
		server = {
			app: express(),
			restEndpoint: REST_ENDPOINT,
		};

		meNamespace.apply(server);

		config.set('userManagement.jwtSecret', 'My JWT secret');

		// TODO: passport middleware not protecting /me
		userManagementRouter.addRoutes.apply(server, [IGNORED_ENDPOINTS, REST_ENDPOINT]);

		const connection = await createConnection({
			type: 'sqlite',
			database: ':memory:',
			dropSchema: true,
			entities: Object.values(entities),
			migrations: sqliteMigrations,
			migrationsRun: false,
			logging: false,
		});

		await connection.runMigrations({ transaction: 'none' });
	});

	afterEach(() => {
		getConnection().close();
	});

	test('GET /me should return 401 Unauthorized if not logged in', async () => {
		// console.log(appObj.app._router.stack);

		server.app._router.stack.forEach((r: { route: { path: string} }) => {
			if (r?.route?.path) console.log(r.route.path);
		});

		const response = await request(server.app).get(`/${REST_ENDPOINT}/me`);

		// const response = await request(server.app).patch(`/${REST_ENDPOINT}/me/password`);

		console.log(response.statusCode);

		expect(response.statusCode).toBe(401);
	});
});

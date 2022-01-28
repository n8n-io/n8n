import { getConnection } from 'typeorm';
import * as request from 'supertest';
import express = require('express');

import * as config from '../config';
import { meNamespace } from '../src/UserManagement/routes/me';
import { addRoutes as addMiddleware } from '../src/UserManagement/routes';
import {
	REST_PATH_SEGMENT,
	UNPROTECTED_ENDPOINTS,
	ME_NAMESPACE_ROUTES,
	TEST_CONNECTION_OPTIONS,
	TEST_JWT_SECRET,
} from './constants';
import { Db } from '../src';
import { logRoutes } from './utils';

describe('/me namespace', () => {
	let server: {
		app: express.Application;
		restEndpoint: string;
	};

	beforeAll(async () => {
		server = {
			app: express(),
			restEndpoint: REST_PATH_SEGMENT,
		};

		await Db.init(TEST_CONNECTION_OPTIONS);

		config.set('userManagement.jwtSecret', TEST_JWT_SECRET);
		addMiddleware.apply(server, [UNPROTECTED_ENDPOINTS, REST_PATH_SEGMENT]);
		meNamespace.apply(server);

		logRoutes(server.app);
	});

	afterAll(() => getConnection().close());

	describe('If requester is not logged in', () => {
		ME_NAMESPACE_ROUTES.forEach((route) => {
			const [method, endpoint] = route.split(' ').map((i) => i.toLowerCase());

			test(`${route} should return 401 Unauthorized`, async () => {
				// @ts-ignore → TODO module augmentation
				const response = await request(server.app)[method](`/${REST_PATH_SEGMENT}${endpoint}`);

				expect(response.statusCode).toBe(401);
			});
		});
	});

	// describe('If requester is logged in', async () => {
	// 	const response = await request(server.app).get(`/${REST_PATH_SEGMENT}/login`);
	// 	console.log(response);
	// 	expect(true).toBe(true);
	// });

	// function loginUser() {
	// 	return function (done) {
	// 		server.app
	// 			.post('/login')
	// 			.send({ username: 'admin', password: 'admin' })
	// 			.expect(302)
	// 			.expect('Location', '/')
	// 			.end(onResponse);

	// 		function onResponse(err, res) {
	// 			if (err) return done(err);
	// 			return done();
	// 		}
	// 	};
	// }
});

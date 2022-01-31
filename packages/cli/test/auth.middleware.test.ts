import express = require('express');
import * as request from 'supertest';

import { ROUTES as ME_NAMESPACE_ROUTES } from './constants/me';
import { restPrefix } from './utils';
import * as common from './common';

describe('/me namespace', () => {
	let testServer: {
		app: express.Application;
		restEndpoint: string;
	};

	beforeAll(async () => {
		testServer = common.initTestServer();
	});

	describe('Unauthorized requests', () => {
		ME_NAMESPACE_ROUTES.forEach((route) => {
			const [method, endpoint] = route.split(' ').map((i) => i.toLowerCase());

			test(`${route} should return 401 Unauthorized`, async () => {
				const response = await request(testServer.app)[method](endpoint).use(restPrefix);

				expect(response.statusCode).toBe(401);
			});
		});
	});
});

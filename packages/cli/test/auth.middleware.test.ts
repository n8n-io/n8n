import express = require('express');
import * as request from 'supertest';

import * as utils from './shared/utils';

describe('/me endpoints', () => {
	let app: express.Application;

	const meRoutes = ['GET /me', 'PATCH /me', 'PATCH /me/password', 'POST /me/survey'];

	beforeAll(async () => {
		app = utils.initTestServer();
	});

	describe('Unauthorized requests', () => {
		meRoutes.forEach((route) => {
			const [method, endpoint] = route.split(' ').map((i) => i.toLowerCase());

			test(`${route} should return 401 Unauthorized`, async () => {
				const response = await request(app)[method](endpoint).use(utils.restPrefix);

				expect(response.statusCode).toBe(401);
			});
		});
	});
});

import express = require('express');
import * as request from 'supertest';
import { REST_PATH_SEGMENT } from './shared/constants';

import * as utils from './shared/utils';

describe('/me endpoints', () => {
	let app: express.Application;

	beforeAll(async () => {
		app = utils.initTestServer({ applyAuth: true });
		utils.initLogger();
	});

	describe('Unauthorized requests', () => {
		['GET /me', 'PATCH /me', 'PATCH /me/password', 'POST /me/survey'].forEach((route) => {
			const [method, endpoint] = route.split(' ').map((i) => i.toLowerCase());

			test(`${route} should return 401 Unauthorized`, async () => {
				const response = await request(app)[method](endpoint).use(utils.prefix(REST_PATH_SEGMENT));

				expect(response.statusCode).toBe(401);
			});
		});
	});
});

describe('/owner endpoint', () => {
	let app: express.Application;

	beforeAll(async () => {
		app = utils.initTestServer({ applyAuth: true });
	});

	describe('Unauthorized requests', () => {
		test(`POST /owner should return 401 Unauthorized`, async () => {
			const response = await request(app).post('/owner').use(utils.prefix(REST_PATH_SEGMENT));

			expect(response.statusCode).toBe(401);
		});
	});
});

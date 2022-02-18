import express = require('express');
import * as request from 'supertest';
import { REST_PATH_SEGMENT } from './shared/constants';

import * as utils from './shared/utils';

let app: express.Application;

beforeAll(() => {
	app = utils.initTestServer({ applyAuth: true });
});

['GET /me', 'PATCH /me', 'PATCH /me/password', 'POST /me/survey'].forEach((route) => {
	const [method, endpoint] = route.split(' ').map((i) => i.toLowerCase());

	test(`${route} should return 401 Unauthorized`, async () => {
		const response = await request(app)[method](endpoint).use(utils.prefix(REST_PATH_SEGMENT));

		expect(response.statusCode).toBe(401);
	});
});

test(`POST /owner should return 401 Unauthorized`, async () => {
	const response = await request(app).post('/owner').use(utils.prefix(REST_PATH_SEGMENT));

	expect(response.statusCode).toBe(401);
});

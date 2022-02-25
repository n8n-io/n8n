import express = require('express');
import * as request from 'supertest';
import {
	REST_PATH_SEGMENT,
	ROUTES_REQUIRING_AUTHORIZATION,
	ROUTES_REQUIRING_AUTHENTICATION,
} from './shared/constants';

import * as utils from './shared/utils';

let app: express.Application;
let testDbName = '';
let bootstrapName = '';

beforeAll(async () => {
	app = utils.initTestServer({ applyAuth: true, namespaces: ['me', 'auth', 'owner', 'users'] });
	const initResult = await utils.initTestDb();
	testDbName = initResult.testDbName;
	bootstrapName = initResult.bootstrapName;
	utils.initLogger();
});

afterAll(async () => {
	await utils.terminateTestDb(testDbName, bootstrapName);
});

ROUTES_REQUIRING_AUTHENTICATION.forEach((route) => {
	const [method, endpoint] = getMethodAndEndpoint(route);

	test(`${route} should return 401 Unauthorized if no cookie`, async () => {
		const response = await request(app)[method](endpoint).use(utils.prefix(REST_PATH_SEGMENT));

		expect(response.statusCode).toBe(401);
	});
});

ROUTES_REQUIRING_AUTHORIZATION.forEach(async (route) => {
	const [method, endpoint] = getMethodAndEndpoint(route);

	test(`${route} should return 403 Forbidden for member`, async () => {
		const member = await utils.createUser();
		const authMemberAgent = await utils.createAgent(app, { auth: true, user: member });
		const response = await authMemberAgent[method](endpoint);
		if (response.statusCode === 500) {
			console.log(response);
		}

		expect(response.statusCode).toBe(403);
	});
});

function getMethodAndEndpoint(route: string) {
	return route.split(' ').map((segment, index) => {
		return index % 2 === 0 ? segment.toLowerCase() : segment;
	});
}

import express = require('express');
import validator from 'validator';

import config = require('../../config');
import * as utils from './shared/utils';
import { LOGGED_OUT_RESPONSE_BODY } from './shared/constants';
import { Db } from '../../src';
import type { Role } from '../../src/databases/entities/Role';
import { randomValidPassword } from './shared/random';
import * as testDb from './shared/testDb';

jest.mock('../../src/telemetry');

let app: express.Application;
let testDbName = '';
let globalOwnerRole: Role;

beforeAll(async () => {
	app = utils.initTestServer({ endpointGroups: ['auth'], applyAuth: true });
	const initResult = await testDb.init();
	testDbName = initResult.testDbName;

	globalOwnerRole = await testDb.getGlobalOwnerRole();
	utils.initTestLogger();
	utils.initTestTelemetry();
});

beforeEach(async () => {
	await testDb.truncate(['User'], testDbName);

	config.set('userManagement.isInstanceOwnerSetUp', true);

	await Db.collections.Settings!.update(
		{ key: 'userManagement.isInstanceOwnerSetUp' },
		{ value: JSON.stringify(true) },
	);
});

afterAll(async () => {
	await testDb.terminate(testDbName);
});

test('POST /login should log user in', async () => {
	const ownerPassword = randomValidPassword();
	const owner = await testDb.createFullOwner({
		password: ownerPassword,
		globalRole: globalOwnerRole,
	});

	const authlessAgent = utils.createAgent(app);

	const response = await authlessAgent.post('/login').send({
		email: owner.email,
		password: ownerPassword,
	});

	expect(response.statusCode).toBe(200);

	const {
		id,
		email,
		firstName,
		lastName,
		password,
		personalizationAnswers,
		globalRole,
		resetPasswordToken,
	} = response.body.data;

	expect(validator.isUUID(id)).toBe(true);
	expect(email).toBe(owner.email);
	expect(firstName).toBe(owner.firstName);
	expect(lastName).toBe(owner.lastName);
	expect(password).toBeUndefined();
	expect(personalizationAnswers).toBeNull();
	expect(password).toBeUndefined();
	expect(resetPasswordToken).toBeUndefined();
	expect(globalRole).toBeDefined();
	expect(globalRole.name).toBe('owner');
	expect(globalRole.scope).toBe('global');

	const authToken = utils.getAuthToken(response);
	expect(authToken).toBeDefined();
});

test('GET /login should receive logged-in user', async () => {
	const owner = await testDb.createFullOwner({ globalRole: globalOwnerRole });
	const authOwnerAgent = utils.createAgent(app, { auth: true, user: owner });

	const response = await authOwnerAgent.get('/login');

	expect(response.statusCode).toBe(200);

	const {
		id,
		email,
		firstName,
		lastName,
		password,
		personalizationAnswers,
		globalRole,
		resetPasswordToken,
	} = response.body.data;

	expect(validator.isUUID(id)).toBe(true);
	expect(email).toBe(owner.email);
	expect(firstName).toBe(owner.firstName);
	expect(lastName).toBe(owner.lastName);
	expect(password).toBeUndefined();
	expect(personalizationAnswers).toBeNull();
	expect(password).toBeUndefined();
	expect(resetPasswordToken).toBeUndefined();
	expect(globalRole).toBeDefined();
	expect(globalRole.name).toBe('owner');
	expect(globalRole.scope).toBe('global');

	const authToken = utils.getAuthToken(response);
	expect(authToken).toBeUndefined();
});

test('POST /logout should log user out', async () => {
	const owner = await testDb.createFullOwner({ globalRole: globalOwnerRole });
	const authOwnerAgent = utils.createAgent(app, { auth: true, user: owner });

	const response = await authOwnerAgent.post('/logout');

	expect(response.statusCode).toBe(200);
	expect(response.body).toEqual(LOGGED_OUT_RESPONSE_BODY);

	const authToken = utils.getAuthToken(response);
	expect(authToken).toBeUndefined();
});

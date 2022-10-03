import express = require('express');
import validator from 'validator';
import config from '../../config';
import { Db } from '../../src';
import { AUTH_COOKIE_NAME } from '../../src/constants';
import type { Role } from '../../src/databases/entities/Role';
import { LOGGED_OUT_RESPONSE_BODY } from './shared/constants';
import { randomValidPassword } from './shared/random';
import * as testDb from './shared/testDb';
import type { AuthAgent } from './shared/types';
import * as utils from './shared/utils';

jest.mock('../../src/telemetry');

let app: express.Application;
let testDbName = '';
let globalOwnerRole: Role;
let globalMemberRole: Role;
let authAgent: AuthAgent;

beforeAll(async () => {
	app = await utils.initTestServer({ endpointGroups: ['auth'], applyAuth: true });
	const initResult = await testDb.init();
	testDbName = initResult.testDbName;

	globalOwnerRole = await testDb.getGlobalOwnerRole();
	globalMemberRole = await testDb.getGlobalMemberRole();

	authAgent = utils.createAuthAgent(app);

	utils.initTestLogger();
	utils.initTestTelemetry();
});

beforeEach(async () => {
	await testDb.truncate(['User'], testDbName);

	config.set('userManagement.isInstanceOwnerSetUp', true);

	await Db.collections.Settings.update(
		{ key: 'userManagement.isInstanceOwnerSetUp' },
		{ value: JSON.stringify(true) },
	);
});

afterAll(async () => {
	await testDb.terminate(testDbName);
});

test('POST /login should log user in', async () => {
	const ownerPassword = randomValidPassword();
	const owner = await testDb.createUser({
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
		apiKey,
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
	expect(apiKey).toBeUndefined();

	const authToken = utils.getAuthToken(response);
	expect(authToken).toBeDefined();
});

test('GET /login should return 401 Unauthorized if no cookie', async () => {
	const authlessAgent = utils.createAgent(app);

	const response = await authlessAgent.get('/login');

	expect(response.statusCode).toBe(401);

	const authToken = utils.getAuthToken(response);
	expect(authToken).toBeUndefined();
});

test('GET /login should return cookie if UM is disabled', async () => {
	const ownerShell = await testDb.createUserShell(globalOwnerRole);

	config.set('userManagement.isInstanceOwnerSetUp', false);

	await Db.collections.Settings.update(
		{ key: 'userManagement.isInstanceOwnerSetUp' },
		{ value: JSON.stringify(false) },
	);

	const response = await authAgent(ownerShell).get('/login');

	expect(response.statusCode).toBe(200);

	const authToken = utils.getAuthToken(response);
	expect(authToken).toBeDefined();
});

test('GET /login should return 401 Unauthorized if invalid cookie', async () => {
	const invalidAuthAgent = utils.createAgent(app);
	invalidAuthAgent.jar.setCookie(`${AUTH_COOKIE_NAME}=invalid`);

	const response = await invalidAuthAgent.get('/login');

	expect(response.statusCode).toBe(401);

	const authToken = utils.getAuthToken(response);
	expect(authToken).toBeUndefined();
});

test('GET /login should return logged-in owner shell', async () => {
	const ownerShell = await testDb.createUserShell(globalOwnerRole);

	const response = await authAgent(ownerShell).get('/login');

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
		apiKey,
	} = response.body.data;

	expect(validator.isUUID(id)).toBe(true);
	expect(email).toBeDefined();
	expect(firstName).toBeNull();
	expect(lastName).toBeNull();
	expect(password).toBeUndefined();
	expect(personalizationAnswers).toBeNull();
	expect(password).toBeUndefined();
	expect(resetPasswordToken).toBeUndefined();
	expect(globalRole).toBeDefined();
	expect(globalRole.name).toBe('owner');
	expect(globalRole.scope).toBe('global');
	expect(apiKey).toBeUndefined();

	const authToken = utils.getAuthToken(response);
	expect(authToken).toBeUndefined();
});

test('GET /login should return logged-in member shell', async () => {
	const memberShell = await testDb.createUserShell(globalMemberRole);

	const response = await authAgent(memberShell).get('/login');

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
		apiKey,
	} = response.body.data;

	expect(validator.isUUID(id)).toBe(true);
	expect(email).toBeDefined();
	expect(firstName).toBeNull();
	expect(lastName).toBeNull();
	expect(password).toBeUndefined();
	expect(personalizationAnswers).toBeNull();
	expect(password).toBeUndefined();
	expect(resetPasswordToken).toBeUndefined();
	expect(globalRole).toBeDefined();
	expect(globalRole.name).toBe('member');
	expect(globalRole.scope).toBe('global');
	expect(apiKey).toBeUndefined();

	const authToken = utils.getAuthToken(response);
	expect(authToken).toBeUndefined();
});

test('GET /login should return logged-in owner', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	const response = await authAgent(owner).get('/login');

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
		apiKey,
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
	expect(apiKey).toBeUndefined();

	const authToken = utils.getAuthToken(response);
	expect(authToken).toBeUndefined();
});

test('GET /login should return logged-in member', async () => {
	const member = await testDb.createUser({ globalRole: globalMemberRole });

	const response = await authAgent(member).get('/login');

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
		apiKey,
	} = response.body.data;

	expect(validator.isUUID(id)).toBe(true);
	expect(email).toBe(member.email);
	expect(firstName).toBe(member.firstName);
	expect(lastName).toBe(member.lastName);
	expect(password).toBeUndefined();
	expect(personalizationAnswers).toBeNull();
	expect(password).toBeUndefined();
	expect(resetPasswordToken).toBeUndefined();
	expect(globalRole).toBeDefined();
	expect(globalRole.name).toBe('member');
	expect(globalRole.scope).toBe('global');
	expect(apiKey).toBeUndefined();

	const authToken = utils.getAuthToken(response);
	expect(authToken).toBeUndefined();
});

test('POST /logout should log user out', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	const response = await authAgent(owner).post('/logout');

	expect(response.statusCode).toBe(200);
	expect(response.body).toEqual(LOGGED_OUT_RESPONSE_BODY);

	const authToken = utils.getAuthToken(response);
	expect(authToken).toBeUndefined();
});

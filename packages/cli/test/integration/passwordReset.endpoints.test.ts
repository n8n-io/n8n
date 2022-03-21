import express = require('express');
import { v4 as uuid } from 'uuid';

import * as utils from './shared/utils';
import { Db } from '../../src';
import config = require('../../config');
import { compare } from 'bcryptjs';
import {
	randomEmail,
	randomInvalidPassword,
	randomName,
	randomValidPassword,
} from './shared/random';
import { Role } from '../../src/databases/entities/Role';
import * as testDb from './shared/testDb';

let app: express.Application;
let globalOwnerRole: Role;
let testDbName = '';

beforeAll(async () => {
	app = utils.initTestServer({ endpointGroups: ['passwordReset'], applyAuth: true });
	const initResult = await testDb.init();
	testDbName = initResult.testDbName;

	await testDb.truncate(['User'], testDbName);

	globalOwnerRole = await Db.collections.Role!.findOneOrFail({
		name: 'owner',
		scope: 'global',
	});

	utils.initTestTelemetry();
	utils.initTestLogger();
});

beforeEach(async () => {
	jest.isolateModules(() => {
		jest.mock('../../config');
	});

	config.set('userManagement.isInstanceOwnerSetUp', true);
	config.set('userManagement.emails.mode', '');

	await testDb.createUser({
		id: INITIAL_TEST_USER.id,
		email: INITIAL_TEST_USER.email,
		password: INITIAL_TEST_USER.password,
		firstName: INITIAL_TEST_USER.firstName,
		lastName: INITIAL_TEST_USER.lastName,
		globalRole: globalOwnerRole,
	});
});

afterEach(async () => {
	await testDb.truncate(['User'], testDbName);
});

afterAll(async () => {
	await testDb.terminate(testDbName);
});

test('POST /forgot-password should send password reset email', async () => {
	const authlessAgent = utils.createAgent(app);

	const {
		user,
		pass,
		smtp: { host, port, secure },
	} = await utils.getSmtpTestAccount();

	config.set('userManagement.emails.mode', 'smtp');
	config.set('userManagement.emails.smtp.host', host);
	config.set('userManagement.emails.smtp.port', port);
	config.set('userManagement.emails.smtp.secure', secure);
	config.set('userManagement.emails.smtp.auth.user', user);
	config.set('userManagement.emails.smtp.auth.pass', pass);

	const response = await authlessAgent
		.post('/forgot-password')
		.send({ email: INITIAL_TEST_USER.email });

	expect(response.statusCode).toBe(200);
	expect(response.body).toEqual({});

	const owner = await Db.collections.User!.findOneOrFail({ email: INITIAL_TEST_USER.email });
	expect(owner.resetPasswordToken).toBeDefined();
	expect(owner.resetPasswordTokenExpiration).toBeGreaterThan(Math.ceil(Date.now() / 1000));
});

test('POST /forgot-password should fail if emailing is not set up', async () => {
	const authlessAgent = utils.createAgent(app);

	const response = await authlessAgent
		.post('/forgot-password')
		.send({ email: INITIAL_TEST_USER.email });

	expect(response.statusCode).toBe(500);

	const owner = await Db.collections.User!.findOneOrFail({ email: INITIAL_TEST_USER.email });
	expect(owner.resetPasswordToken).toBeNull();
});

test('POST /forgot-password should fail with invalid inputs', async () => {
	const authlessAgent = utils.createAgent(app);

	config.set('userManagement.emails.mode', 'smtp');

	const invalidPayloads = [
		randomEmail(),
		[randomEmail()],
		{},
		[{ name: randomName() }],
		[{ email: randomName() }],
	];

	for (const invalidPayload of invalidPayloads) {
		const response = await authlessAgent.post('/forgot-password').send(invalidPayload);
		expect(response.statusCode).toBe(400);

		const owner = await Db.collections.User!.findOneOrFail({ email: INITIAL_TEST_USER.email });
		expect(owner.resetPasswordToken).toBeNull();
	}
});

test('POST /forgot-password should fail if user is not found', async () => {
	const authlessAgent = utils.createAgent(app);

	config.set('userManagement.emails.mode', 'smtp');

	const response = await authlessAgent.post('/forgot-password').send({ email: randomEmail() });

	// response should have 200 to not provide any information to the requester
	expect(response.statusCode).toBe(200);
});

test('GET /resolve-password-token should succeed with valid inputs', async () => {
	const authlessAgent = utils.createAgent(app);

	const resetPasswordToken = uuid();
	const resetPasswordTokenExpiration = Math.floor(Date.now() / 1000) + 100;

	await Db.collections.User!.update(INITIAL_TEST_USER.id, {
		resetPasswordToken,
		resetPasswordTokenExpiration,
	});

	const response = await authlessAgent
		.get('/resolve-password-token')
		.query({ userId: INITIAL_TEST_USER.id, token: resetPasswordToken });

	expect(response.statusCode).toBe(200);
});

test('GET /resolve-password-token should fail with invalid inputs', async () => {
	const authlessAgent = utils.createAgent(app);

	config.set('userManagement.emails.mode', 'smtp');

	const first = await authlessAgent.get('/resolve-password-token').query({ token: uuid() });

	const second = await authlessAgent
		.get('/resolve-password-token')
		.query({ userId: INITIAL_TEST_USER.id });

	for (const response of [first, second]) {
		expect(response.statusCode).toBe(400);
	}
});

test('GET /resolve-password-token should fail if user is not found', async () => {
	const authlessAgent = utils.createAgent(app);

	config.set('userManagement.emails.mode', 'smtp');

	const response = await authlessAgent
		.get('/resolve-password-token')
		.query({ userId: INITIAL_TEST_USER.id, token: uuid() });

	expect(response.statusCode).toBe(404);
});

test('GET /resolve-password-token should fail if token is expired', async () => {
	const authlessAgent = utils.createAgent(app);

	const resetPasswordToken = uuid();
	const resetPasswordTokenExpiration = Math.floor(Date.now() / 1000) - 1;

	await Db.collections.User!.update(INITIAL_TEST_USER.id, {
		resetPasswordToken,
		resetPasswordTokenExpiration,
	});

	config.set('userManagement.emails.mode', 'smtp');

	const response = await authlessAgent
		.get('/resolve-password-token')
		.query({ userId: INITIAL_TEST_USER.id, token: resetPasswordToken });

	expect(response.statusCode).toBe(404);
});

test('POST /change-password should succeed with valid inputs', async () => {
	const authlessAgent = utils.createAgent(app);

	const resetPasswordToken = uuid();
	const resetPasswordTokenExpiration = Math.floor(Date.now() / 1000) + 100;

	await Db.collections.User!.update(INITIAL_TEST_USER.id, {
		resetPasswordToken,
		resetPasswordTokenExpiration,
	});

	const passwordToStore = randomValidPassword();

	const response = await authlessAgent.post('/change-password').send({
		token: resetPasswordToken,
		userId: INITIAL_TEST_USER.id,
		password: passwordToStore,
	});

	expect(response.statusCode).toBe(200);

	const authToken = utils.getAuthToken(response);
	expect(authToken).toBeDefined();

	const { password: storedPassword } = await Db.collections.User!.findOneOrFail(
		INITIAL_TEST_USER.id,
	);

	const comparisonResult = await compare(passwordToStore, storedPassword!);
	expect(comparisonResult).toBe(true);
	expect(storedPassword).not.toBe(passwordToStore);
});

test('POST /change-password should fail with invalid inputs', async () => {
	const authlessAgent = utils.createAgent(app);

	const resetPasswordToken = uuid();
	const resetPasswordTokenExpiration = Math.floor(Date.now() / 1000) + 100;

	await Db.collections.User!.update(INITIAL_TEST_USER.id, {
		resetPasswordToken,
		resetPasswordTokenExpiration,
	});

	const invalidPayloads = [
		{ token: uuid() },
		{ id: INITIAL_TEST_USER.id },
		{ password: randomValidPassword() },
		{ token: uuid(), id: INITIAL_TEST_USER.id },
		{ token: uuid(), password: randomValidPassword() },
		{ id: INITIAL_TEST_USER.id, password: randomValidPassword() },
		{
			id: INITIAL_TEST_USER.id,
			password: randomInvalidPassword(),
			token: resetPasswordToken,
		},
		{
			id: INITIAL_TEST_USER.id,
			password: randomValidPassword(),
			token: uuid(),
		},
	];

	const { password: originalHashedPassword } = await Db.collections.User!.findOneOrFail();

	for (const invalidPayload of invalidPayloads) {
		const response = await authlessAgent.post('/change-password').query(invalidPayload);
		expect(response.statusCode).toBe(400);

		const { password: fetchedHashedPassword } = await Db.collections.User!.findOneOrFail();
		expect(originalHashedPassword).toBe(fetchedHashedPassword);
	}
});

test('POST /change-password should fail when token has expired', async () => {
	const authlessAgent = utils.createAgent(app);

	const resetPasswordToken = uuid();
	const resetPasswordTokenExpiration = Math.floor(Date.now() / 1000) - 1;

	await Db.collections.User!.update(INITIAL_TEST_USER.id, {
		resetPasswordToken,
		resetPasswordTokenExpiration,
	});

	const passwordToStore = randomValidPassword();

	const response = await authlessAgent.post('/change-password').send({
		token: resetPasswordToken,
		userId: INITIAL_TEST_USER.id,
		password: passwordToStore,
	});

	expect(response.statusCode).toBe(404);
});

const INITIAL_TEST_USER = {
	id: uuid(),
	email: randomEmail(),
	firstName: randomName(),
	lastName: randomName(),
	password: randomValidPassword(),
};

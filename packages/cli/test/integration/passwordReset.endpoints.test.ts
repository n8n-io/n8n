import express = require('express');
import { getConnection } from 'typeorm';
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

let app: express.Application;
let globalOwnerRole: Role;

beforeAll(async () => {
	app = utils.initTestServer({ namespaces: ['passwordReset'], applyAuth: true });
	await utils.initTestDb();
	await utils.truncateUserTable();

	globalOwnerRole = await Db.collections.Role!.findOneOrFail({
		name: 'owner',
		scope: 'global',
	});
});

beforeEach(async () => {
	jest.isolateModules(() => {
		jest.mock('../../config');
	});

	config.set('userManagement.hasOwner', true);
	config.set('userManagement.emails.mode', '');

	await Db.collections.User!.save({
		id: INITIAL_TEST_USER.id,
		email: INITIAL_TEST_USER.email,
		password: INITIAL_TEST_USER.password,
		firstName: INITIAL_TEST_USER.firstName,
		lastName: INITIAL_TEST_USER.lastName,
		createdAt: new Date(),
		updatedAt: new Date(),
		globalRole: globalOwnerRole,
	});
});

afterEach(async () => {
	await utils.truncateUserTable();
});

afterAll(() => {
	return getConnection().close();
});

test('POST /forgot-password should send password reset email', async () => {
	const owner = await Db.collections.User!.findOneOrFail();
	const authOwnerAgent = await utils.createAuthAgent(app, owner);

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

	const response = await authOwnerAgent
		.post('/forgot-password')
		.send({ email: INITIAL_TEST_USER.email });

	expect(response.statusCode).toBe(200);
	expect(response.body).toEqual({});
});

test('POST /forgot-password should fail if emailing is not set up', async () => {
	const owner = await Db.collections.User!.findOneOrFail();
	const authOwnerAgent = await utils.createAuthAgent(app, owner);

	const response = await authOwnerAgent
		.post('/forgot-password')
		.send({ email: INITIAL_TEST_USER.email });

	expect(response.statusCode).toBe(500);
});

test('POST /forgot-password should fail with invalid inputs', async () => {
	const owner = await Db.collections.User!.findOneOrFail();
	const authOwnerAgent = await utils.createAuthAgent(app, owner);

	config.set('userManagement.emails.mode', 'smtp');

	const invalidPayloads = [
		randomEmail(),
		[randomEmail()],
		{},
		[{ name: randomName() }],
		[{ email: randomName() }],
	];

	for (const invalidPayload of invalidPayloads) {
		const response = await authOwnerAgent.post('/forgot-password').send(invalidPayload);
		expect(response.statusCode).toBe(400);
	}
});

test('POST /forgot-password should fail if user is not found', async () => {
	const owner = await Db.collections.User!.findOneOrFail();
	const authOwnerAgent = await utils.createAuthAgent(app, owner);

	config.set('userManagement.emails.mode', 'smtp');

	const response = await authOwnerAgent.post('/forgot-password').send({ email: randomEmail() });

	expect(response.statusCode).toBe(404);
});

test('GET /resolve-password-token should succeed with valid inputs', async () => {
	const owner = await Db.collections.User!.findOneOrFail();
	const authOwnerAgent = await utils.createAuthAgent(app, owner);

	const resetPasswordToken = uuid();

	await Db.collections.User!.update(INITIAL_TEST_USER.id, { resetPasswordToken });

	const response = await authOwnerAgent
		.get('/resolve-password-token')
		.query({ userId: INITIAL_TEST_USER.id, token: resetPasswordToken });

	expect(response.statusCode).toBe(200);
});

test('GET /resolve-password-token should fail with invalid inputs', async () => {
	const owner = await Db.collections.User!.findOneOrFail();
	const authOwnerAgent = await utils.createAuthAgent(app, owner);

	config.set('userManagement.emails.mode', 'smtp');

	const first = await authOwnerAgent.get('/resolve-password-token').query({ token: uuid() });

	const second = await authOwnerAgent
		.get('/resolve-password-token')
		.query({ userId: INITIAL_TEST_USER.id });

	for (const response of [first, second]) {
		expect(response.statusCode).toBe(400);
	}
});

test('GET /resolve-password-token should fail if user is not found', async () => {
	const owner = await Db.collections.User!.findOneOrFail();
	const authOwnerAgent = await utils.createAuthAgent(app, owner);

	config.set('userManagement.emails.mode', 'smtp');

	const response = await authOwnerAgent
		.get('/resolve-password-token')
		.query({ userId: INITIAL_TEST_USER.id, token: uuid() });

	expect(response.statusCode).toBe(404);
});

test('POST /change-password should succeed with valid inputs', async () => {
	const owner = await Db.collections.User!.findOneOrFail();
	const authOwnerAgent = await utils.createAuthAgent(app, owner);

	const resetPasswordToken = uuid();
	await Db.collections.User!.update(INITIAL_TEST_USER.id, { resetPasswordToken });

	const passwordToSet = randomValidPassword();

	const response = await authOwnerAgent.post('/change-password').send({
		token: resetPasswordToken,
		id: INITIAL_TEST_USER.id,
		password: passwordToSet,
	});

	expect(response.statusCode).toBe(200);

	const authToken = utils.getAuthToken(response);
	expect(authToken).toBeDefined();

	const { password: storedPassword } = await Db.collections.User!.findOneOrFail(
		INITIAL_TEST_USER.id,
	);

	const comparisonResult = await compare(passwordToSet, storedPassword!);
	expect(comparisonResult).toBe(true);
});

test('POST /change-password should fail with invalid inputs', async () => {
	const owner = await Db.collections.User!.findOneOrFail();
	const authOwnerAgent = await utils.createAuthAgent(app, owner);

	const resetPasswordToken = uuid();
	await Db.collections.User!.update(INITIAL_TEST_USER.id, { resetPasswordToken });

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

	for (const invalidPayload of invalidPayloads) {
		const response = await authOwnerAgent.post('/change-password').query(invalidPayload);
		expect(response.statusCode).toBe(400);
	}
});

const INITIAL_TEST_USER = {
	id: uuid(),
	email: randomEmail(),
	firstName: randomName(),
	lastName: randomName(),
	password: randomValidPassword(),
};

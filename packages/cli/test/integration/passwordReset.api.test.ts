import express from 'express';
import { v4 as uuid } from 'uuid';

import * as utils from './shared/utils';
import * as Db from '@/Db';
import config from '@/config';
import { compare } from 'bcryptjs';
import {
	randomEmail,
	randomInvalidPassword,
	randomName,
	randomValidPassword,
} from './shared/random';
import * as testDb from './shared/testDb';
import type { Role } from '@db/entities/Role';

jest.mock('@/UserManagement/email/NodeMailer');

let app: express.Application;
let globalOwnerRole: Role;
let globalMemberRole: Role;

beforeAll(async () => {
	app = await utils.initTestServer({ endpointGroups: ['passwordReset'] });

	globalOwnerRole = await testDb.getGlobalOwnerRole();
	globalMemberRole = await testDb.getGlobalMemberRole();
});

beforeEach(async () => {
	await testDb.truncate(['User']);

	jest.mock('@/config');

	config.set('userManagement.isInstanceOwnerSetUp', true);
	config.set('userManagement.emails.mode', '');
});

afterAll(async () => {
	await testDb.terminate();
});

test('POST /forgot-password should send password reset email', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	const authlessAgent = utils.createAgent(app);
	const member = await testDb.createUser({
		email: 'test@test.com',
		globalRole: globalMemberRole,
	});

	config.set('userManagement.emails.mode', 'smtp');

	await Promise.all(
		[{ email: owner.email }, { email: member.email.toUpperCase() }].map(async (payload) => {
			const response = await authlessAgent.post('/forgot-password').send(payload);

			expect(response.statusCode).toBe(200);
			expect(response.body).toEqual({});

			const user = await Db.collections.User.findOneByOrFail({ email: payload.email });
			expect(user.resetPasswordToken).toBeDefined();
			expect(user.resetPasswordTokenExpiration).toBeGreaterThan(Math.ceil(Date.now() / 1000));
		}),
	);
});

test('POST /forgot-password should fail if emailing is not set up', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	const authlessAgent = utils.createAgent(app);

	const response = await authlessAgent.post('/forgot-password').send({ email: owner.email });

	expect(response.statusCode).toBe(500);

	const storedOwner = await Db.collections.User.findOneByOrFail({ email: owner.email });
	expect(storedOwner.resetPasswordToken).toBeNull();
});

test('POST /forgot-password should fail with invalid inputs', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	const authlessAgent = utils.createAgent(app);

	config.set('userManagement.emails.mode', 'smtp');

	const invalidPayloads = [
		randomEmail(),
		[randomEmail()],
		{},
		[{ name: randomName() }],
		[{ email: randomName() }],
	];

	await Promise.all(
		invalidPayloads.map(async (invalidPayload) => {
			const response = await authlessAgent.post('/forgot-password').send(invalidPayload);
			expect(response.statusCode).toBe(400);

			const storedOwner = await Db.collections.User.findOneByOrFail({ email: owner.email });
			expect(storedOwner.resetPasswordToken).toBeNull();
		}),
	);
});

test('POST /forgot-password should fail if user is not found', async () => {
	const authlessAgent = utils.createAgent(app);

	config.set('userManagement.emails.mode', 'smtp');

	const response = await authlessAgent.post('/forgot-password').send({ email: randomEmail() });

	expect(response.statusCode).toBe(200); // expect 200 to remain vague
});

test('GET /resolve-password-token should succeed with valid inputs', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	const authlessAgent = utils.createAgent(app);

	const resetPasswordToken = uuid();
	const resetPasswordTokenExpiration = Math.floor(Date.now() / 1000) + 100;

	await Db.collections.User.update(owner.id, {
		resetPasswordToken,
		resetPasswordTokenExpiration,
	});

	const response = await authlessAgent
		.get('/resolve-password-token')
		.query({ userId: owner.id, token: resetPasswordToken });

	expect(response.statusCode).toBe(200);
});

test('GET /resolve-password-token should fail with invalid inputs', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	const authlessAgent = utils.createAgent(app);

	config.set('userManagement.emails.mode', 'smtp');

	const first = await authlessAgent.get('/resolve-password-token').query({ token: uuid() });

	const second = await authlessAgent.get('/resolve-password-token').query({ userId: owner.id });

	for (const response of [first, second]) {
		expect(response.statusCode).toBe(400);
	}
});

test('GET /resolve-password-token should fail if user is not found', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	const authlessAgent = utils.createAgent(app);

	config.set('userManagement.emails.mode', 'smtp');

	const response = await authlessAgent
		.get('/resolve-password-token')
		.query({ userId: owner.id, token: uuid() });

	expect(response.statusCode).toBe(404);
});

test('GET /resolve-password-token should fail if token is expired', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	const authlessAgent = utils.createAgent(app);

	const resetPasswordToken = uuid();
	const resetPasswordTokenExpiration = Math.floor(Date.now() / 1000) - 1;

	await Db.collections.User.update(owner.id, {
		resetPasswordToken,
		resetPasswordTokenExpiration,
	});

	config.set('userManagement.emails.mode', 'smtp');

	const response = await authlessAgent
		.get('/resolve-password-token')
		.query({ userId: owner.id, token: resetPasswordToken });

	expect(response.statusCode).toBe(404);
});

test('POST /change-password should succeed with valid inputs', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	const authlessAgent = utils.createAgent(app);

	const resetPasswordToken = uuid();
	const resetPasswordTokenExpiration = Math.floor(Date.now() / 1000) + 100;

	await Db.collections.User.update(owner.id, {
		resetPasswordToken,
		resetPasswordTokenExpiration,
	});

	const passwordToStore = randomValidPassword();

	const response = await authlessAgent.post('/change-password').send({
		token: resetPasswordToken,
		userId: owner.id,
		password: passwordToStore,
	});

	expect(response.statusCode).toBe(200);

	const authToken = utils.getAuthToken(response);
	expect(authToken).toBeDefined();

	const { password: storedPassword } = await Db.collections.User.findOneByOrFail({ id: owner.id });

	const comparisonResult = await compare(passwordToStore, storedPassword);
	expect(comparisonResult).toBe(true);
	expect(storedPassword).not.toBe(passwordToStore);
});

test('POST /change-password should fail with invalid inputs', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	const authlessAgent = utils.createAgent(app);

	const resetPasswordToken = uuid();
	const resetPasswordTokenExpiration = Math.floor(Date.now() / 1000) + 100;

	await Db.collections.User.update(owner.id, {
		resetPasswordToken,
		resetPasswordTokenExpiration,
	});

	const invalidPayloads = [
		{ token: uuid() },
		{ id: owner.id },
		{ password: randomValidPassword() },
		{ token: uuid(), id: owner.id },
		{ token: uuid(), password: randomValidPassword() },
		{ id: owner.id, password: randomValidPassword() },
		{
			id: owner.id,
			password: randomInvalidPassword(),
			token: resetPasswordToken,
		},
		{
			id: owner.id,
			password: randomValidPassword(),
			token: uuid(),
		},
	];

	await Promise.all(
		invalidPayloads.map(async (invalidPayload) => {
			const response = await authlessAgent.post('/change-password').query(invalidPayload);
			expect(response.statusCode).toBe(400);

			const { password: storedPassword } = await Db.collections.User.findOneByOrFail({});
			expect(owner.password).toBe(storedPassword);
		}),
	);
});

test('POST /change-password should fail when token has expired', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	const authlessAgent = utils.createAgent(app);

	const resetPasswordToken = uuid();
	const resetPasswordTokenExpiration = Math.floor(Date.now() / 1000) - 1;

	await Db.collections.User.update(owner.id, {
		resetPasswordToken,
		resetPasswordTokenExpiration,
	});

	const passwordToStore = randomValidPassword();

	const response = await authlessAgent.post('/change-password').send({
		token: resetPasswordToken,
		userId: owner.id,
		password: passwordToStore,
	});

	expect(response.statusCode).toBe(404);
});

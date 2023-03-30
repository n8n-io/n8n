import type { SuperAgentTest } from 'supertest';
import { v4 as uuid } from 'uuid';
import { compare } from 'bcryptjs';

import * as Db from '@/Db';
import config from '@/config';
import type { Role } from '@db/entities/Role';
import type { User } from '@db/entities/User';
import * as utils from './shared/utils';
import {
	randomEmail,
	randomInvalidPassword,
	randomName,
	randomValidPassword,
} from './shared/random';
import * as testDb from './shared/testDb';
import { setCurrentAuthenticationMethod } from '@/sso/ssoHelpers';

jest.mock('@/UserManagement/email/NodeMailer');

let globalOwnerRole: Role;
let globalMemberRole: Role;
let owner: User;
let authlessAgent: SuperAgentTest;

beforeAll(async () => {
	const app = await utils.initTestServer({ endpointGroups: ['passwordReset'] });

	globalOwnerRole = await testDb.getGlobalOwnerRole();
	globalMemberRole = await testDb.getGlobalMemberRole();

	authlessAgent = utils.createAgent(app);
});

beforeEach(async () => {
	await testDb.truncate(['User']);
	owner = await testDb.createUser({ globalRole: globalOwnerRole });

	config.set('userManagement.isInstanceOwnerSetUp', true);
});

afterAll(async () => {
	await testDb.terminate();
});

describe('POST /forgot-password', () => {
	test('should send password reset email', async () => {
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

	test('should fail if emailing is not set up', async () => {
		config.set('userManagement.emails.mode', '');

		await authlessAgent.post('/forgot-password').send({ email: owner.email }).expect(500);

		const storedOwner = await Db.collections.User.findOneByOrFail({ email: owner.email });
		expect(storedOwner.resetPasswordToken).toBeNull();
	});

	test('should fail if SAML is authentication method', async () => {
		await setCurrentAuthenticationMethod('saml');
		config.set('userManagement.emails.mode', 'smtp');
		const member = await testDb.createUser({
			email: 'test@test.com',
			globalRole: globalMemberRole,
		});

		await authlessAgent.post('/forgot-password').send({ email: member.email }).expect(403);

		const storedOwner = await Db.collections.User.findOneByOrFail({ email: member.email });
		expect(storedOwner.resetPasswordToken).toBeNull();
		await setCurrentAuthenticationMethod('email');
	});

	test('should succeed if SAML is authentication method and requestor is owner', async () => {
		await setCurrentAuthenticationMethod('saml');
		config.set('userManagement.emails.mode', 'smtp');

		const response = await authlessAgent.post('/forgot-password').send({ email: owner.email });

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual({});

		const storedOwner = await Db.collections.User.findOneByOrFail({ email: owner.email });
		expect(storedOwner.resetPasswordToken).not.toBeNull();
		await setCurrentAuthenticationMethod('email');
	});

	test('should fail with invalid inputs', async () => {
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

	test('should fail if user is not found', async () => {
		config.set('userManagement.emails.mode', 'smtp');

		const response = await authlessAgent.post('/forgot-password').send({ email: randomEmail() });

		expect(response.statusCode).toBe(200); // expect 200 to remain vague
	});
});

describe('GET /resolve-password-token', () => {
	beforeEach(() => {
		config.set('userManagement.emails.mode', 'smtp');
	});

	test('should succeed with valid inputs', async () => {
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

	test('should fail with invalid inputs', async () => {
		const first = await authlessAgent.get('/resolve-password-token').query({ token: uuid() });

		const second = await authlessAgent.get('/resolve-password-token').query({ userId: owner.id });

		for (const response of [first, second]) {
			expect(response.statusCode).toBe(400);
		}
	});

	test('should fail if user is not found', async () => {
		const response = await authlessAgent
			.get('/resolve-password-token')
			.query({ userId: owner.id, token: uuid() });

		expect(response.statusCode).toBe(404);
	});

	test('should fail if token is expired', async () => {
		const resetPasswordToken = uuid();
		const resetPasswordTokenExpiration = Math.floor(Date.now() / 1000) - 1;

		await Db.collections.User.update(owner.id, {
			resetPasswordToken,
			resetPasswordTokenExpiration,
		});

		const response = await authlessAgent
			.get('/resolve-password-token')
			.query({ userId: owner.id, token: resetPasswordToken });

		expect(response.statusCode).toBe(404);
	});
});

describe('POST /change-password', () => {
	const resetPasswordToken = uuid();
	const passwordToStore = randomValidPassword();

	test('should succeed with valid inputs', async () => {
		const resetPasswordTokenExpiration = Math.floor(Date.now() / 1000) + 100;

		await Db.collections.User.update(owner.id, {
			resetPasswordToken,
			resetPasswordTokenExpiration,
		});

		const response = await authlessAgent.post('/change-password').send({
			token: resetPasswordToken,
			userId: owner.id,
			password: passwordToStore,
		});

		expect(response.statusCode).toBe(200);

		const authToken = utils.getAuthToken(response);
		expect(authToken).toBeDefined();

		const { password: storedPassword } = await Db.collections.User.findOneByOrFail({
			id: owner.id,
		});

		const comparisonResult = await compare(passwordToStore, storedPassword);
		expect(comparisonResult).toBe(true);
		expect(storedPassword).not.toBe(passwordToStore);
	});

	test('should fail with invalid inputs', async () => {
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

	test('should fail when token has expired', async () => {
		const resetPasswordTokenExpiration = Math.floor(Date.now() / 1000) - 1;

		await Db.collections.User.update(owner.id, {
			resetPasswordToken,
			resetPasswordTokenExpiration,
		});

		const response = await authlessAgent.post('/change-password').send({
			token: resetPasswordToken,
			userId: owner.id,
			password: passwordToStore,
		});

		expect(response.statusCode).toBe(404);
	});
});

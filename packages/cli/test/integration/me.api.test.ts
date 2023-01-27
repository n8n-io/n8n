import express from 'express';
import { IsNull } from 'typeorm';
import validator from 'validator';

import config from '@/config';
import * as Db from '@/Db';
import type { Role } from '@db/entities/Role';
import { SUCCESS_RESPONSE_BODY } from './shared/constants';
import {
	randomApiKey,
	randomEmail,
	randomName,
	randomString,
	randomValidPassword,
} from './shared/random';
import * as testDb from './shared/testDb';
import type { AuthAgent } from './shared/types';
import * as utils from './shared/utils';

let app: express.Application;
let globalOwnerRole: Role;
let globalMemberRole: Role;
let authAgent: AuthAgent;

beforeAll(async () => {
	app = await utils.initTestServer({ endpointGroups: ['me'], applyAuth: true });
	await testDb.init();

	globalOwnerRole = await testDb.getGlobalOwnerRole();
	globalMemberRole = await testDb.getGlobalMemberRole();

	authAgent = utils.createAuthAgent(app);

	utils.initTestLogger();
	utils.initTestTelemetry();
});

beforeEach(async () => {
	await testDb.truncate(['User']);
});

afterAll(async () => {
	await testDb.terminate();
});

describe('Owner shell', () => {
	test('GET /me should return sanitized owner shell', async () => {
		const ownerShell = await testDb.createUserShell(globalOwnerRole);

		const response = await authAgent(ownerShell).get('/me');

		expect(response.statusCode).toBe(200);

		const {
			id,
			email,
			firstName,
			lastName,
			personalizationAnswers,
			globalRole,
			password,
			resetPasswordToken,
			isPending,
			apiKey,
		} = response.body.data;

		expect(validator.isUUID(id)).toBe(true);
		expect(email).toBeNull();
		expect(firstName).toBeNull();
		expect(lastName).toBeNull();
		expect(personalizationAnswers).toBeNull();
		expect(password).toBeUndefined();
		expect(resetPasswordToken).toBeUndefined();
		expect(isPending).toBe(true);
		expect(globalRole.name).toBe('owner');
		expect(globalRole.scope).toBe('global');
		expect(apiKey).toBeUndefined();
	});

	test('PATCH /me should succeed with valid inputs', async () => {
		const ownerShell = await testDb.createUserShell(globalOwnerRole);
		const authOwnerShellAgent = authAgent(ownerShell);

		for (const validPayload of VALID_PATCH_ME_PAYLOADS) {
			const response = await authOwnerShellAgent.patch('/me').send(validPayload);

			expect(response.statusCode).toBe(200);

			const {
				id,
				email,
				firstName,
				lastName,
				personalizationAnswers,
				globalRole,
				password,
				resetPasswordToken,
				isPending,
				apiKey,
			} = response.body.data;

			expect(validator.isUUID(id)).toBe(true);
			expect(email).toBe(validPayload.email.toLowerCase());
			expect(firstName).toBe(validPayload.firstName);
			expect(lastName).toBe(validPayload.lastName);
			expect(personalizationAnswers).toBeNull();
			expect(password).toBeUndefined();
			expect(resetPasswordToken).toBeUndefined();
			expect(isPending).toBe(false);
			expect(globalRole.name).toBe('owner');
			expect(globalRole.scope).toBe('global');
			expect(apiKey).toBeUndefined();

			const storedOwnerShell = await Db.collections.User.findOneByOrFail({ id });

			expect(storedOwnerShell.email).toBe(validPayload.email.toLowerCase());
			expect(storedOwnerShell.firstName).toBe(validPayload.firstName);
			expect(storedOwnerShell.lastName).toBe(validPayload.lastName);
		}
	});

	test('PATCH /me should fail with invalid inputs', async () => {
		const ownerShell = await testDb.createUserShell(globalOwnerRole);
		const authOwnerShellAgent = authAgent(ownerShell);

		for (const invalidPayload of INVALID_PATCH_ME_PAYLOADS) {
			const response = await authOwnerShellAgent.patch('/me').send(invalidPayload);
			expect(response.statusCode).toBe(400);

			const storedOwnerShell = await Db.collections.User.findOneByOrFail({});
			expect(storedOwnerShell.email).toBeNull();
			expect(storedOwnerShell.firstName).toBeNull();
			expect(storedOwnerShell.lastName).toBeNull();
		}
	});

	test('PATCH /me/password should fail for shell', async () => {
		const ownerShell = await testDb.createUserShell(globalOwnerRole);
		const authOwnerShellAgent = authAgent(ownerShell);

		const validPasswordPayload = {
			currentPassword: randomValidPassword(),
			newPassword: randomValidPassword(),
		};

		const validPayloads = [validPasswordPayload, ...INVALID_PASSWORD_PAYLOADS];

		await Promise.all(
			validPayloads.map(async (payload) => {
				const response = await authOwnerShellAgent.patch('/me/password').send(payload);
				expect([400, 500].includes(response.statusCode)).toBe(true);

				const storedMember = await Db.collections.User.findOneByOrFail({});

				if (payload.newPassword) {
					expect(storedMember.password).not.toBe(payload.newPassword);
				}

				if (payload.currentPassword) {
					expect(storedMember.password).not.toBe(payload.currentPassword);
				}
			}),
		);

		const storedOwnerShell = await Db.collections.User.findOneByOrFail({});
		expect(storedOwnerShell.password).toBeNull();
	});

	test('POST /me/survey should succeed with valid inputs', async () => {
		const ownerShell = await testDb.createUserShell(globalOwnerRole);
		const authOwnerShellAgent = authAgent(ownerShell);

		const validPayloads = [SURVEY, {}];

		for (const validPayload of validPayloads) {
			const response = await authOwnerShellAgent.post('/me/survey').send(validPayload);

			expect(response.statusCode).toBe(200);
			expect(response.body).toEqual(SUCCESS_RESPONSE_BODY);

			const storedShellOwner = await Db.collections.User.findOneOrFail({
				where: { email: IsNull() },
			});

			expect(storedShellOwner.personalizationAnswers).toEqual(validPayload);
		}
	});

	test('POST /me/api-key should create an api key', async () => {
		const ownerShell = await testDb.createUserShell(globalOwnerRole);

		const response = await authAgent(ownerShell).post('/me/api-key');

		expect(response.statusCode).toBe(200);
		expect(response.body.data.apiKey).toBeDefined();
		expect(response.body.data.apiKey).not.toBeNull();

		const storedShellOwner = await Db.collections.User.findOneOrFail({
			where: { email: IsNull() },
		});

		expect(storedShellOwner.apiKey).toEqual(response.body.data.apiKey);
	});

	test('GET /me/api-key should fetch the api key', async () => {
		let ownerShell = await testDb.createUserShell(globalOwnerRole);
		ownerShell = await testDb.addApiKey(ownerShell);

		const response = await authAgent(ownerShell).get('/me/api-key');

		expect(response.statusCode).toBe(200);
		expect(response.body.data.apiKey).toEqual(ownerShell.apiKey);
	});

	test('DELETE /me/api-key should fetch the api key', async () => {
		let ownerShell = await testDb.createUserShell(globalOwnerRole);
		ownerShell = await testDb.addApiKey(ownerShell);

		const response = await authAgent(ownerShell).delete('/me/api-key');

		expect(response.statusCode).toBe(200);

		const storedShellOwner = await Db.collections.User.findOneOrFail({
			where: { email: IsNull() },
		});

		expect(storedShellOwner.apiKey).toBeNull();
	});
});

describe('Member', () => {
	beforeEach(async () => {
		config.set('userManagement.isInstanceOwnerSetUp', true);

		await Db.collections.Settings.update(
			{ key: 'userManagement.isInstanceOwnerSetUp' },
			{ value: JSON.stringify(true) },
		);
	});

	test('GET /me should return sanitized member', async () => {
		const member = await testDb.createUser({ globalRole: globalMemberRole });

		const response = await authAgent(member).get('/me');

		expect(response.statusCode).toBe(200);

		const {
			id,
			email,
			firstName,
			lastName,
			personalizationAnswers,
			globalRole,
			password,
			resetPasswordToken,
			isPending,
			apiKey,
		} = response.body.data;

		expect(validator.isUUID(id)).toBe(true);
		expect(email).toBe(member.email);
		expect(firstName).toBe(member.firstName);
		expect(lastName).toBe(member.lastName);
		expect(personalizationAnswers).toBeNull();
		expect(password).toBeUndefined();
		expect(resetPasswordToken).toBeUndefined();
		expect(isPending).toBe(false);
		expect(globalRole.name).toBe('member');
		expect(globalRole.scope).toBe('global');
		expect(apiKey).toBeUndefined();
	});

	test('PATCH /me should succeed with valid inputs', async () => {
		const member = await testDb.createUser({ globalRole: globalMemberRole });
		const authMemberAgent = authAgent(member);

		for (const validPayload of VALID_PATCH_ME_PAYLOADS) {
			const response = await authMemberAgent.patch('/me').send(validPayload);

			expect(response.statusCode).toBe(200);

			const {
				id,
				email,
				firstName,
				lastName,
				personalizationAnswers,
				globalRole,
				password,
				resetPasswordToken,
				isPending,
				apiKey,
			} = response.body.data;

			expect(validator.isUUID(id)).toBe(true);
			expect(email).toBe(validPayload.email.toLowerCase());
			expect(firstName).toBe(validPayload.firstName);
			expect(lastName).toBe(validPayload.lastName);
			expect(personalizationAnswers).toBeNull();
			expect(password).toBeUndefined();
			expect(resetPasswordToken).toBeUndefined();
			expect(isPending).toBe(false);
			expect(globalRole.name).toBe('member');
			expect(globalRole.scope).toBe('global');
			expect(apiKey).toBeUndefined();

			const storedMember = await Db.collections.User.findOneByOrFail({ id });

			expect(storedMember.email).toBe(validPayload.email.toLowerCase());
			expect(storedMember.firstName).toBe(validPayload.firstName);
			expect(storedMember.lastName).toBe(validPayload.lastName);
		}
	});

	test('PATCH /me should fail with invalid inputs', async () => {
		const member = await testDb.createUser({ globalRole: globalMemberRole });
		const authMemberAgent = authAgent(member);

		for (const invalidPayload of INVALID_PATCH_ME_PAYLOADS) {
			const response = await authMemberAgent.patch('/me').send(invalidPayload);
			expect(response.statusCode).toBe(400);

			const storedMember = await Db.collections.User.findOneByOrFail({});
			expect(storedMember.email).toBe(member.email);
			expect(storedMember.firstName).toBe(member.firstName);
			expect(storedMember.lastName).toBe(member.lastName);
		}
	});

	test('PATCH /me/password should succeed with valid inputs', async () => {
		const memberPassword = randomValidPassword();
		const member = await testDb.createUser({
			password: memberPassword,
			globalRole: globalMemberRole,
		});

		const validPayload = {
			currentPassword: memberPassword,
			newPassword: randomValidPassword(),
		};

		const response = await authAgent(member).patch('/me/password').send(validPayload);
		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual(SUCCESS_RESPONSE_BODY);

		const storedMember = await Db.collections.User.findOneByOrFail({});
		expect(storedMember.password).not.toBe(member.password);
		expect(storedMember.password).not.toBe(validPayload.newPassword);
	});

	test('PATCH /me/password should fail with invalid inputs', async () => {
		const member = await testDb.createUser({ globalRole: globalMemberRole });
		const authMemberAgent = authAgent(member);

		for (const payload of INVALID_PASSWORD_PAYLOADS) {
			const response = await authMemberAgent.patch('/me/password').send(payload);
			expect([400, 500].includes(response.statusCode)).toBe(true);

			const storedMember = await Db.collections.User.findOneByOrFail({});

			if (payload.newPassword) {
				expect(storedMember.password).not.toBe(payload.newPassword);
			}
			if (payload.currentPassword) {
				expect(storedMember.password).not.toBe(payload.currentPassword);
			}
		}
	});

	test('POST /me/survey should succeed with valid inputs', async () => {
		const member = await testDb.createUser({ globalRole: globalMemberRole });
		const authMemberAgent = authAgent(member);

		const validPayloads = [SURVEY, {}];

		for (const validPayload of validPayloads) {
			const response = await authMemberAgent.post('/me/survey').send(validPayload);
			expect(response.statusCode).toBe(200);
			expect(response.body).toEqual(SUCCESS_RESPONSE_BODY);

			const { personalizationAnswers: storedAnswers } = await Db.collections.User.findOneByOrFail(
				{},
			);

			expect(storedAnswers).toEqual(validPayload);
		}
	});

	test('POST /me/api-key should create an api key', async () => {
		const member = await testDb.createUser({
			globalRole: globalMemberRole,
			apiKey: randomApiKey(),
		});

		const response = await authAgent(member).post('/me/api-key');

		expect(response.statusCode).toBe(200);
		expect(response.body.data.apiKey).toBeDefined();
		expect(response.body.data.apiKey).not.toBeNull();

		const storedMember = await Db.collections.User.findOneByOrFail({ id: member.id });

		expect(storedMember.apiKey).toEqual(response.body.data.apiKey);
	});

	test('GET /me/api-key should fetch the api key', async () => {
		const member = await testDb.createUser({
			globalRole: globalMemberRole,
			apiKey: randomApiKey(),
		});

		const response = await authAgent(member).get('/me/api-key');

		expect(response.statusCode).toBe(200);
		expect(response.body.data.apiKey).toEqual(member.apiKey);
	});

	test('DELETE /me/api-key should fetch the api key', async () => {
		const member = await testDb.createUser({
			globalRole: globalMemberRole,
			apiKey: randomApiKey(),
		});

		const response = await authAgent(member).delete('/me/api-key');

		expect(response.statusCode).toBe(200);

		const storedMember = await Db.collections.User.findOneByOrFail({ id: member.id });

		expect(storedMember.apiKey).toBeNull();
	});
});

describe('Owner', () => {
	beforeEach(async () => {
		config.set('userManagement.isInstanceOwnerSetUp', true);
	});

	test('GET /me should return sanitized owner', async () => {
		const owner = await testDb.createUser({ globalRole: globalOwnerRole });

		const response = await authAgent(owner).get('/me');

		expect(response.statusCode).toBe(200);

		const {
			id,
			email,
			firstName,
			lastName,
			personalizationAnswers,
			globalRole,
			password,
			resetPasswordToken,
			isPending,
			apiKey,
		} = response.body.data;

		expect(validator.isUUID(id)).toBe(true);
		expect(email).toBe(owner.email);
		expect(firstName).toBe(owner.firstName);
		expect(lastName).toBe(owner.lastName);
		expect(personalizationAnswers).toBeNull();
		expect(password).toBeUndefined();
		expect(resetPasswordToken).toBeUndefined();
		expect(isPending).toBe(false);
		expect(globalRole.name).toBe('owner');
		expect(globalRole.scope).toBe('global');
		expect(apiKey).toBeUndefined();
	});

	test('PATCH /me should succeed with valid inputs', async () => {
		const owner = await testDb.createUser({ globalRole: globalOwnerRole });
		const authOwnerAgent = authAgent(owner);

		for (const validPayload of VALID_PATCH_ME_PAYLOADS) {
			const response = await authOwnerAgent.patch('/me').send(validPayload);

			expect(response.statusCode).toBe(200);

			const {
				id,
				email,
				firstName,
				lastName,
				personalizationAnswers,
				globalRole,
				password,
				resetPasswordToken,
				isPending,
				apiKey,
			} = response.body.data;

			expect(validator.isUUID(id)).toBe(true);
			expect(email).toBe(validPayload.email.toLowerCase());
			expect(firstName).toBe(validPayload.firstName);
			expect(lastName).toBe(validPayload.lastName);
			expect(personalizationAnswers).toBeNull();
			expect(password).toBeUndefined();
			expect(resetPasswordToken).toBeUndefined();
			expect(isPending).toBe(false);
			expect(globalRole.name).toBe('owner');
			expect(globalRole.scope).toBe('global');
			expect(apiKey).toBeUndefined();

			const storedOwner = await Db.collections.User.findOneByOrFail({ id });

			expect(storedOwner.email).toBe(validPayload.email.toLowerCase());
			expect(storedOwner.firstName).toBe(validPayload.firstName);
			expect(storedOwner.lastName).toBe(validPayload.lastName);
		}
	});
});

const SURVEY = [
	'codingSkill',
	'companyIndustry',
	'companySize',
	'otherCompanyIndustry',
	'otherWorkArea',
	'workArea',
].reduce<Record<string, string>>((acc, cur) => {
	return (acc[cur] = randomString(2, 10)), acc;
}, {});

const VALID_PATCH_ME_PAYLOADS = [
	{
		email: randomEmail(),
		firstName: randomName(),
		lastName: randomName(),
		password: randomValidPassword(),
	},
	{
		email: randomEmail().toUpperCase(),
		firstName: randomName(),
		lastName: randomName(),
		password: randomValidPassword(),
	},
];

const INVALID_PATCH_ME_PAYLOADS = [
	{
		email: 'invalid',
		firstName: randomName(),
		lastName: randomName(),
	},
	{
		email: randomEmail(),
		firstName: '',
		lastName: randomName(),
	},
	{
		email: randomEmail(),
		firstName: randomName(),
		lastName: '',
	},
	{
		email: randomEmail(),
		firstName: 123,
		lastName: randomName(),
	},
	{
		firstName: randomName(),
		lastName: randomName(),
	},
	{
		firstName: randomName(),
	},
	{
		lastName: randomName(),
	},
	{
		email: randomEmail(),
		firstName: 'John <script',
		lastName: randomName(),
	},
	{
		email: randomEmail(),
		firstName: 'John <a',
		lastName: randomName(),
	},
];

const INVALID_PASSWORD_PAYLOADS = [
	{
		currentPassword: null,
		newPassword: randomValidPassword(),
	},
	{
		currentPassword: '',
		newPassword: randomValidPassword(),
	},
	{
		currentPassword: {},
		newPassword: randomValidPassword(),
	},
	{
		currentPassword: [],
		newPassword: randomValidPassword(),
	},
	{
		currentPassword: randomValidPassword(),
	},
	{
		newPassword: randomValidPassword(),
	},
	{
		currentPassword: randomValidPassword(),
		newPassword: null,
	},
	{
		currentPassword: randomValidPassword(),
		newPassword: '',
	},
	{
		currentPassword: randomValidPassword(),
		newPassword: {},
	},
	{
		currentPassword: randomValidPassword(),
		newPassword: [],
	},
];

import type { Application } from 'express';
import type { SuperAgentTest } from 'supertest';
import { IsNull } from 'typeorm';
import validator from 'validator';
import * as Db from '@/Db';
import type { Role } from '@db/entities/Role';
import type { User } from '@db/entities/User';
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

let app: Application;
let globalOwnerRole: Role;
let globalMemberRole: Role;
let authAgent: AuthAgent;

beforeAll(async () => {
	app = await utils.initTestServer({ endpointGroups: ['me'] });

	globalOwnerRole = await testDb.getGlobalOwnerRole();
	globalMemberRole = await testDb.getGlobalMemberRole();

	authAgent = utils.createAuthAgent(app);
});

beforeEach(async () => {
	await testDb.truncate(['User']);
});

afterAll(async () => {
	await testDb.terminate();
});

describe('Owner shell', () => {
	let ownerShell: User;
	let authOwnerShellAgent: SuperAgentTest;

	beforeEach(async () => {
		ownerShell = await testDb.createUserShell(globalOwnerRole);
		await testDb.addApiKey(ownerShell);
		authOwnerShellAgent = authAgent(ownerShell);
	});

	test('PATCH /me should succeed with valid inputs', async () => {
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
		const response = await authOwnerShellAgent.post('/me/api-key');

		expect(response.statusCode).toBe(200);
		expect(response.body.data.apiKey).toBeDefined();
		expect(response.body.data.apiKey).not.toBeNull();

		const storedShellOwner = await Db.collections.User.findOneOrFail({
			where: { email: IsNull() },
		});

		expect(storedShellOwner.apiKey).toEqual(response.body.data.apiKey);
	});

	test('GET /me/api-key should fetch the api key', async () => {
		const response = await authOwnerShellAgent.get('/me/api-key');

		expect(response.statusCode).toBe(200);
		expect(response.body.data.apiKey).toEqual(ownerShell.apiKey);
	});

	test('DELETE /me/api-key should fetch the api key', async () => {
		const response = await authOwnerShellAgent.delete('/me/api-key');

		expect(response.statusCode).toBe(200);

		const storedShellOwner = await Db.collections.User.findOneOrFail({
			where: { email: IsNull() },
		});

		expect(storedShellOwner.apiKey).toBeNull();
	});
});

describe('Member', () => {
	const memberPassword = randomValidPassword();
	let member: User;
	let authMemberAgent: SuperAgentTest;

	beforeEach(async () => {
		member = await testDb.createUser({
			password: memberPassword,
			globalRole: globalMemberRole,
			apiKey: randomApiKey(),
		});
		authMemberAgent = authAgent(member);

		await utils.setInstanceOwnerSetUp(true);
	});

	test('PATCH /me should succeed with valid inputs', async () => {
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
		const validPayload = {
			currentPassword: memberPassword,
			newPassword: randomValidPassword(),
		};

		const response = await authMemberAgent.patch('/me/password').send(validPayload);
		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual(SUCCESS_RESPONSE_BODY);

		const storedMember = await Db.collections.User.findOneByOrFail({});
		expect(storedMember.password).not.toBe(member.password);
		expect(storedMember.password).not.toBe(validPayload.newPassword);
	});

	test('PATCH /me/password should fail with invalid inputs', async () => {
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
		const response = await authAgent(member).post('/me/api-key');

		expect(response.statusCode).toBe(200);
		expect(response.body.data.apiKey).toBeDefined();
		expect(response.body.data.apiKey).not.toBeNull();

		const storedMember = await Db.collections.User.findOneByOrFail({ id: member.id });

		expect(storedMember.apiKey).toEqual(response.body.data.apiKey);
	});

	test('GET /me/api-key should fetch the api key', async () => {
		const response = await authAgent(member).get('/me/api-key');

		expect(response.statusCode).toBe(200);
		expect(response.body.data.apiKey).toEqual(member.apiKey);
	});

	test('DELETE /me/api-key should fetch the api key', async () => {
		const response = await authAgent(member).delete('/me/api-key');

		expect(response.statusCode).toBe(200);

		const storedMember = await Db.collections.User.findOneByOrFail({ id: member.id });

		expect(storedMember.apiKey).toBeNull();
	});
});

describe('Owner', () => {
	beforeEach(async () => {
		await utils.setInstanceOwnerSetUp(true);
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

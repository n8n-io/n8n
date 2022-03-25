import { hashSync, genSaltSync } from 'bcryptjs';
import express = require('express');
import validator from 'validator';

import config = require('../../config');
import * as utils from './shared/utils';
import { SUCCESS_RESPONSE_BODY } from './shared/constants';
import { Db } from '../../src';
import { Role } from '../../src/databases/entities/Role';
import { randomValidPassword, randomEmail, randomName, randomString } from './shared/random';
import * as testDb from './shared/testDb';

let app: express.Application;
let testDbName = '';
let globalOwnerRole: Role;

beforeAll(async () => {
	app = utils.initTestServer({ endpointGroups: ['me'], applyAuth: true });
	const initResult = await testDb.init();
	testDbName = initResult.testDbName;

	globalOwnerRole = await testDb.getGlobalOwnerRole();
	utils.initTestLogger();
	utils.initTestTelemetry();
});

afterAll(async () => {
	await testDb.terminate(testDbName);
});

describe('Owner shell', () => {
	beforeEach(async () => {
		await testDb.createOwnerShell();
	});

	afterEach(async () => {
		await testDb.truncate(['User'], testDbName);
	});

	test('GET /me should return sanitized owner shell', async () => {
		const ownerShell = await Db.collections.User!.findOneOrFail();
		const authOwnerShellAgent = utils.createAgent(app, { auth: true, user: ownerShell });

		const response = await authOwnerShellAgent.get('/me');

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
	});

	test('PATCH /me should succeed with valid inputs', async () => {
		const ownerShell = await Db.collections.User!.findOneOrFail();
		const authOwnerShellAgent = utils.createAgent(app, { auth: true, user: ownerShell });

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
			} = response.body.data;

			expect(validator.isUUID(id)).toBe(true);
			expect(email).toBe(validPayload.email);
			expect(firstName).toBe(validPayload.firstName);
			expect(lastName).toBe(validPayload.lastName);
			expect(personalizationAnswers).toBeNull();
			expect(password).toBeUndefined();
			expect(resetPasswordToken).toBeUndefined();
			expect(isPending).toBe(false);
			expect(globalRole.name).toBe('owner');
			expect(globalRole.scope).toBe('global');

			const storedOwnerShell = await Db.collections.User!.findOneOrFail(id);

			expect(storedOwnerShell.email).toBe(validPayload.email);
			expect(storedOwnerShell.firstName).toBe(validPayload.firstName);
			expect(storedOwnerShell.lastName).toBe(validPayload.lastName);
		}
	});

	test('PATCH /me should fail with invalid inputs', async () => {
		const ownerShell = await Db.collections.User!.findOneOrFail();
		const authOwnerShellAgent = utils.createAgent(app, { auth: true, user: ownerShell });

		for (const invalidPayload of INVALID_PATCH_ME_PAYLOADS) {
			const response = await authOwnerShellAgent.patch('/me').send(invalidPayload);
			expect(response.statusCode).toBe(400);

			const storedOwnerShell = await Db.collections.User!.findOneOrFail();
			expect(storedOwnerShell.email).toBeNull();
			expect(storedOwnerShell.firstName).toBeNull();
			expect(storedOwnerShell.lastName).toBeNull();
		}
	});

	test('PATCH /me/password should fail for shell', async () => {
		const ownerShell = await Db.collections.User!.findOneOrFail();
		const authOwnerShellAgent = utils.createAgent(app, { auth: true, user: ownerShell });

		const validPasswordPayload = {
			currentPassword: randomValidPassword(),
			newPassword: randomValidPassword(),
		};

		const payloads = [validPasswordPayload, ...INVALID_PASSWORD_PAYLOADS];

		for (const payload of payloads) {
			const response = await authOwnerShellAgent.patch('/me/password').send(payload);
			expect([400, 500].includes(response.statusCode)).toBe(true);

			const storedMember = await Db.collections.User!.findOneOrFail();

			if (payload.newPassword) {
				expect(storedMember.password).not.toBe(payload.newPassword);
			}
			if (payload.currentPassword) {
				expect(storedMember.password).not.toBe(payload.currentPassword);
			}
		}

		const storedOwnerShell = await Db.collections.User!.findOneOrFail();
		expect(storedOwnerShell.password).toBeNull();
	});

	test('POST /me/survey should succeed with valid inputs', async () => {
		const ownerShell = await Db.collections.User!.findOneOrFail();
		const authOwnerShellAgent = utils.createAgent(app, { auth: true, user: ownerShell });

		const validPayloads = [SURVEY, {}];

		for (const validPayload of validPayloads) {
			const response = await authOwnerShellAgent.post('/me/survey').send(validPayload);
			expect(response.statusCode).toBe(200);
			expect(response.body).toEqual(SUCCESS_RESPONSE_BODY);

			const { personalizationAnswers: storedAnswers } = await Db.collections.User!.findOneOrFail();

			expect(storedAnswers).toEqual(validPayload);
		}
	});
});

describe('Member', () => {
	beforeEach(async () => {
		config.set('userManagement.isInstanceOwnerSetUp', true);

		await Db.collections.Settings!.update(
			{ key: 'userManagement.isInstanceOwnerSetUp' },
			{ value: JSON.stringify(true) },
		);
	});

	afterEach(async () => {
		await testDb.truncate(['User'], testDbName);
	});

	test('GET /me should return sanitized member', async () => {
		const member = await testDb.createUser();
		const authMemberAgent = utils.createAgent(app, { auth: true, user: member });

		const response = await authMemberAgent.get('/me');

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
	});

	test('PATCH /me should succeed with valid inputs', async () => {
		const member = await testDb.createUser();
		const authMemberAgent = utils.createAgent(app, { auth: true, user: member });

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
			} = response.body.data;

			expect(validator.isUUID(id)).toBe(true);
			expect(email).toBe(validPayload.email);
			expect(firstName).toBe(validPayload.firstName);
			expect(lastName).toBe(validPayload.lastName);
			expect(personalizationAnswers).toBeNull();
			expect(password).toBeUndefined();
			expect(resetPasswordToken).toBeUndefined();
			expect(isPending).toBe(false);
			expect(globalRole.name).toBe('member');
			expect(globalRole.scope).toBe('global');

			const storedMember = await Db.collections.User!.findOneOrFail(id);

			expect(storedMember.email).toBe(validPayload.email);
			expect(storedMember.firstName).toBe(validPayload.firstName);
			expect(storedMember.lastName).toBe(validPayload.lastName);
		}
	});

	test('PATCH /me should fail with invalid inputs', async () => {
		const member = await testDb.createUser();
		const authMemberAgent = utils.createAgent(app, { auth: true, user: member });

		for (const invalidPayload of INVALID_PATCH_ME_PAYLOADS) {
			const response = await authMemberAgent.patch('/me').send(invalidPayload);
			expect(response.statusCode).toBe(400);

			const storedMember = await Db.collections.User!.findOneOrFail();
			expect(storedMember.email).toBe(member.email);
			expect(storedMember.firstName).toBe(member.firstName);
			expect(storedMember.lastName).toBe(member.lastName);
		}
	});

	test('PATCH /me/password should succeed with valid inputs', async () => {
		const memberPassword = randomValidPassword();
		const member = await testDb.createUser({
			password: hashSync(memberPassword, genSaltSync(10)),
		});
		const authMemberAgent = utils.createAgent(app, { auth: true, user: member });

		const validPayload = {
			currentPassword: memberPassword,
			newPassword: randomValidPassword(),
		};

		const response = await authMemberAgent.patch('/me/password').send(validPayload);
		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual(SUCCESS_RESPONSE_BODY);

		const storedMember = await Db.collections.User!.findOneOrFail();
		expect(storedMember.password).not.toBe(member.password);
		expect(storedMember.password).not.toBe(validPayload.newPassword);
	});

	test('PATCH /me/password should fail with invalid inputs', async () => {
		const member = await testDb.createUser();
		const authMemberAgent = utils.createAgent(app, { auth: true, user: member });

		for (const payload of INVALID_PASSWORD_PAYLOADS) {
			const response = await authMemberAgent.patch('/me/password').send(payload);
			expect([400, 500].includes(response.statusCode)).toBe(true);

			const storedMember = await Db.collections.User!.findOneOrFail();

			if (payload.newPassword) {
				expect(storedMember.password).not.toBe(payload.newPassword);
			}
			if (payload.currentPassword) {
				expect(storedMember.password).not.toBe(payload.currentPassword);
			}
		}
	});

	test('POST /me/survey should succeed with valid inputs', async () => {
		const member = await testDb.createUser();
		const authMemberAgent = utils.createAgent(app, { auth: true, user: member });

		const validPayloads = [SURVEY, {}];

		for (const validPayload of validPayloads) {
			const response = await authMemberAgent.post('/me/survey').send(validPayload);
			expect(response.statusCode).toBe(200);
			expect(response.body).toEqual(SUCCESS_RESPONSE_BODY);

			const { personalizationAnswers: storedAnswers } = await Db.collections.User!.findOneOrFail();

			expect(storedAnswers).toEqual(validPayload);
		}
	});
});

describe('Owner', () => {
	beforeEach(async () => {
		config.set('userManagement.isInstanceOwnerSetUp', true);
	});

	afterEach(async () => {
		await testDb.truncate(['User'], testDbName);
	});

	test('GET /me should return sanitized owner', async () => {
		const owner = await testDb.createUser({ globalRole: globalOwnerRole });
		const authOwnerAgent = utils.createAgent(app, { auth: true, user: owner });

		const response = await authOwnerAgent.get('/me');

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
	});

	test('PATCH /me should succeed with valid inputs', async () => {
		const owner = await testDb.createUser({ globalRole: globalOwnerRole });
		const authOwnerAgent = utils.createAgent(app, { auth: true, user: owner });

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
			} = response.body.data;

			expect(validator.isUUID(id)).toBe(true);
			expect(email).toBe(validPayload.email);
			expect(firstName).toBe(validPayload.firstName);
			expect(lastName).toBe(validPayload.lastName);
			expect(personalizationAnswers).toBeNull();
			expect(password).toBeUndefined();
			expect(resetPasswordToken).toBeUndefined();
			expect(isPending).toBe(false);
			expect(globalRole.name).toBe('owner');
			expect(globalRole.scope).toBe('global');

			const storedOwner = await Db.collections.User!.findOneOrFail(id);

			expect(storedOwner.email).toBe(validPayload.email);
			expect(storedOwner.firstName).toBe(validPayload.firstName);
			expect(storedOwner.lastName).toBe(validPayload.lastName);
		}
	});
});

const TEST_USER = {
	email: randomEmail(),
	firstName: randomName(),
	lastName: randomName(),
};

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
		email: randomEmail(),
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

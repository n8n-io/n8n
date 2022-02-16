import { hashSync, genSaltSync } from 'bcryptjs';
import express = require('express');
import { getConnection } from 'typeorm';
import validator from 'validator';
import { v4 as uuid } from 'uuid';

import config = require('../../config');
import * as utils from './shared/utils';
import { SUCCESS_RESPONSE_BODY } from './shared/constants';
import { Db } from '../../src';
import { User } from '../../src/databases/entities/User';
import { Role } from '../../src/databases/entities/Role';
import {
	randomValidPassword,
	randomInvalidPassword,
	randomEmail,
	randomName,
	randomString,
} from './shared/random';
import { getGlobalOwnerRole } from './shared/utils';

let globalOwnerRole: Role;

describe('/me endpoints', () => {
	describe('Shell requests', () => {
		let app: express.Application;

		beforeAll(async () => {
			app = utils.initTestServer({ namespaces: ['me'], applyAuth: true });
			await utils.initTestDb();

			globalOwnerRole = await getGlobalOwnerRole();
		});

		beforeEach(async () => {
			await utils.createOwnerShell();
		});

		afterEach(async () => {
			await utils.truncate(['User']);
		});

		afterAll(() => {
			return getConnection().close();
		});

		test('GET /me should return sanitized shell', async () => {
			const shell = await Db.collections.User!.findOneOrFail();
			const authShellAgent = await utils.createAgent(app, { auth: true, user: shell });

			const response = await authShellAgent.get('/me');

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
			} = response.body.data;

			expect(validator.isUUID(id)).toBe(true);
			expect(email).toBeNull();
			expect(firstName).toBeNull();
			expect(lastName).toBeNull();
			expect(personalizationAnswers).toBeNull();
			expect(password).toBeUndefined();
			expect(resetPasswordToken).toBeUndefined();
			expect(globalRole.name).toBe('owner');
			expect(globalRole.scope).toBe('global');
		});

		test('PATCH /me should succeed with valid inputs', async () => {
			const shell = await Db.collections.User!.findOneOrFail();
			const authShellAgent = await utils.createAgent(app, { auth: true, user: shell });

			for (const validPayload of VALID_PATCH_ME_PAYLOADS) {
				const response = await authShellAgent.patch('/me').send(validPayload);

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
				} = response.body.data;

				expect(validator.isUUID(id)).toBe(true);
				expect(email).toBe(validPayload.email);
				expect(firstName).toBe(validPayload.firstName);
				expect(lastName).toBe(validPayload.lastName);
				expect(personalizationAnswers).toBeNull();
				expect(password).toBeUndefined();
				expect(resetPasswordToken).toBeUndefined();
				expect(globalRole.name).toBe('owner');
				expect(globalRole.scope).toBe('global');
			}
		});

		test('PATCH /me should fail with invalid inputs', async () => {
			const shell = await Db.collections.User!.findOneOrFail();
			const authShellAgent = await utils.createAgent(app, { auth: true, user: shell });

			for (const invalidPayload of INVALID_PATCH_ME_PAYLOADS) {
				const response = await authShellAgent.patch('/me').send(invalidPayload);
				expect(response.statusCode).toBe(400);
			}
		});

		test('PATCH /me/password should succeed with valid inputs', async () => {
			const shell = await Db.collections.User!.findOneOrFail();
			const authShellAgent = await utils.createAgent(app, { auth: true, user: shell });

			const validPayloads = Array.from({ length: 3 }, () => ({
				password: randomValidPassword(),
			}));

			for (const validPayload of validPayloads) {
				const response = await authShellAgent.patch('/me/password').send(validPayload);
				expect(response.statusCode).toBe(200);
				expect(response.body).toEqual(SUCCESS_RESPONSE_BODY);
			}
		});

		test('PATCH /me/password should fail with invalid inputs', async () => {
			const shell = await Db.collections.User!.findOneOrFail();
			const authShellAgent = await utils.createAgent(app, { auth: true, user: shell });

			const invalidPayloads = [
				...Array.from({ length: 3 }, () => ({ password: randomInvalidPassword() })),
				{},
				undefined,
				'',
			];

			for (const invalidPayload of invalidPayloads) {
				const response = await authShellAgent.patch('/me/password').send(invalidPayload);
				expect(response.statusCode).toBe(400);
			}
		});

		test('POST /me/survey should succeed with valid inputs', async () => {
			const shell = await Db.collections.User!.findOneOrFail();
			const authShellAgent = await utils.createAgent(app, { auth: true, user: shell });

			const validPayloads = [SURVEY, {}];

			for (const validPayload of validPayloads) {
				const response = await authShellAgent.post('/me/survey').send(validPayload);
				expect(response.statusCode).toBe(200);
				expect(response.body).toEqual(SUCCESS_RESPONSE_BODY);
			}
		});
	});

	describe('Member requests', () => {
		let app: express.Application;

		beforeAll(async () => {
			app = utils.initTestServer({ namespaces: ['me'], applyAuth: true });
			await utils.initTestDb();
			await utils.truncate(['User']);
		});

		beforeEach(async () => {
			const globalMemberRole = await Db.collections.Role!.findOneOrFail({
				name: 'member',
				scope: 'global',
			});

			const newMember = new User();

			Object.assign(newMember, {
				id: uuid(),
				email: TEST_USER.email,
				firstName: TEST_USER.firstName,
				lastName: TEST_USER.lastName,
				password: hashSync(randomValidPassword(), genSaltSync(10)),
				globalRole: globalMemberRole,
			});

			await Db.collections.User!.save(newMember);

			config.set('userManagement.hasOwner', true);

			await Db.collections.Settings!.update(
				{ key: 'userManagement.hasOwner' },
				{ value: JSON.stringify(true) },
			);
		});

		afterEach(async () => {
			await utils.truncate(['User']);
		});

		afterAll(() => {
			return getConnection().close();
		});

		test('GET /me should return sanitized member', async () => {
			const member = await Db.collections.User!.findOneOrFail();
			const authMemberAgent = await utils.createAgent(app, { auth: true, user: member });

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
			} = response.body.data;

			expect(validator.isUUID(id)).toBe(true);
			expect(email).toBe(TEST_USER.email);
			expect(firstName).toBe(TEST_USER.firstName);
			expect(lastName).toBe(TEST_USER.lastName);
			expect(personalizationAnswers).toBeNull();
			expect(password).toBeUndefined();
			expect(resetPasswordToken).toBeUndefined();
			expect(globalRole.name).toBe('member');
			expect(globalRole.scope).toBe('global');
		});

		test('PATCH /me should succeed with valid inputs', async () => {
			const member = await Db.collections.User!.findOneOrFail();
			const authMemberAgent = await utils.createAgent(app, { auth: true, user: member });

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
				} = response.body.data;

				expect(validator.isUUID(id)).toBe(true);
				expect(email).toBe(validPayload.email);
				expect(firstName).toBe(validPayload.firstName);
				expect(lastName).toBe(validPayload.lastName);
				expect(personalizationAnswers).toBeNull();
				expect(password).toBeUndefined();
				expect(resetPasswordToken).toBeUndefined();
				expect(globalRole.name).toBe('member');
				expect(globalRole.scope).toBe('global');
			}
		});

		test('PATCH /me should fail with invalid inputs', async () => {
			const member = await Db.collections.User!.findOneOrFail();
			const authMemberAgent = await utils.createAgent(app, { auth: true, user: member });

			for (const invalidPayload of INVALID_PATCH_ME_PAYLOADS) {
				const response = await authMemberAgent.patch('/me').send(invalidPayload);
				expect(response.statusCode).toBe(400);
			}
		});

		test('PATCH /me/password should succeed with valid inputs', async () => {
			const member = await Db.collections.User!.findOneOrFail();
			const authMemberAgent = await utils.createAgent(app, { auth: true, user: member });

			const validPayloads = Array.from({ length: 3 }, () => ({
				password: randomValidPassword(),
			}));

			for (const validPayload of validPayloads) {
				const response = await authMemberAgent.patch('/me/password').send(validPayload);
				expect(response.statusCode).toBe(200);
				expect(response.body).toEqual(SUCCESS_RESPONSE_BODY);
			}
		});

		test('PATCH /me/password should fail with invalid inputs', async () => {
			const member = await Db.collections.User!.findOneOrFail();
			const authMemberAgent = await utils.createAgent(app, { auth: true, user: member });

			const invalidPayloads = [
				...Array.from({ length: 3 }, () => ({ password: randomInvalidPassword() })),
				{},
				undefined,
				'',
			];

			for (const invalidPayload of invalidPayloads) {
				const response = await authMemberAgent.patch('/me/password').send(invalidPayload);
				expect(response.statusCode).toBe(400);
			}
		});

		test('POST /me/survey should succeed with valid inputs', async () => {
			const member = await Db.collections.User!.findOneOrFail();
			const authMemberAgent = await utils.createAgent(app, { auth: true, user: member });

			const validPayloads = [SURVEY, {}];

			for (const validPayload of validPayloads) {
				const response = await authMemberAgent.post('/me/survey').send(validPayload);
				expect(response.statusCode).toBe(200);
				expect(response.body).toEqual(SUCCESS_RESPONSE_BODY);
			}
		});
	});

	describe('Owner requests', () => {
		let app: express.Application;

		beforeAll(async () => {
			app = utils.initTestServer({ namespaces: ['me'], applyAuth: true });
			await utils.initTestDb();
			await utils.truncate(['User']);
		});

		beforeEach(async () => {
			await Db.collections.User!.save({
				id: uuid(),
				email: TEST_USER.email,
				firstName: TEST_USER.firstName,
				lastName: TEST_USER.lastName,
				password: hashSync(randomValidPassword(), genSaltSync(10)),
				globalRole: globalOwnerRole,
			});

			config.set('userManagement.hasOwner', true);
		});

		afterEach(async () => {
			await utils.truncate(['User']);
		});

		afterAll(() => {
			return getConnection().close();
		});

		test('GET /me should return sanitized owner', async () => {
			const owner = await Db.collections.User!.findOneOrFail();
			const authOwnerAgent = await utils.createAgent(app, { auth: true, user: owner });

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
			} = response.body.data;

			expect(validator.isUUID(id)).toBe(true);
			expect(email).toBe(TEST_USER.email);
			expect(firstName).toBe(TEST_USER.firstName);
			expect(lastName).toBe(TEST_USER.lastName);
			expect(personalizationAnswers).toBeNull();
			expect(password).toBeUndefined();
			expect(resetPasswordToken).toBeUndefined();
			expect(globalRole.name).toBe('owner');
			expect(globalRole.scope).toBe('global');
		});

		test('PATCH /me should succeed with valid inputs', async () => {
			const owner = await Db.collections.User!.findOneOrFail();
			const authOwnerAgent = await utils.createAgent(app, { auth: true, user: owner });

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
				} = response.body.data;

				expect(validator.isUUID(id)).toBe(true);
				expect(email).toBe(validPayload.email);
				expect(firstName).toBe(validPayload.firstName);
				expect(lastName).toBe(validPayload.lastName);
				expect(personalizationAnswers).toBeNull();
				expect(password).toBeUndefined();
				expect(resetPasswordToken).toBeUndefined();
				expect(globalRole.name).toBe('owner');
				expect(globalRole.scope).toBe('global');
			}
		});
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
	return (acc[cur] = randomString(1, 10)), acc;
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

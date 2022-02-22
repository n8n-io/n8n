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
	describe('Owner shell requests', () => {
		let app: express.Application;

		beforeAll(async () => {
			app = utils.initTestServer({ namespaces: ['me'], applyAuth: true });
			await utils.initTestDb();

			globalOwnerRole = await getGlobalOwnerRole();
			utils.initLogger();
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

		test('GET /me should return sanitized owner shell', async () => {
			const ownerShell = await Db.collections.User!.findOneOrFail();
			const authOwnerShellAgent = await utils.createAgent(app, { auth: true, user: ownerShell });

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
			const ownerShell = await Db.collections.User!.findOneOrFail();
			const authOwnerShellAgent = await utils.createAgent(app, { auth: true, user: ownerShell });

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

				const storedOwnerShell = await Db.collections.User!.findOneOrFail(id);

				expect(storedOwnerShell.email).toBe(validPayload.email);
				expect(storedOwnerShell.firstName).toBe(validPayload.firstName);
				expect(storedOwnerShell.lastName).toBe(validPayload.lastName);
			}
		});

		test('PATCH /me should fail with invalid inputs', async () => {
			const ownerShell = await Db.collections.User!.findOneOrFail();
			const authOwnerShellAgent = await utils.createAgent(app, { auth: true, user: ownerShell });

			for (const invalidPayload of INVALID_PATCH_ME_PAYLOADS) {
				const response = await authOwnerShellAgent.patch('/me').send(invalidPayload);
				expect(response.statusCode).toBe(400);

				const storedOwnerShell = await Db.collections.User!.findOneOrFail();
				expect(storedOwnerShell.email).toBeNull();
				expect(storedOwnerShell.firstName).toBeNull();
				expect(storedOwnerShell.lastName).toBeNull();
			}
		});

		test('PATCH /me/password should succeed with valid inputs', async () => {
			const ownerShell = await Db.collections.User!.findOneOrFail();
			const authOwnerShellAgent = await utils.createAgent(app, { auth: true, user: ownerShell });

			const validPayloads = Array.from({ length: 3 }, () => ({
				password: randomValidPassword(),
			}));

			for (const validPayload of validPayloads) {
				const response = await authOwnerShellAgent.patch('/me/password').send(validPayload);
				expect(response.statusCode).toBe(200);
				expect(response.body).toEqual(SUCCESS_RESPONSE_BODY);

				const storedOwnerShell = await Db.collections.User!.findOneOrFail();
				expect(storedOwnerShell.password).not.toBe(validPayload.password);
			}
		});

		test('PATCH /me/password should fail with invalid inputs', async () => {
			const ownerShell = await Db.collections.User!.findOneOrFail();
			const authOwnerShellAgent = await utils.createAgent(app, { auth: true, user: ownerShell });

			const invalidPayloads: Array<any> = [
				...Array.from({ length: 3 }, () => ({ password: randomInvalidPassword() })),
				{},
				undefined,
				'',
			];

			for (const invalidPayload of invalidPayloads) {
				const response = await authOwnerShellAgent.patch('/me/password').send(invalidPayload);
				expect(response.statusCode).toBe(400);

				const storedMember = await Db.collections.User!.findOneOrFail();

				if (invalidPayload?.password) {
					expect(storedMember.password).not.toBe(invalidPayload.password);
				}
			}
		});

		test('POST /me/survey should succeed with valid inputs', async () => {
			const ownerShell = await Db.collections.User!.findOneOrFail();
			const authOwnerShellAgent = await utils.createAgent(app, { auth: true, user: ownerShell });

			const validPayloads = [SURVEY, {}];

			for (const validPayload of validPayloads) {
				const response = await authOwnerShellAgent.post('/me/survey').send(validPayload);
				expect(response.statusCode).toBe(200);
				expect(response.body).toEqual(SUCCESS_RESPONSE_BODY);

				const storedOwnerShell = await Db.collections.User!.findOneOrFail();
				expect(storedOwnerShell.personalizationAnswers).toEqual(validPayload);
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

				const storedMember = await Db.collections.User!.findOneOrFail(id);

				expect(storedMember.email).toBe(validPayload.email);
				expect(storedMember.firstName).toBe(validPayload.firstName);
				expect(storedMember.lastName).toBe(validPayload.lastName);
			}
		});

		test('PATCH /me should fail with invalid inputs', async () => {
			const member = await Db.collections.User!.findOneOrFail();
			const authMemberAgent = await utils.createAgent(app, { auth: true, user: member });

			for (const invalidPayload of INVALID_PATCH_ME_PAYLOADS) {
				const response = await authMemberAgent.patch('/me').send(invalidPayload);
				expect(response.statusCode).toBe(400);

				const storedMember = await Db.collections.User!.findOneOrFail();
				expect(storedMember.email).toBe(TEST_USER.email);
				expect(storedMember.firstName).toBe(TEST_USER.firstName);
				expect(storedMember.lastName).toBe(TEST_USER.lastName);
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

				const storedMember = await Db.collections.User!.findOneOrFail();
				expect(storedMember.password).not.toBe(validPayload.password);
			}
		});

		test('PATCH /me/password should fail with invalid inputs', async () => {
			const member = await Db.collections.User!.findOneOrFail();
			const authMemberAgent = await utils.createAgent(app, { auth: true, user: member });

			const invalidPayloads: Array<any> = [
				...Array.from({ length: 3 }, () => ({ password: randomInvalidPassword() })),
				{},
				undefined,
				'',
			];

			for (const invalidPayload of invalidPayloads) {
				const response = await authMemberAgent.patch('/me/password').send(invalidPayload);
				expect(response.statusCode).toBe(400);

				const storedMember = await Db.collections.User!.findOneOrFail();

				if (invalidPayload?.password) {
					expect(storedMember.password).not.toBe(invalidPayload.password);
				}
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

				const storedMember = await Db.collections.User!.findOneOrFail();
				expect(storedMember.personalizationAnswers).toEqual(validPayload);
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

				const storedOwner = await Db.collections.User!.findOneOrFail(id);

				expect(storedOwner.email).toBe(validPayload.email);
				expect(storedOwner.firstName).toBe(validPayload.firstName);
				expect(storedOwner.lastName).toBe(validPayload.lastName);
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

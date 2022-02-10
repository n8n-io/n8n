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

describe('Shell requests', () => {
	let app: express.Application;

	beforeAll(async () => {
		app = utils.initTestServer({ me: true }, { applyAuth: true });
		await utils.initTestDb();
		await utils.truncateUserTable();
	});

	beforeEach(async () => {
		const role = await Db.collections.Role!.findOneOrFail({ name: 'owner', scope: 'global' });

		await Db.collections.User!.save({
			id: uuid(),
			createdAt: new Date(),
			updatedAt: new Date(),
			globalRole: role,
		});
	});

	afterEach(async () => {
		await utils.truncateUserTable();
	});

	afterAll(() => {
		return getConnection().close();
	});

	test('GET /me should return sanitized shell', async () => {
		const shell = await Db.collections.User!.findOneOrFail();
		const shellAgent = await utils.createAuthAgent(app, shell);

		const response = await shellAgent.get('/me');

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
		const shellAgent = await utils.createAuthAgent(app, shell);

		for (const validPayload of VALID_PATCH_ME_PAYLOADS) {
			const response = await shellAgent.patch('/me').send(validPayload);

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
		const shellAgent = await utils.createAuthAgent(app, shell);

		for (const invalidPayload of INVALID_PATCH_ME_PAYLOADS) {
			const response = await shellAgent.patch('/me').send(invalidPayload);
			expect(response.statusCode).toBe(400);
		}
	});

	test('PATCH /me/password should succeed with valid inputs', async () => {
		const shell = await Db.collections.User!.findOneOrFail();
		const shellAgent = await utils.createAuthAgent(app, shell);

		const validPayloads = Array.from({ length: 3 }, () => ({
			password: utils.randomValidPassword(),
		}));

		for (const validPayload of validPayloads) {
			const response = await shellAgent.patch('/me/password').send(validPayload);
			expect(response.statusCode).toBe(200);
			expect(response.body).toEqual(SUCCESS_RESPONSE_BODY);
		}
	});

	test('PATCH /me/password should fail with invalid inputs', async () => {
		const shell = await Db.collections.User!.findOneOrFail();
		const shellAgent = await utils.createAuthAgent(app, shell);

		const invalidPayloads = [
			...Array.from({ length: 3 }, () => ({ password: utils.randomInvalidPassword() })),
			{},
			undefined,
			'',
		];

		for (const invalidPayload of invalidPayloads) {
			const response = await shellAgent.patch('/me/password').send(invalidPayload);
			expect(response.statusCode).toBe(400);
		}
	});

	test('POST /me/survey should succeed with valid inputs', async () => {
		const shell = await Db.collections.User!.findOneOrFail();
		const shellAgent = await utils.createAuthAgent(app, shell);

		const validPayloads = [SURVEY, {}];

		for (const validPayload of validPayloads) {
			const response = await shellAgent.post('/me/survey').send(validPayload);
			expect(response.statusCode).toBe(200);
			expect(response.body).toEqual(SUCCESS_RESPONSE_BODY);
		}
	});
});

describe('Member requests', () => {
	let app: express.Application;

	beforeAll(async () => {
		app = utils.initTestServer({ me: true }, { applyAuth: true });
		await utils.initTestDb();
		await utils.truncateUserTable();
	});

	beforeEach(async () => {
		const role = await Db.collections.Role!.findOneOrFail({ name: 'member', scope: 'global' });

		const newMember = new User();

		Object.assign(newMember, {
			id: uuid(),
			email: TEST_USER.email,
			firstName: TEST_USER.firstName,
			lastName: TEST_USER.lastName,
			password: hashSync(utils.randomValidPassword(), genSaltSync(10)),
			globalRole: role,
		});

		await Db.collections.User!.save(newMember);

		config.set('userManagement.hasOwner', true);

		await Db.collections.Settings!.update(
			{ key: 'userManagement.hasOwner' },
			{ value: JSON.stringify(true) },
		);
	});

	afterEach(async () => {
		await utils.truncateUserTable();
	});

	afterAll(() => {
		return getConnection().close();
	});

	test('GET /me should return sanitized member', async () => {
		const member = await Db.collections.User!.findOneOrFail();
		const memberAgent = await utils.createAuthAgent(app, member);

		const response = await memberAgent.get('/me');

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
		const memberAgent = await utils.createAuthAgent(app, member);

		for (const validPayload of VALID_PATCH_ME_PAYLOADS) {
			const response = await memberAgent.patch('/me').send(validPayload);

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
		const memberAgent = await utils.createAuthAgent(app, member);

		for (const invalidPayload of INVALID_PATCH_ME_PAYLOADS) {
			const response = await memberAgent.patch('/me').send(invalidPayload);
			expect(response.statusCode).toBe(400);
		}
	});

	test('PATCH /me/password should succeed with valid inputs', async () => {
		const member = await Db.collections.User!.findOneOrFail();
		const memberAgent = await utils.createAuthAgent(app, member);

		const validPayloads = Array.from({ length: 3 }, () => ({
			password: utils.randomValidPassword(),
		}));

		for (const validPayload of validPayloads) {
			const response = await memberAgent.patch('/me/password').send(validPayload);
			expect(response.statusCode).toBe(200);
			expect(response.body).toEqual(SUCCESS_RESPONSE_BODY);
		}
	});

	test('PATCH /me/password should fail with invalid inputs', async () => {
		const member = await Db.collections.User!.findOneOrFail();
		const memberAgent = await utils.createAuthAgent(app, member);

		const invalidPayloads = [
			...Array.from({ length: 3 }, () => ({ password: utils.randomInvalidPassword() })),
			{},
			undefined,
			'',
		];

		for (const invalidPayload of invalidPayloads) {
			const response = await memberAgent.patch('/me/password').send(invalidPayload);
			expect(response.statusCode).toBe(400);
		}
	});

	test('POST /me/survey should succeed with valid inputs', async () => {
		const member = await Db.collections.User!.findOneOrFail();
		const memberAgent = await utils.createAuthAgent(app, member);

		const validPayloads = [SURVEY, {}];

		for (const validPayload of validPayloads) {
			const response = await memberAgent.post('/me/survey').send(validPayload);
			expect(response.statusCode).toBe(200);
			expect(response.body).toEqual(SUCCESS_RESPONSE_BODY);
		}
	});
});

describe('Owner requests', () => {
	let app: express.Application;

	beforeAll(async () => {
		app = utils.initTestServer({ me: true }, { applyAuth: true });
		await utils.initTestDb();
		await utils.truncateUserTable();
	});

	beforeEach(async () => {
		const role = await Db.collections.Role!.findOneOrFail({ name: 'owner', scope: 'global' });

		const newOwner = new User();

		Object.assign(newOwner, {
			id: uuid(),
			email: TEST_USER.email,
			firstName: TEST_USER.firstName,
			lastName: TEST_USER.lastName,
			password: hashSync(utils.randomValidPassword(), genSaltSync(10)),
			globalRole: role,
		});

		await Db.collections.User!.save(newOwner);

		config.set('userManagement.hasOwner', true);

		await Db.collections.Settings!.update(
			{ key: 'userManagement.hasOwner' },
			{ value: JSON.stringify(true) },
		);
	});

	afterEach(async () => {
		await utils.truncateUserTable();
	});

	afterAll(() => {
		return getConnection().close();
	});

	test('GET /me should return sanitized owner', async () => {
		const owner = await Db.collections.User!.findOneOrFail();
		const ownerAgent = await utils.createAuthAgent(app, owner);

		const response = await ownerAgent.get('/me');

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
		const ownerAgent = await utils.createAuthAgent(app, owner);

		for (const validPayload of VALID_PATCH_ME_PAYLOADS) {
			const response = await ownerAgent.patch('/me').send(validPayload);

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

const TEST_USER = {
	email: utils.randomEmail(),
	firstName: utils.randomName(),
	lastName: utils.randomName(),
};

const SURVEY = [
	'codingSkill',
	'companyIndustry',
	'companySize',
	'otherCompanyIndustry',
	'otherWorkArea',
	'workArea',
].reduce<Record<string, string>>((acc, cur) => {
	return (acc[cur] = utils.randomString(1, 10)), acc;
}, {});

const VALID_PATCH_ME_PAYLOADS = [
	{
		email: utils.randomEmail(),
		firstName: utils.randomName(),
		lastName: utils.randomName(),
		password: utils.randomValidPassword(),
	},
	{
		email: utils.randomEmail(),
		firstName: utils.randomName(),
		lastName: utils.randomName(),
		password: utils.randomValidPassword(),
	},
];

const INVALID_PATCH_ME_PAYLOADS = [
	{
		email: 'invalid',
		firstName: utils.randomName(),
		lastName: utils.randomName(),
	},
	{
		email: utils.randomEmail(),
		firstName: '',
		lastName: utils.randomName(),
	},
	{
		email: utils.randomEmail(),
		firstName: utils.randomName(),
		lastName: '',
	},
	{
		email: utils.randomEmail(),
		firstName: 123,
		lastName: utils.randomName(),
	},
	{
		firstName: utils.randomName(),
		lastName: utils.randomName(),
	},
	{
		firstName: utils.randomName(),
	},
	{
		lastName: utils.randomName(),
	},
	{
		email: utils.randomEmail(),
		firstName: 'John <script',
		lastName: utils.randomName(),
	},
	{
		email: utils.randomEmail(),
		firstName: 'John <a',
		lastName: utils.randomName(),
	},
];

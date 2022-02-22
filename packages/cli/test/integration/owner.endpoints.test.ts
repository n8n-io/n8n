import express = require('express');
import { getConnection } from 'typeorm';
import validator from 'validator';

import * as utils from './shared/utils';
import { Db } from '../../src';
import config = require('../../config');
import {
	randomEmail,
	randomName,
	randomValidPassword,
	randomInvalidPassword,
} from './shared/random';

describe('/owner endpoints', () => {
	describe('Shell requests', () => {
		let app: express.Application;

		beforeAll(async () => {
			app = utils.initTestServer({ namespaces: ['owner'], applyAuth: true });
			await utils.initTestDb();

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

		test('POST /owner should create owner and enable hasOwner setting', async () => {
			const owner = await Db.collections.User!.findOneOrFail();
			const authOwnerAgent = await utils.createAgent(app, { auth: true, user: owner });

			const response = await authOwnerAgent.post('/owner').send(TEST_USER);

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

			const storedOwner = await Db.collections.User!.findOneOrFail(id);
			expect(storedOwner.password).not.toBe(TEST_USER.password);
			expect(storedOwner.email).toBe(TEST_USER.email);
			expect(storedOwner.firstName).toBe(TEST_USER.firstName);
			expect(storedOwner.lastName).toBe(TEST_USER.lastName);

			const hasOwnerConfig = config.get('userManagement.hasOwner');
			expect(hasOwnerConfig).toBe(true);

			const hasOwnerSetting = await utils.getHasOwnerSetting();
			expect(hasOwnerSetting).toBe(true);
		});

		test('POST /owner should fail with invalid inputs', async () => {
			const owner = await Db.collections.User!.findOneOrFail();
			const authOwnerAgent = await utils.createAgent(app, { auth: true, user: owner });

			for (const invalidPayload of INVALID_POST_OWNER_PAYLOADS) {
				const response = await authOwnerAgent.post('/owner').send(invalidPayload);
				expect(response.statusCode).toBe(400);
			}
		});
	});
});

const TEST_USER = {
	email: randomEmail(),
	firstName: randomName(),
	lastName: randomName(),
	password: randomValidPassword(),
};

const INVALID_POST_OWNER_PAYLOADS = [
	{
		email: '',
		firstName: randomName(),
		lastName: randomName(),
		password: randomValidPassword(),
	},
	{
		email: randomEmail(),
		firstName: '',
		lastName: randomName(),
		password: randomValidPassword(),
	},
	{
		email: randomEmail(),
		firstName: randomName(),
		lastName: '',
		password: randomValidPassword(),
	},
	{
		email: randomEmail(),
		firstName: randomName(),
		lastName: randomName(),
		password: randomInvalidPassword(),
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

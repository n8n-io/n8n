import express = require('express');
import { getConnection } from 'typeorm';
import validator from 'validator';
import { v4 as uuid } from 'uuid';

import * as utils from './shared/utils';
import { Db } from '../../src';
import config = require('../../config');

describe('/owner endpoints', () => {
	describe('Shell requests', () => {
		let app: express.Application;

		beforeAll(async () => {
			app = utils.initTestServer({ owner: true }, { applyAuth: true });
			await utils.initTestDb();
			await utils.truncateUserTable();
			utils.initLogger();
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

		test('POST /owner should create owner and enable hasOwner setting', async () => {
			const shell = await Db.collections.User!.findOneOrFail();
			const shellAgent = await utils.createAuthAgent(app, shell);

			const response = await shellAgent.post('/owner').send(TEST_USER);

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

			const owner = await Db.collections.User!.findOneOrFail(id);
			expect(owner.password).not.toBe(TEST_USER.password);

			const hasOwnerConfig = config.get('userManagement.hasOwner');
			expect(hasOwnerConfig).toBe(true);

			const hasOwnerSetting = await utils.getHasOwnerSetting();
			expect(hasOwnerSetting).toBe(true);
		});

		test('POST /owner should fail with invalid inputs', async () => {
			const shell = await Db.collections.User!.findOneOrFail();
			const shellAgent = await utils.createAuthAgent(app, shell);

			for (const invalidPayload of INVALID_POST_OWNER_PAYLOADS) {
				const response = await shellAgent.post('/owner').send(invalidPayload);
				expect(response.statusCode).toBe(400);
			}
		});
	});
});

const TEST_USER = {
	email: utils.randomEmail(),
	firstName: utils.randomName(),
	lastName: utils.randomName(),
	password: utils.randomValidPassword(),
};

const INVALID_POST_OWNER_PAYLOADS = [
	{
		email: '',
		firstName: utils.randomName(),
		lastName: utils.randomName(),
		password: utils.randomValidPassword(),
	},
	{
		email: utils.randomEmail(),
		firstName: '',
		lastName: utils.randomName(),
		password: utils.randomValidPassword(),
	},
	{
		email: utils.randomEmail(),
		firstName: utils.randomName(),
		lastName: '',
		password: utils.randomValidPassword(),
	},
	{
		email: utils.randomEmail(),
		firstName: utils.randomName(),
		lastName: utils.randomName(),
		password: utils.randomInvalidPassword(),
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

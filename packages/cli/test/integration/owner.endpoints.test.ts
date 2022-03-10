import express = require('express');
import validator from 'validator';

import * as utils from './shared/utils';
import * as testDb from './shared/testDb';
import { Db } from '../../src';
import config = require('../../config');
import {
	randomEmail,
	randomName,
	randomValidPassword,
	randomInvalidPassword,
} from './shared/random';

let app: express.Application;
let testDbName = '';

beforeAll(async () => {
	app = utils.initTestServer({ endpointGroups: ['owner'], applyAuth: true });
	const initResult = await testDb.init();
	testDbName = initResult.testDbName;

	utils.initTestLogger();
	utils.initTestTelemetry();
});

beforeEach(async () => {
	await testDb.createOwnerShell();
});

afterEach(async () => {
	await testDb.truncate(['User'], testDbName);
});

afterAll(async () => {
	await testDb.terminate(testDbName);
});

test('POST /owner should create owner and enable isInstanceOwnerSetUp', async () => {
	const owner = await Db.collections.User!.findOneOrFail();
	const authOwnerAgent = utils.createAgent(app, { auth: true, user: owner });

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
		isPending,
	} = response.body.data;

	expect(validator.isUUID(id)).toBe(true);
	expect(email).toBe(TEST_USER.email);
	expect(firstName).toBe(TEST_USER.firstName);
	expect(lastName).toBe(TEST_USER.lastName);
	expect(personalizationAnswers).toBeNull();
	expect(password).toBeUndefined();
	expect(isPending).toBe(false);
	expect(resetPasswordToken).toBeUndefined();
	expect(globalRole.name).toBe('owner');
	expect(globalRole.scope).toBe('global');

	const storedOwner = await Db.collections.User!.findOneOrFail(id);
	expect(storedOwner.password).not.toBe(TEST_USER.password);
	expect(storedOwner.email).toBe(TEST_USER.email);
	expect(storedOwner.firstName).toBe(TEST_USER.firstName);
	expect(storedOwner.lastName).toBe(TEST_USER.lastName);

	const isInstanceOwnerSetUpConfig = config.get('userManagement.isInstanceOwnerSetUp');
	expect(isInstanceOwnerSetUpConfig).toBe(true);

	const isInstanceOwnerSetUpSetting = await utils.isInstanceOwnerSetUp();
	expect(isInstanceOwnerSetUpSetting).toBe(true);
});

test('POST /owner should fail with invalid inputs', async () => {
	const owner = await Db.collections.User!.findOneOrFail();
	const authOwnerAgent = await utils.createAgent(app, { auth: true, user: owner });

	for (const invalidPayload of INVALID_POST_OWNER_PAYLOADS) {
		const response = await authOwnerAgent.post('/owner').send(invalidPayload);
		expect(response.statusCode).toBe(400);
	}
});

test('POST /owner/skip-setup should persist skipping setup to the DB', async () => {
	const owner = await Db.collections.User!.findOneOrFail();
	const authOwnerAgent = await utils.createAgent(app, { auth: true, user: owner });

	const response = await authOwnerAgent.post('/owner/skip-setup').send();

	expect(response.statusCode).toBe(200);

	const skipConfig = config.get('userManagement.skipInstanceOwnerSetup');
	expect(skipConfig).toBe(true);

	const { value } = await Db.collections.Settings!.findOneOrFail({
		key: 'userManagement.skipInstanceOwnerSetup',
	});
	expect(value).toBe('true');
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

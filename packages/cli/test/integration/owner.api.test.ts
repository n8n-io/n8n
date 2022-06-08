import express from 'express';
import validator from 'validator';

import * as utils from './shared/utils';
import * as testDb from './shared/testDb';
import { Db } from '../../src';
import config from '../../config';
import {
	randomEmail,
	randomName,
	randomValidPassword,
	randomInvalidPassword,
} from './shared/random';
import type { Role } from '../../src/databases/entities/Role';

jest.mock('../../src/telemetry');

let app: express.Application;
let testDbName = '';
let globalOwnerRole: Role;

beforeAll(async () => {
	app = await utils.initTestServer({ endpointGroups: ['owner'], applyAuth: true });
	const initResult = await testDb.init();
	testDbName = initResult.testDbName;

	globalOwnerRole = await testDb.getGlobalOwnerRole();
	utils.initTestLogger();
	utils.initTestTelemetry();
});

beforeEach(async () => {
	config.set('userManagement.isInstanceOwnerSetUp', false);
});

afterEach(async () => {
	await testDb.truncate(['User'], testDbName);
});

afterAll(async () => {
	await testDb.terminate(testDbName);
});

test('POST /owner should create owner and enable isInstanceOwnerSetUp', async () => {
	const ownerShell = await testDb.createUserShell(globalOwnerRole);
	const authOwnerAgent = utils.createAgent(app, { auth: true, user: ownerShell });

	const newOwnerData = {
		email: randomEmail(),
		firstName: randomName(),
		lastName: randomName(),
		password: randomValidPassword(),
	};

	const response = await authOwnerAgent.post('/owner').send(newOwnerData);

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
	expect(email).toBe(newOwnerData.email);
	expect(firstName).toBe(newOwnerData.firstName);
	expect(lastName).toBe(newOwnerData.lastName);
	expect(personalizationAnswers).toBeNull();
	expect(password).toBeUndefined();
	expect(isPending).toBe(false);
	expect(resetPasswordToken).toBeUndefined();
	expect(globalRole.name).toBe('owner');
	expect(globalRole.scope).toBe('global');
	expect(apiKey).toBeUndefined();

	const storedOwner = await Db.collections.User.findOneOrFail(id);
	expect(storedOwner.password).not.toBe(newOwnerData.password);
	expect(storedOwner.email).toBe(newOwnerData.email);
	expect(storedOwner.firstName).toBe(newOwnerData.firstName);
	expect(storedOwner.lastName).toBe(newOwnerData.lastName);

	const isInstanceOwnerSetUpConfig = config.getEnv('userManagement.isInstanceOwnerSetUp');
	expect(isInstanceOwnerSetUpConfig).toBe(true);

	const isInstanceOwnerSetUpSetting = await utils.isInstanceOwnerSetUp();
	expect(isInstanceOwnerSetUpSetting).toBe(true);
});

test('POST /owner should create owner with lowercased email', async () => {
	const ownerShell = await testDb.createUserShell(globalOwnerRole);
	const authOwnerAgent = utils.createAgent(app, { auth: true, user: ownerShell });

	const newOwnerData = {
		email: randomEmail().toUpperCase(),
		firstName: randomName(),
		lastName: randomName(),
		password: randomValidPassword(),
	};

	const response = await authOwnerAgent.post('/owner').send(newOwnerData);

	expect(response.statusCode).toBe(200);

	const { id, email } = response.body.data;

	expect(id).toBe(ownerShell.id);
	expect(email).toBe(newOwnerData.email.toLowerCase());

	const storedOwner = await Db.collections.User.findOneOrFail(id);
	expect(storedOwner.email).toBe(newOwnerData.email.toLowerCase());
});

test('POST /owner should fail with invalid inputs', async () => {
	const ownerShell = await testDb.createUserShell(globalOwnerRole);
	const authOwnerAgent = utils.createAgent(app, { auth: true, user: ownerShell });

	await Promise.all(
		INVALID_POST_OWNER_PAYLOADS.map(async (invalidPayload) => {
			const response = await authOwnerAgent.post('/owner').send(invalidPayload);
			expect(response.statusCode).toBe(400);
		}),
	);
});

test('POST /owner/skip-setup should persist skipping setup to the DB', async () => {
	const ownerShell = await testDb.createUserShell(globalOwnerRole);
	const authOwnerAgent = utils.createAgent(app, { auth: true, user: ownerShell });

	const response = await authOwnerAgent.post('/owner/skip-setup').send();

	expect(response.statusCode).toBe(200);

	const skipConfig = config.getEnv('userManagement.skipInstanceOwnerSetup');
	expect(skipConfig).toBe(true);

	const { value } = await Db.collections.Settings.findOneOrFail({
		key: 'userManagement.skipInstanceOwnerSetup',
	});
	expect(value).toBe('true');
});

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

import express from 'express';
import validator from 'validator';

import config from '@/config';
import * as Db from '@/Db';
import type { Role } from '@db/entities/Role';
import {
	randomEmail,
	randomInvalidPassword,
	randomName,
	randomValidPassword,
} from './shared/random';
import * as testDb from './shared/testDb';
import type { AuthAgent } from './shared/types';
import * as utils from './shared/utils';

let app: express.Application;
let globalOwnerRole: Role;
let authAgent: AuthAgent;

beforeAll(async () => {
	app = await utils.initTestServer({ endpointGroups: ['owner'] });

	globalOwnerRole = await testDb.getGlobalOwnerRole();

	authAgent = utils.createAuthAgent(app);
});

beforeEach(async () => {
	config.set('userManagement.isInstanceOwnerSetUp', false);
});

afterEach(async () => {
	await testDb.truncate(['User']);
});

afterAll(async () => {
	await testDb.terminate();
});

test('POST /owner/setup should create owner and enable isInstanceOwnerSetUp', async () => {
	const ownerShell = await testDb.createUserShell(globalOwnerRole);

	const newOwnerData = {
		email: randomEmail(),
		firstName: randomName(),
		lastName: randomName(),
		password: randomValidPassword(),
	};

	const response = await authAgent(ownerShell).post('/owner/setup').send(newOwnerData);

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

	const storedOwner = await Db.collections.User.findOneByOrFail({ id });
	expect(storedOwner.password).not.toBe(newOwnerData.password);
	expect(storedOwner.email).toBe(newOwnerData.email);
	expect(storedOwner.firstName).toBe(newOwnerData.firstName);
	expect(storedOwner.lastName).toBe(newOwnerData.lastName);

	const isInstanceOwnerSetUpConfig = config.getEnv('userManagement.isInstanceOwnerSetUp');
	expect(isInstanceOwnerSetUpConfig).toBe(true);

	const isInstanceOwnerSetUpSetting = await utils.isInstanceOwnerSetUp();
	expect(isInstanceOwnerSetUpSetting).toBe(true);
});

test('POST /owner/setup should create owner with lowercased email', async () => {
	const ownerShell = await testDb.createUserShell(globalOwnerRole);

	const newOwnerData = {
		email: randomEmail().toUpperCase(),
		firstName: randomName(),
		lastName: randomName(),
		password: randomValidPassword(),
	};

	const response = await authAgent(ownerShell).post('/owner/setup').send(newOwnerData);

	expect(response.statusCode).toBe(200);

	const { id, email } = response.body.data;

	expect(id).toBe(ownerShell.id);
	expect(email).toBe(newOwnerData.email.toLowerCase());

	const storedOwner = await Db.collections.User.findOneByOrFail({ id });
	expect(storedOwner.email).toBe(newOwnerData.email.toLowerCase());
});

test('POST /owner/setup should fail with invalid inputs', async () => {
	const ownerShell = await testDb.createUserShell(globalOwnerRole);
	const authOwnerAgent = authAgent(ownerShell);

	await Promise.all(
		INVALID_POST_OWNER_PAYLOADS.map(async (invalidPayload) => {
			const response = await authOwnerAgent.post('/owner/setup').send(invalidPayload);
			expect(response.statusCode).toBe(400);
		}),
	);
});

test('POST /owner/skip-setup should persist skipping setup to the DB', async () => {
	const ownerShell = await testDb.createUserShell(globalOwnerRole);

	const response = await authAgent(ownerShell).post('/owner/skip-setup').send();

	expect(response.statusCode).toBe(200);

	const skipConfig = config.getEnv('userManagement.skipInstanceOwnerSetup');
	expect(skipConfig).toBe(true);

	const { value } = await Db.collections.Settings.findOneByOrFail({
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

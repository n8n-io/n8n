import validator from 'validator';
import type { SuperAgentTest } from 'supertest';

import config from '@/config';
import * as Db from '@/Db';
import type { Role } from '@db/entities/Role';
import type { User } from '@db/entities/User';
import {
	randomEmail,
	randomInvalidPassword,
	randomName,
	randomValidPassword,
} from './shared/random';
import * as testDb from './shared/testDb';
import * as utils from './shared/utils/';

const testServer = utils.setupTestServer({ endpointGroups: ['owner'] });

let globalOwnerRole: Role;
let ownerShell: User;
let authOwnerShellAgent: SuperAgentTest;

beforeAll(async () => {
	globalOwnerRole = await testDb.getGlobalOwnerRole();
});

beforeEach(async () => {
	ownerShell = await testDb.createUserShell(globalOwnerRole);
	authOwnerShellAgent = testServer.authAgentFor(ownerShell);
	config.set('userManagement.isInstanceOwnerSetUp', false);
});

afterEach(async () => {
	await testDb.truncate(['User']);
});

describe('POST /owner/setup', () => {
	test('should create owner and enable isInstanceOwnerSetUp', async () => {
		const newOwnerData = {
			email: randomEmail(),
			firstName: randomName(),
			lastName: randomName(),
			password: randomValidPassword(),
		};

		const response = await authOwnerShellAgent.post('/owner/setup').send(newOwnerData);

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

	test('should create owner with lowercased email', async () => {
		const newOwnerData = {
			email: randomEmail().toUpperCase(),
			firstName: randomName(),
			lastName: randomName(),
			password: randomValidPassword(),
		};

		const response = await authOwnerShellAgent.post('/owner/setup').send(newOwnerData);

		expect(response.statusCode).toBe(200);

		const { id, email } = response.body.data;

		expect(id).toBe(ownerShell.id);
		expect(email).toBe(newOwnerData.email.toLowerCase());

		const storedOwner = await Db.collections.User.findOneByOrFail({ id });
		expect(storedOwner.email).toBe(newOwnerData.email.toLowerCase());
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

	test('should fail with invalid inputs', async () => {
		for (const invalidPayload of INVALID_POST_OWNER_PAYLOADS) {
			const response = await authOwnerShellAgent.post('/owner/setup').send(invalidPayload);
			expect(response.statusCode).toBe(400);
		}
	});
});

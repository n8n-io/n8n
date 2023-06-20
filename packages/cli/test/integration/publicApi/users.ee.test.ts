import type express from 'express';
import validator from 'validator';
import { v4 as uuid } from 'uuid';

import config from '@/config';
import type { Role } from '@/databases/entities/Role';
import { randomApiKey } from '../shared/random';

import * as utils from '../shared/utils';
import * as testDb from '../shared/testDb';

import { License } from '@/License';

let app: express.Application;
let globalOwnerRole: Role;
let globalMemberRole: Role;

const licenseLike = {
	getUsersLimit: jest.fn().mockReturnValue(-1),
};

utils.mockInstance(License, licenseLike);

beforeAll(async () => {
	app = await utils.initTestServer({
		endpointGroups: ['publicApi'],
		applyAuth: false,
		enablePublicAPI: true,
	});

	await testDb.init();

	const [fetchedGlobalOwnerRole, fetchedGlobalMemberRole] = await testDb.getAllRoles();

	globalOwnerRole = fetchedGlobalOwnerRole;
	globalMemberRole = fetchedGlobalMemberRole;
});

beforeEach(async () => {
	// do not combine calls - shared tables must be cleared first and separately
	await testDb.truncate(['SharedCredentials', 'SharedWorkflow']);
	await testDb.truncate(['User', 'Workflow', 'Credentials']);

	config.set('userManagement.disabled', false);
	config.set('userManagement.isInstanceOwnerSetUp', true);
	config.set('userManagement.emails.mode', 'smtp');
});

afterAll(async () => {
	await testDb.terminate();
});

describe('With license unlimited quota:users', () => {
	test('GET /users should fail due to missing API Key', async () => {
		const owner = await testDb.createUser({ globalRole: globalOwnerRole });

		const authOwnerAgent = utils.createAgent(app, {
			apiPath: 'public',
			version: 1,
			auth: true,
			user: owner,
		});

		await testDb.createUser();

		const response = await authOwnerAgent.get('/users');

		expect(response.statusCode).toBe(401);
	});

	test('GET /users should fail due to invalid API Key', async () => {
		const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

		owner.apiKey = null;

		const authOwnerAgent = utils.createAgent(app, {
			apiPath: 'public',
			version: 1,
			auth: true,
			user: owner,
		});

		const response = await authOwnerAgent.get('/users');

		expect(response.statusCode).toBe(401);
	});

	test('GET /users should fail due to member trying to access owner only endpoint', async () => {
		const member = await testDb.createUser({ apiKey: randomApiKey() });

		const authOwnerAgent = utils.createAgent(app, {
			apiPath: 'public',
			version: 1,
			auth: true,
			user: member,
		});

		const response = await authOwnerAgent.get('/users');

		expect(response.statusCode).toBe(403);
	});

	test('GET /users should return all users', async () => {
		const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

		const authOwnerAgent = utils.createAgent(app, {
			apiPath: 'public',
			version: 1,
			auth: true,
			user: owner,
		});

		await testDb.createUser();

		const response = await authOwnerAgent.get('/users');

		expect(response.statusCode).toBe(200);
		expect(response.body.data.length).toBe(2);
		expect(response.body.nextCursor).toBeNull();

		for (const user of response.body.data) {
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
				createdAt,
				updatedAt,
			} = user;

			expect(validator.isUUID(id)).toBe(true);
			expect(email).toBeDefined();
			expect(firstName).toBeDefined();
			expect(lastName).toBeDefined();
			expect(personalizationAnswers).toBeUndefined();
			expect(password).toBeUndefined();
			expect(resetPasswordToken).toBeUndefined();
			expect(isPending).toBe(false);
			expect(globalRole).toBeUndefined();
			expect(createdAt).toBeDefined();
			expect(updatedAt).toBeDefined();
		}
	});

	test('GET /users/:identifier should fail due to missing API Key', async () => {
		const owner = await testDb.createUser({ globalRole: globalOwnerRole });

		const authOwnerAgent = utils.createAgent(app, {
			apiPath: 'public',
			version: 1,
			auth: true,
			user: owner,
		});

		await testDb.createUser();

		const response = await authOwnerAgent.get(`/users/${owner.id}`);

		expect(response.statusCode).toBe(401);
	});

	test('GET /users/:identifier should fail due to invalid API Key', async () => {
		const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

		owner.apiKey = null;

		const authOwnerAgent = utils.createAgent(app, {
			apiPath: 'public',
			version: 1,
			auth: true,
			user: owner,
		});

		const response = await authOwnerAgent.get(`/users/${owner.id}`);

		expect(response.statusCode).toBe(401);
	});

	test('GET /users/:identifier should fail due to member trying to access owner only endpoint', async () => {
		const member = await testDb.createUser({ apiKey: randomApiKey() });

		const authOwnerAgent = utils.createAgent(app, {
			apiPath: 'public',
			version: 1,
			auth: true,
			user: member,
		});

		const response = await authOwnerAgent.get(`/users/${member.id}`);

		expect(response.statusCode).toBe(403);
	});

	test('GET /users/:email with non-existing email should return 404', async () => {
		const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

		const authOwnerAgent = utils.createAgent(app, {
			apiPath: 'public',
			version: 1,
			auth: true,
			user: owner,
		});

		const response = await authOwnerAgent.get('/users/jhondoe@gmail.com');

		expect(response.statusCode).toBe(404);
	});

	test('GET /users/:id with non-existing id should return 404', async () => {
		const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

		const authOwnerAgent = utils.createAgent(app, {
			apiPath: 'public',
			version: 1,
			auth: true,
			user: owner,
		});

		const response = await authOwnerAgent.get(`/users/${uuid()}`);

		expect(response.statusCode).toBe(404);
	});

	test('GET /users/:email should return a user', async () => {
		const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

		const authOwnerAgent = utils.createAgent(app, {
			apiPath: 'public',
			version: 1,
			auth: true,
			user: owner,
		});

		const response = await authOwnerAgent.get(`/users/${owner.email}`);

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
			createdAt,
			updatedAt,
		} = response.body;

		expect(validator.isUUID(id)).toBe(true);
		expect(email).toBeDefined();
		expect(firstName).toBeDefined();
		expect(lastName).toBeDefined();
		expect(personalizationAnswers).toBeUndefined();
		expect(password).toBeUndefined();
		expect(resetPasswordToken).toBeUndefined();
		expect(isPending).toBe(false);
		expect(globalRole).toBeUndefined();
		expect(createdAt).toBeDefined();
		expect(updatedAt).toBeDefined();
	});

	test('GET /users/:id should return a pending user', async () => {
		const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

		const { id: memberId } = await testDb.createUserShell(globalMemberRole);

		const authOwnerAgent = utils.createAgent(app, {
			apiPath: 'public',
			version: 1,
			auth: true,
			user: owner,
		});

		const response = await authOwnerAgent.get(`/users/${memberId}`);

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
			createdAt,
			updatedAt,
		} = response.body;

		expect(validator.isUUID(id)).toBe(true);
		expect(email).toBeDefined();
		expect(firstName).toBeDefined();
		expect(lastName).toBeDefined();
		expect(personalizationAnswers).toBeUndefined();
		expect(password).toBeUndefined();
		expect(resetPasswordToken).toBeUndefined();
		expect(globalRole).toBeUndefined();
		expect(createdAt).toBeDefined();
		expect(isPending).toBeDefined();
		expect(isPending).toBeTruthy();
		expect(updatedAt).toBeDefined();
	});
});

describe('With license without quota:users', () => {
	beforeEach(async () => {
		utils.mockInstance(License, { getUsersLimit: jest.fn().mockReturnValue(null) });
	});

	test('GET /users should fail due to invalid license', async () => {
		const member = await testDb.createUser({ apiKey: randomApiKey() });
		const authOwnerAgent = utils.createAgent(app, {
			apiPath: 'public',
			version: 1,
			auth: true,
			user: member,
		});
		const response = await authOwnerAgent.get('/users');
		expect(response.statusCode).toBe(403);
	});

	test('GET /users/:id should fail due to invalid license', async () => {
		const member = await testDb.createUser({ apiKey: randomApiKey() });
		const authOwnerAgent = utils.createAgent(app, {
			apiPath: 'public',
			version: 1,
			auth: true,
			user: member,
		});
		const response = await authOwnerAgent.get(`/users/${member.id}`);
		expect(response.statusCode).toBe(403);
	});
});

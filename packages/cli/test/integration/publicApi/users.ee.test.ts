import type { SuperAgentTest } from 'supertest';
import validator from 'validator';
import { v4 as uuid } from 'uuid';

import type { Role } from '@db/entities/Role';
import { License } from '@/License';

import { mockInstance } from '../../shared/mocking';
import { randomApiKey } from '../shared/random';
import * as utils from '../shared/utils/';
import * as testDb from '../shared/testDb';
import { getGlobalMemberRole, getGlobalOwnerRole } from '../shared/db/roles';
import { createUser, createUserShell } from '../shared/db/users';

mockInstance(License, {
	getUsersLimit: jest.fn().mockReturnValue(-1),
});

const testServer = utils.setupTestServer({ endpointGroups: ['publicApi'] });

let globalOwnerRole: Role;
let globalMemberRole: Role;

beforeAll(async () => {
	[globalOwnerRole, globalMemberRole] = await Promise.all([
		getGlobalOwnerRole(),
		getGlobalMemberRole(),
	]);
});

beforeEach(async () => {
	await testDb.truncate(['SharedCredentials', 'SharedWorkflow', 'Workflow', 'Credentials', 'User']);
});

describe('With license unlimited quota:users', () => {
	describe('GET /users', () => {
		test('should fail due to missing API Key', async () => {
			const owner = await createUser({ globalRole: globalOwnerRole });
			const authOwnerAgent = testServer.publicApiAgentFor(owner);
			await authOwnerAgent.get('/users').expect(401);
		});

		test('should fail due to invalid API Key', async () => {
			const owner = await createUser({
				globalRole: globalOwnerRole,
				apiKey: randomApiKey(),
			});
			owner.apiKey = 'invalid-key';
			const authOwnerAgent = testServer.publicApiAgentFor(owner);
			await authOwnerAgent.get('/users').expect(401);
		});

		test('should fail due to member trying to access owner only endpoint', async () => {
			const member = await createUser({ apiKey: randomApiKey() });
			const authMemberAgent = testServer.publicApiAgentFor(member);
			await authMemberAgent.get('/users').expect(403);
		});

		test('should return all users', async () => {
			const owner = await createUser({
				globalRole: globalOwnerRole,
				apiKey: randomApiKey(),
			});

			const authOwnerAgent = testServer.publicApiAgentFor(owner);

			await createUser();

			const response = await authOwnerAgent.get('/users').expect(200);
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
				expect(isPending).toBe(false);
				expect(globalRole).toBeUndefined();
				expect(createdAt).toBeDefined();
				expect(updatedAt).toBeDefined();
			}
		});
	});

	describe('GET /users/:id', () => {
		test('should fail due to missing API Key', async () => {
			const owner = await createUser({ globalRole: globalOwnerRole });
			const authOwnerAgent = testServer.publicApiAgentFor(owner);
			await authOwnerAgent.get(`/users/${owner.id}`).expect(401);
		});

		test('should fail due to invalid API Key', async () => {
			const owner = await createUser({
				globalRole: globalOwnerRole,
				apiKey: randomApiKey(),
			});
			owner.apiKey = 'invalid-key';
			const authOwnerAgent = testServer.publicApiAgentFor(owner);
			await authOwnerAgent.get(`/users/${owner.id}`).expect(401);
		});

		test('should fail due to member trying to access owner only endpoint', async () => {
			const member = await createUser({ apiKey: randomApiKey() });
			const authMemberAgent = testServer.publicApiAgentFor(member);
			await authMemberAgent.get(`/users/${member.id}`).expect(403);
		});
		test('should return 404 for non-existing id ', async () => {
			const owner = await createUser({
				globalRole: globalOwnerRole,
				apiKey: randomApiKey(),
			});
			const authOwnerAgent = testServer.publicApiAgentFor(owner);
			await authOwnerAgent.get(`/users/${uuid()}`).expect(404);
		});

		test('should return a pending user', async () => {
			const owner = await createUser({
				globalRole: globalOwnerRole,
				apiKey: randomApiKey(),
			});

			const { id: memberId } = await createUserShell(globalMemberRole);

			const authOwnerAgent = testServer.publicApiAgentFor(owner);
			const response = await authOwnerAgent.get(`/users/${memberId}`).expect(200);

			const {
				id,
				email,
				firstName,
				lastName,
				personalizationAnswers,
				globalRole,
				password,
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
			expect(globalRole).toBeUndefined();
			expect(createdAt).toBeDefined();
			expect(isPending).toBeDefined();
			expect(isPending).toBeTruthy();
			expect(updatedAt).toBeDefined();
		});
	});

	describe('GET /users/:email', () => {
		test('with non-existing email should return 404', async () => {
			const owner = await createUser({
				globalRole: globalOwnerRole,
				apiKey: randomApiKey(),
			});
			const authOwnerAgent = testServer.publicApiAgentFor(owner);
			await authOwnerAgent.get('/users/jhondoe@gmail.com').expect(404);
		});

		test('should return a user', async () => {
			const owner = await createUser({
				globalRole: globalOwnerRole,
				apiKey: randomApiKey(),
			});

			const authOwnerAgent = testServer.publicApiAgentFor(owner);
			const response = await authOwnerAgent.get(`/users/${owner.email}`).expect(200);

			const {
				id,
				email,
				firstName,
				lastName,
				personalizationAnswers,
				globalRole,
				password,
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
			expect(isPending).toBe(false);
			expect(globalRole).toBeUndefined();
			expect(createdAt).toBeDefined();
			expect(updatedAt).toBeDefined();
		});
	});
});

describe('With license without quota:users', () => {
	let authOwnerAgent: SuperAgentTest;

	beforeEach(async () => {
		mockInstance(License, { getUsersLimit: jest.fn().mockReturnValue(null) });

		const owner = await createUser({
			globalRole: globalOwnerRole,
			apiKey: randomApiKey(),
		});
		authOwnerAgent = testServer.publicApiAgentFor(owner);
	});

	test('GET /users should fail due to invalid license', async () => {
		await authOwnerAgent.get('/users').expect(403);
	});

	test('GET /users/:id should fail due to invalid license', async () => {
		await authOwnerAgent.get(`/users/${uuid()}`).expect(403);
	});
});

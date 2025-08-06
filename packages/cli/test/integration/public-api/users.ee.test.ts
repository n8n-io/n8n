import {
	createTeamProject,
	linkUserToProject,
	testDb,
	mockInstance,
} from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { v4 as uuid } from 'uuid';
import validator from 'validator';

import { License } from '@/license';

import {
	createMember,
	createMemberWithApiKey,
	createOwnerWithApiKey,
	createUser,
	createUserShell,
} from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';

mockInstance(License, {
	getUsersLimit: jest.fn().mockReturnValue(-1),
});

const testServer = utils.setupTestServer({ endpointGroups: ['publicApi'] });

beforeEach(async () => {
	await testDb.truncate([
		'SharedCredentials',
		'SharedWorkflow',
		'WorkflowEntity',
		'CredentialsEntity',
		'User',
	]);
});

describe('With license unlimited quota:users', () => {
	describe('GET /users', () => {
		test('should fail due to missing API Key', async () => {
			const authOwnerAgent = testServer.publicApiAgentWithoutApiKey();
			await authOwnerAgent.get('/users').expect(401);
		});

		test('should fail due to invalid API Key', async () => {
			const authOwnerAgent = testServer.publicApiAgentWithApiKey('invalid-key');
			await authOwnerAgent.get('/users').expect(401);
		});

		test('should return all users', async () => {
			const owner = await createOwnerWithApiKey();

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
					role,
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
				expect(role).toBeUndefined();
				expect(createdAt).toBeDefined();
				expect(updatedAt).toBeDefined();
			}
		});

		it('should return users filtered by project ID', async () => {
			/**
			 * Arrange
			 */
			const [owner, firstMember, secondMember, thirdMember] = await Promise.all([
				createOwnerWithApiKey(),
				createMember(),
				createMember(),
				createMember(),
			]);

			const [firstProject, secondProject] = await Promise.all([
				createTeamProject(),
				createTeamProject(),
			]);

			await Promise.all([
				linkUserToProject(firstMember, firstProject, 'project:admin'),
				linkUserToProject(secondMember, firstProject, 'project:viewer'),
				linkUserToProject(thirdMember, secondProject, 'project:admin'),
			]);

			/**
			 * Act
			 */
			const response = await testServer.publicApiAgentFor(owner).get('/users').query({
				projectId: firstProject.id,
			});

			/**
			 * Assert
			 */
			expect(response.status).toBe(200);
			expect(response.body.data.length).toBe(2);
			expect(response.body.nextCursor).toBeNull();
			expect(response.body.data.map((user: User) => user.id)).toEqual(
				expect.arrayContaining([firstMember.id, secondMember.id]),
			);
		});
	});

	describe('GET /users/:id', () => {
		test('should fail due to missing API Key', async () => {
			const owner = await createOwnerWithApiKey();
			const authOwnerAgent = testServer.publicApiAgentWithoutApiKey();
			await authOwnerAgent.get(`/users/${owner.id}`).expect(401);
		});

		test('should fail due to invalid API Key', async () => {
			const owner = await createOwnerWithApiKey();
			const authOwnerAgent = testServer.publicApiAgentWithApiKey('invalid-key');
			await authOwnerAgent.get(`/users/${owner.id}`).expect(401);
		});

		test('should fail due to member trying to access owner only endpoint', async () => {
			const member = await createMemberWithApiKey();

			const authMemberAgent = testServer.publicApiAgentFor(member);
			await authMemberAgent.get(`/users/${member.id}`).expect(403);
		});
		test('should return 404 for non-existing id ', async () => {
			const owner = await createOwnerWithApiKey();
			const authOwnerAgent = testServer.publicApiAgentFor(owner);
			await authOwnerAgent.get(`/users/${uuid()}`).expect(404);
		});

		test('should return a pending user', async () => {
			const owner = await createOwnerWithApiKey();

			const { id: memberId } = await createUserShell('global:member');

			const authOwnerAgent = testServer.publicApiAgentFor(owner);
			const response = await authOwnerAgent.get(`/users/${memberId}`).expect(200);

			const {
				id,
				email,
				firstName,
				lastName,
				personalizationAnswers,
				role,
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
			expect(role).toBeUndefined();
			expect(createdAt).toBeDefined();
			expect(isPending).toBeDefined();
			expect(isPending).toBeTruthy();
			expect(updatedAt).toBeDefined();
		});
	});

	describe('GET /users/:email', () => {
		test('with non-existing email should return 404', async () => {
			const owner = await createOwnerWithApiKey();
			const authOwnerAgent = testServer.publicApiAgentFor(owner);
			await authOwnerAgent.get('/users/jhondoe@gmail.com').expect(404);
		});

		test('should return a user', async () => {
			const owner = await createOwnerWithApiKey();
			const authOwnerAgent = testServer.publicApiAgentFor(owner);
			const response = await authOwnerAgent.get(`/users/${owner.email}`).expect(200);

			const {
				id,
				email,
				firstName,
				lastName,
				personalizationAnswers,
				role,
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
			expect(role).toBeUndefined();
			expect(createdAt).toBeDefined();
			expect(updatedAt).toBeDefined();
		});
	});
});

describe('With license without quota:users', () => {
	let authOwnerAgent: SuperAgentTest;

	beforeEach(async () => {
		mockInstance(License, { getUsersLimit: jest.fn().mockReturnValue(null) });

		const owner = await createOwnerWithApiKey();
		authOwnerAgent = testServer.publicApiAgentFor(owner);
	});

	test('GET /users should fail due to invalid license', async () => {
		await authOwnerAgent.get('/users').expect(403);
	});

	test('GET /users/:id should fail due to invalid license', async () => {
		await authOwnerAgent.get(`/users/${uuid()}`).expect(403);
	});
});

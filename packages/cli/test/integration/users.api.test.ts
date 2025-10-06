import {
	createTeamProject,
	getPersonalProject,
	linkUserToProject,
	createWorkflow,
	getWorkflowById,
	shareWorkflowWithUsers,
	randomCredentialPayload,
	testDb,
	mockInstance,
} from '@n8n/backend-test-utils';
import type { PublicUser, User } from '@n8n/db';
import {
	FolderRepository,
	GLOBAL_ADMIN_ROLE,
	GLOBAL_MEMBER_ROLE,
	GLOBAL_OWNER_ROLE,
	ProjectRelationRepository,
	ProjectRepository,
	SharedCredentialsRepository,
	SharedWorkflowRepository,
	UserRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { v4 as uuid } from 'uuid';

import { RESPONSE_ERROR_MESSAGES } from '@/constants';
import { UsersController } from '@/controllers/users.controller';
import { ExecutionService } from '@/executions/execution.service';
import { CacheService } from '@/services/cache/cache.service';
import { Telemetry } from '@/telemetry';
import { createFolder } from '@test-integration/db/folders';

import { SUCCESS_RESPONSE_BODY } from './shared/constants';
import {
	getCredentialById,
	saveCredential,
	shareCredentialWithUsers,
} from './shared/db/credentials';
import { createAdmin, createMember, createOwner, createUser, getUserById } from './shared/db/users';
import type { SuperAgentTest } from './shared/types';
import * as utils from './shared/utils/';
import { validateUser } from './shared/utils/users';
import { createRole } from '@test-integration/db/roles';

mockInstance(Telemetry);
mockInstance(ExecutionService);

const testServer = utils.setupTestServer({
	endpointGroups: ['users'],
	enabledFeatures: ['feat:advancedPermissions'],
});

describe('GET /users', () => {
	let owner: User;
	let member1: User;
	let member2: User;
	let ownerAgent: SuperAgentTest;
	let memberAgent: SuperAgentTest;
	let userRepository: UserRepository;

	beforeAll(async () => {
		await testDb.truncate(['User']);

		userRepository = Container.get(UserRepository);

		owner = await createUser({
			role: GLOBAL_OWNER_ROLE,
			email: 'owner@n8n.io',
			firstName: 'OwnerFirstName',
			lastName: 'OwnerLastName',
		});
		member1 = await createUser({
			role: GLOBAL_MEMBER_ROLE,
			email: 'member1@n8n.io',
			firstName: 'Member1FirstName',
			lastName: 'Member1LastName',
			mfaEnabled: true,
		});
		member2 = await createUser({
			role: GLOBAL_MEMBER_ROLE,
			email: 'member2@n8n.io',
			firstName: 'Member2FirstName',
			lastName: 'Member2LastName',
		});
		await createUser({
			role: GLOBAL_ADMIN_ROLE,
			email: 'admin@n8n.io',
			firstName: 'AdminFirstName',
			lastName: 'AdminLastName',
			mfaEnabled: true,
		});

		for (let i = 0; i < 10; i++) {
			await createTeamProject(`project${i}`, member1);
		}

		ownerAgent = testServer.authAgentFor(owner);
		memberAgent = testServer.authAgentFor(member1);
	});

	test('should return all users', async () => {
		const response = await ownerAgent.get('/users').expect(200);

		expect(response.body.data).toHaveProperty('count', 4);
		expect(response.body.data).toHaveProperty('items');
		expect(response.body.data.items).toHaveLength(4);

		response.body.data.items.forEach(validateUser);
	});

	describe('list query options', () => {
		describe('filter', () => {
			test('should filter users by field: email', async () => {
				const response = await ownerAgent
					.get('/users')
					.query(`filter={ "email": "${member1.email}" }`)
					.expect(200);

				expect(response.body.data).toEqual({
					count: 1,
					items: expect.arrayContaining([]),
				});
				expect(response.body.data.items).toHaveLength(1);

				const [user] = response.body.data.items;

				expect(user.email).toBe(member1.email);

				const _response = await ownerAgent
					.get('/users')
					.query('filter={ "email": "non@existing.com" }')
					.expect(200);

				expect(_response.body.data).toEqual({
					count: 0,
					items: expect.arrayContaining([]),
				});
				expect(_response.body.data.items).toHaveLength(0);
			});

			test('should filter users by field: firstName', async () => {
				const response = await ownerAgent
					.get('/users')
					.query(`filter={ "firstName": "${member1.firstName}" }`)
					.expect(200);

				expect(response.body.data).toEqual({
					count: 1,
					items: expect.arrayContaining([]),
				});
				expect(response.body.data.items).toHaveLength(1);

				const [user] = response.body.data.items;

				expect(user.email).toBe(member1.email);

				const _response = await ownerAgent
					.get('/users')
					.query('filter={ "firstName": "Non-Existing" }')
					.expect(200);

				expect(_response.body.data).toEqual({
					count: 0,
					items: expect.arrayContaining([]),
				});
				expect(_response.body.data.items).toHaveLength(0);
			});

			test('should filter users by field: lastName', async () => {
				const response = await ownerAgent
					.get('/users')
					.query(`filter={ "lastName": "${member1.lastName}" }`)
					.expect(200);

				expect(response.body.data).toEqual({
					count: 1,
					items: expect.arrayContaining([]),
				});
				expect(response.body.data.items).toHaveLength(1);

				const [user] = response.body.data.items;

				expect(user.email).toBe(member1.email);

				const _response = await ownerAgent
					.get('/users')
					.query('filter={ "lastName": "Non-Existing" }')
					.expect(200);

				expect(_response.body.data).toEqual({
					count: 0,
					items: expect.arrayContaining([]),
				});
				expect(_response.body.data.items).toHaveLength(0);
			});

			test('should filter users by computed field: isOwner', async () => {
				const response = await ownerAgent
					.get('/users')
					.query('filter={ "isOwner": true }')
					.expect(200);

				expect(response.body.data).toEqual({
					count: 1,
					items: expect.arrayContaining([]),
				});
				expect(response.body.data.items).toHaveLength(1);

				const [user] = response.body.data.items;

				expect(user.isOwner).toBe(true);

				const _response = await ownerAgent
					.get('/users')
					.query('filter={ "isOwner": false }')
					.expect(200);

				expect(_response.body.data).toEqual({
					count: 3,
					items: expect.arrayContaining([]),
				});
				expect(_response.body.data.items).toHaveLength(3);

				const [_user] = _response.body.data.items;

				expect(_user.isOwner).toBe(false);
			});

			test('should filter users by mfaEnabled field', async () => {
				const response = await ownerAgent
					.get('/users')
					.query('filter={ "mfaEnabled": true }')
					.expect(200);

				expect(response.body.data).toEqual({
					count: 2,
					items: expect.arrayContaining([]),
				});
				expect(response.body.data.items).toHaveLength(2);

				const [user] = response.body.data.items;

				expect(user.mfaEnabled).toBe(true);

				const _response = await ownerAgent
					.get('/users')
					.query('filter={ "mfaEnabled": false }')
					.expect(200);

				expect(_response.body.data).toEqual({
					count: 2,
					items: expect.arrayContaining([]),
				});
				expect(_response.body.data.items).toHaveLength(2);

				const [_user] = _response.body.data.items;

				expect(_user.mfaEnabled).toBe(false);
			});

			test('should filter users by field: fullText', async () => {
				const response = await ownerAgent
					.get('/users')
					.query('filter={ "fullText": "member1" }')
					.expect(200);

				expect(response.body.data).toEqual({
					count: 1,
					items: expect.arrayContaining([]),
				});
				expect(response.body.data.items).toHaveLength(1);

				const [user] = response.body.data.items;

				expect(user.email).toBe(member1.email);

				const _response = await ownerAgent
					.get('/users')
					.query('filter={ "fullText": "Non-Existing" }')
					.expect(200);

				expect(_response.body.data).toEqual({
					count: 0,
					items: expect.arrayContaining([]),
				});
				expect(_response.body.data.items).toHaveLength(0);
			});
		});

		describe('select', () => {
			test('should select user field: id', async () => {
				const response = await ownerAgent.get('/users').query('select[]=id').expect(200);

				expect(response.body).toEqual({
					data: {
						count: 4,
						items: [
							{ id: expect.any(String) },
							{ id: expect.any(String) },
							{ id: expect.any(String) },
							{ id: expect.any(String) },
						],
					},
				});
			});

			test('should select user field: email', async () => {
				const response = await ownerAgent.get('/users').query('select[]=email').expect(200);

				expect(response.body).toEqual({
					data: {
						count: 4,
						items: [
							{
								id: expect.any(String),
								email: expect.any(String),
							},
							{
								id: expect.any(String),
								email: expect.any(String),
							},
							{
								id: expect.any(String),
								email: expect.any(String),
							},
							{
								id: expect.any(String),
								email: expect.any(String),
							},
						],
					},
				});
			});

			test('should select user field: firstName', async () => {
				const response = await ownerAgent.get('/users').query('select[]=firstName').expect(200);

				expect(response.body).toEqual({
					data: {
						count: 4,
						items: [
							{
								id: expect.any(String),
								firstName: expect.any(String),
							},
							{
								id: expect.any(String),
								firstName: expect.any(String),
							},
							{
								id: expect.any(String),
								firstName: expect.any(String),
							},
							{
								id: expect.any(String),
								firstName: expect.any(String),
							},
						],
					},
				});
			});

			test('should select user field: lastName', async () => {
				const response = await ownerAgent.get('/users').query('select[]=lastName').expect(200);

				expect(response.body).toEqual({
					data: {
						count: 4,
						items: [
							{
								id: expect.any(String),
								lastName: expect.any(String),
							},
							{
								id: expect.any(String),
								lastName: expect.any(String),
							},
							{
								id: expect.any(String),
								lastName: expect.any(String),
							},
							{
								id: expect.any(String),
								lastName: expect.any(String),
							},
						],
					},
				});
			});

			test('should select multiple user fields: email, firstName, lastName', async () => {
				const response = await ownerAgent
					.get('/users')
					.query('select[]=email&select[]=firstName&select[]=lastName')
					.expect(200);

				expect(response.body).toEqual({
					data: {
						count: 4,
						items: [
							{
								id: expect.any(String),
								email: expect.any(String),
								firstName: expect.any(String),
								lastName: expect.any(String),
							},
							{
								id: expect.any(String),
								email: expect.any(String),
								firstName: expect.any(String),
								lastName: expect.any(String),
							},
							{
								id: expect.any(String),
								email: expect.any(String),
								firstName: expect.any(String),
								lastName: expect.any(String),
							},
							{
								id: expect.any(String),
								email: expect.any(String),
								firstName: expect.any(String),
								lastName: expect.any(String),
							},
						],
					},
				});
			});
		});

		describe('take', () => {
			test('should return n users or less, without skip', async () => {
				const response = await ownerAgent.get('/users').query('take=2').expect(200);

				expect(response.body.data.count).toBe(4);
				expect(response.body.data.items).toHaveLength(2);

				response.body.data.items.forEach(validateUser);

				const _response = await ownerAgent.get('/users').query('take=1').expect(200);

				expect(_response.body.data.items).toHaveLength(1);

				_response.body.data.items.forEach(validateUser);
			});

			test('should return n users or less, with skip', async () => {
				const response = await ownerAgent.get('/users').query('take=1&skip=1').expect(200);

				expect(response.body.data.count).toBe(4);
				expect(response.body.data.items).toHaveLength(1);

				response.body.data.items.forEach(validateUser);
			});

			test('should return all users with large enough take', async () => {
				const response = await ownerAgent
					.get('/users')
					.query('take=5&expand[]=projectRelations&sortBy[]=role:desc')
					.expect(200);

				expect(response.body.data.count).toBe(4);
				expect(response.body.data.items).toHaveLength(4);

				response.body.data.items.forEach(validateUser);
			});

			test('should return all users with negative take', async () => {
				const users: User[] = [];

				for (let i = 0; i < 100; i++) {
					users.push(await createMember());
				}
				const response = await ownerAgent.get('/users').query('take=-1').expect(200);

				expect(response.body.data.items).toHaveLength(104);

				response.body.data.items.forEach(validateUser);

				for (const user of users) {
					await userRepository.delete({ id: user.id });
				}

				const _response = await ownerAgent.get('/users').query('take=-1').expect(200);

				expect(_response.body.data.items).toHaveLength(4);

				_response.body.data.items.forEach(validateUser);
			});
		});

		describe('auxiliary fields', () => {
			/**
			 * Some list query options require auxiliary fields:
			 *
			 * - `select` with `take` requires `id` (for pagination)
			 */
			test('should support options that require auxiliary fields', async () => {
				const response = await ownerAgent
					.get('/users')
					.query('filter={ "isOwner": true }&select[]=firstName&take=1')
					.expect(200);

				expect(response.body).toEqual({
					data: {
						count: 1,
						items: [
							{
								id: expect.any(String),
								firstName: expect.any(String),
							},
						],
					},
				});
			});
		});

		describe('expand', () => {
			test('should expand on team projects', async () => {
				const project = await createTeamProject('Test Project');
				await linkUserToProject(member2, project, 'project:admin');

				const response = await ownerAgent
					.get('/users')
					.query(
						`filter={ "email": "${member2.email}" }&select[]=firstName&take=1&expand[]=projectRelations&sortBy[]=role:asc`,
					)
					.expect(200);

				expect(response.body).toEqual({
					data: {
						count: 1,
						items: [
							{
								id: expect.any(String),
								firstName: expect.any(String),
								projectRelations: [
									{
										id: project.id,
										role: 'project:admin',
										name: project.name, // Ensure the project name is included
									},
								],
							},
						],
					},
				});

				expect(response.body.data.items[0].projectRelations).toHaveLength(1);
			});

			test('should expand on projects and hide personal projects', async () => {
				const response = await ownerAgent
					.get('/users')
					.query(
						'filter={ "isOwner": true }&select[]=firstName&take=1&expand[]=projectRelations&sortBy[]=role:asc',
					)
					.expect(200);

				expect(response.body).toEqual({
					data: {
						count: 1,
						items: [
							{
								id: expect.any(String),
								firstName: expect.any(String),
								projectRelations: expect.arrayContaining([]),
							},
						],
					},
				});

				expect(response.body.data.items[0].projectRelations).toHaveLength(0);
			});
		});

		describe('inviteAcceptUrl', () => {
			let pendingUser: User;
			beforeAll(async () => {
				pendingUser = await createUser({
					role: { slug: 'global:member' },
					email: 'pending@n8n.io',
					firstName: 'PendingFirstName',
					lastName: 'PendingLastName',
					password: null,
				});
			});

			afterAll(async () => {
				await userRepository.delete({ id: pendingUser.id });
			});

			test('should include inviteAcceptUrl for pending users', async () => {
				const response = await ownerAgent.get('/users').expect(200);

				const responseData = response.body.data as {
					count: number;
					items: PublicUser[];
				};

				const pendingUserInResponse = responseData.items.find((user) => user.id === pendingUser.id);

				expect(pendingUserInResponse).toBeDefined();
				expect(pendingUserInResponse!.inviteAcceptUrl).toBeDefined();
				expect(pendingUserInResponse!.inviteAcceptUrl).toMatch(
					new RegExp(`/signup\\?inviterId=${owner.id}&inviteeId=${pendingUser.id}`),
				);

				const nonPendingUser = responseData.items.find((user) => user.id === member1.id);

				expect(nonPendingUser).toBeDefined();
				expect(nonPendingUser!.isPending).toBe(false);
				expect(nonPendingUser!.inviteAcceptUrl).toBeUndefined();
			});

			test('should not include inviteAcceptUrl for pending users, if member requests it', async () => {
				const response = await memberAgent.get('/users').expect(200);

				const responseData = response.body.data as {
					count: number;
					items: PublicUser[];
				};

				const pendingUserInResponse = responseData.items.find((user) => user.id === pendingUser.id);

				expect(pendingUserInResponse).toBeDefined();
				expect(pendingUserInResponse!.inviteAcceptUrl).not.toBeDefined();

				const nonPendingUser = responseData.items.find((user) => user.id === member1.id);

				expect(nonPendingUser).toBeDefined();
				expect(nonPendingUser!.isPending).toBe(false);
				expect(nonPendingUser!.inviteAcceptUrl).toBeUndefined();
			});
		});

		describe('sortBy', () => {
			test('should sort by role:asc', async () => {
				const response = await ownerAgent.get('/users').query('sortBy[]=role:asc').expect(200);

				expect(response.body.data.items).toHaveLength(4);
				expect(response.body.data.items[0].role).toBe('global:owner');
				expect(response.body.data.items[1].role).toBe('global:admin');
				expect(response.body.data.items[2].role).toBe('global:member');
				expect(response.body.data.items[3].role).toBe('global:member');
			});

			test('should sort by role:desc', async () => {
				const response = await ownerAgent.get('/users').query('sortBy[]=role:desc').expect(200);

				expect(response.body.data.items).toHaveLength(4);
				expect(response.body.data.items[0].role).toBe('global:member');
				expect(response.body.data.items[1].role).toBe('global:member');
				expect(response.body.data.items[2].role).toBe('global:admin');
				expect(response.body.data.items[3].role).toBe('global:owner');
			});

			test('should sort by firstName:asc', async () => {
				const response = await ownerAgent.get('/users').query('sortBy[]=firstName:asc').expect(200);

				expect(response.body.data.items).toHaveLength(4);
				expect(response.body.data.items[0].firstName).toBe('AdminFirstName');
				expect(response.body.data.items[1].firstName).toBe('Member1FirstName');
				expect(response.body.data.items[2].firstName).toBe('Member2FirstName');
				expect(response.body.data.items[3].firstName).toBe('OwnerFirstName');
			});

			test('should sort by firstName:desc', async () => {
				const response = await ownerAgent
					.get('/users')
					.query('sortBy[]=firstName:desc')
					.expect(200);

				expect(response.body.data.items).toHaveLength(4);
				expect(response.body.data.items[0].firstName).toBe('OwnerFirstName');
				expect(response.body.data.items[1].firstName).toBe('Member2FirstName');
				expect(response.body.data.items[2].firstName).toBe('Member1FirstName');
				expect(response.body.data.items[3].firstName).toBe('AdminFirstName');
			});

			test('should sort by lastName:asc', async () => {
				const response = await ownerAgent.get('/users').query('sortBy[]=lastName:asc').expect(200);

				expect(response.body.data.items).toHaveLength(4);
				expect(response.body.data.items[0].lastName).toBe('AdminLastName');
				expect(response.body.data.items[1].lastName).toBe('Member1LastName');
				expect(response.body.data.items[2].lastName).toBe('Member2LastName');
				expect(response.body.data.items[3].lastName).toBe('OwnerLastName');
			});

			test('should sort by lastName:desc', async () => {
				const response = await ownerAgent.get('/users').query('sortBy[]=lastName:desc').expect(200);

				expect(response.body.data.items).toHaveLength(4);
				expect(response.body.data.items[0].lastName).toBe('OwnerLastName');
				expect(response.body.data.items[1].lastName).toBe('Member2LastName');
				expect(response.body.data.items[2].lastName).toBe('Member1LastName');
				expect(response.body.data.items[3].lastName).toBe('AdminLastName');
			});

			test('should sort by mfaEnabled:asc', async () => {
				const response = await ownerAgent
					.get('/users')
					.query('sortBy[]=mfaEnabled:asc')
					.expect(200);

				expect(response.body.data.items).toHaveLength(4);
				expect(response.body.data.items[0].mfaEnabled).toBe(false);
				expect(response.body.data.items[1].mfaEnabled).toBe(false);
				expect(response.body.data.items[2].mfaEnabled).toBe(true);
				expect(response.body.data.items[3].mfaEnabled).toBe(true);
			});

			test('should sort by mfaEnabled:desc', async () => {
				const response = await ownerAgent
					.get('/users')
					.query('sortBy[]=mfaEnabled:desc')
					.expect(200);

				expect(response.body.data.items).toHaveLength(4);
				expect(response.body.data.items[0].mfaEnabled).toBe(true);
				expect(response.body.data.items[1].mfaEnabled).toBe(true);
				expect(response.body.data.items[2].mfaEnabled).toBe(false);
				expect(response.body.data.items[3].mfaEnabled).toBe(false);
			});

			test('should sort by firstName and lastName combined', async () => {
				const user1 = await createUser({
					role: { slug: 'global:member' },
					email: 'memberz1@n8n.io',
					firstName: 'ZZZFirstName',
					lastName: 'ZZZLastName',
				});

				const user2 = await createUser({
					role: { slug: 'global:member' },
					email: 'memberz2@n8n.io',
					firstName: 'ZZZFirstName',
					lastName: 'ZZYLastName',
				});

				const response = await ownerAgent
					.get('/users')
					.query('sortBy[]=firstName:desc&sortBy[]=lastName:desc')
					.expect(200);

				expect(response.body.data.items).toHaveLength(6);
				expect(response.body.data.items[0].id).toBe(user1.id);
				expect(response.body.data.items[1].id).toBe(user2.id);
				expect(response.body.data.items[2].lastName).toBe('OwnerLastName');
				expect(response.body.data.items[3].lastName).toBe('Member2LastName');
				expect(response.body.data.items[4].lastName).toBe('Member1LastName');
				expect(response.body.data.items[5].lastName).toBe('AdminLastName');

				const response1 = await ownerAgent
					.get('/users')
					.query('sortBy[]=firstName:asc&sortBy[]=lastName:asc')
					.expect(200);

				expect(response1.body.data.items).toHaveLength(6);
				expect(response1.body.data.items[5].id).toBe(user1.id);
				expect(response1.body.data.items[4].id).toBe(user2.id);
				expect(response1.body.data.items[3].lastName).toBe('OwnerLastName');
				expect(response1.body.data.items[2].lastName).toBe('Member2LastName');
				expect(response1.body.data.items[1].lastName).toBe('Member1LastName');
				expect(response1.body.data.items[0].lastName).toBe('AdminLastName');

				await userRepository.delete({ id: user1.id });
				await userRepository.delete({ id: user2.id });
			});
		});
	});
});

describe('GET /users/:id/password-reset-link', () => {
	let owner: User;
	let admin: User;
	let member: User;

	beforeAll(async () => {
		await testDb.truncate(['User']);

		[owner, admin, member] = await Promise.all([createOwner(), createAdmin(), createMember()]);
	});

	it('should allow owners to generate password reset links for admins and members', async () => {
		const ownerAgent = testServer.authAgentFor(owner);
		await ownerAgent.get(`/users/${owner.id}/password-reset-link`).expect(200);
		await ownerAgent.get(`/users/${admin.id}/password-reset-link`).expect(200);
		await ownerAgent.get(`/users/${member.id}/password-reset-link`).expect(200);
	});

	it('should allow admins to generate password reset links for admins and members, but not owners', async () => {
		const adminAgent = testServer.authAgentFor(admin);
		await adminAgent.get(`/users/${owner.id}/password-reset-link`).expect(403);
		await adminAgent.get(`/users/${admin.id}/password-reset-link`).expect(200);
		await adminAgent.get(`/users/${member.id}/password-reset-link`).expect(200);
	});

	it('should not allow members to generate password reset links for anyone', async () => {
		const memberAgent = testServer.authAgentFor(member);
		await memberAgent.get(`/users/${owner.id}/password-reset-link`).expect(403);
		await memberAgent.get(`/users/${admin.id}/password-reset-link`).expect(403);
		await memberAgent.get(`/users/${member.id}/password-reset-link`).expect(403);
	});
});

describe('DELETE /users/:id', () => {
	let owner: User;
	let ownerAgent: SuperAgentTest;

	beforeAll(async () => {
		await testDb.truncate(['User']);

		owner = await createOwner();
		ownerAgent = testServer.authAgentFor(owner);
	});

	test('should delete user and their resources', async () => {
		//
		// ARRANGE
		//
		// @TODO: Include active workflow and check whether webhook has been removed

		const member = await createMember();
		const memberPersonalProject = await getPersonalProject(member);

		// stays untouched
		const teamProject = await createTeamProject();
		// will be deleted
		await linkUserToProject(member, teamProject, 'project:admin');

		const [savedWorkflow, savedCredential, teamWorkflow, teamCredential] = await Promise.all([
			// personal resource -> deleted
			createWorkflow({}, member),
			saveCredential(randomCredentialPayload(), {
				user: member,
				role: 'credential:owner',
			}),
			// resources in a team project -> untouched
			createWorkflow({}, teamProject),
			saveCredential(randomCredentialPayload(), {
				project: teamProject,
				role: 'credential:owner',
			}),
		]);

		//
		// ACT
		//
		await ownerAgent.delete(`/users/${member.id}`).expect(200, SUCCESS_RESPONSE_BODY);

		//
		// ASSERT
		//
		const userRepository = Container.get(UserRepository);
		const projectRepository = Container.get(ProjectRepository);
		const projectRelationRepository = Container.get(ProjectRelationRepository);
		const sharedWorkflowRepository = Container.get(SharedWorkflowRepository);
		const sharedCredentialsRepository = Container.get(SharedCredentialsRepository);

		await Promise.all([
			// user, their personal project and their relationship to the team project is gone
			expect(userRepository.findOneBy({ id: member.id })).resolves.toBeNull(),
			expect(projectRepository.findOneBy({ id: memberPersonalProject.id })).resolves.toBeNull(),
			expect(
				projectRelationRepository.findOneBy({ userId: member.id, projectId: teamProject.id }),
			).resolves.toBeNull(),

			// their personal workflows and and credentials are gone
			expect(
				sharedWorkflowRepository.findOneBy({
					workflowId: savedWorkflow.id,
					projectId: memberPersonalProject.id,
				}),
			).resolves.toBeNull(),
			expect(
				sharedCredentialsRepository.findOneBy({
					credentialsId: savedCredential.id,
					projectId: memberPersonalProject.id,
				}),
			).resolves.toBeNull(),

			// team workflows and credentials are untouched
			expect(
				sharedWorkflowRepository.findOneBy({
					workflowId: teamWorkflow.id,
					projectId: teamProject.id,
					role: 'workflow:owner',
				}),
			).resolves.not.toBeNull(),
			expect(
				sharedCredentialsRepository.findOneBy({
					credentialsId: teamCredential.id,
					projectId: teamProject.id,
					role: 'credential:owner',
				}),
			).resolves.not.toBeNull(),
		]);

		const user = await Container.get(UserRepository).findOneBy({ id: member.id });
		const sharedWorkflow = await Container.get(SharedWorkflowRepository).findOne({
			where: { projectId: memberPersonalProject.id, role: 'workflow:owner' },
		});
		const sharedCredential = await Container.get(SharedCredentialsRepository).findOne({
			where: { projectId: memberPersonalProject.id, role: 'credential:owner' },
		});
		const workflow = await getWorkflowById(savedWorkflow.id);
		const credential = await getCredentialById(savedCredential.id);

		expect(user).toBeNull();
		expect(sharedWorkflow).toBeNull();
		expect(sharedCredential).toBeNull();
		expect(workflow).toBeNull();
		expect(credential).toBeNull();
	});

	test('should delete user and team relations and transfer their personal resources to user', async () => {
		//
		// ARRANGE
		//
		const [member, transferee, otherMember] = await Promise.all([
			createMember(),
			createMember(),
			createMember(),
		]);

		// stays untouched
		const teamProject = await createTeamProject();
		await Promise.all([
			// will be deleted
			linkUserToProject(member, teamProject, 'project:admin'),

			// stays untouched
			linkUserToProject(transferee, teamProject, 'project:editor'),
		]);

		const [
			ownedWorkflow,
			ownedCredential,
			teamWorkflow,
			teamCredential,
			sharedByOtherMemberWorkflow,
			sharedByOtherMemberCredential,
			sharedByTransfereeWorkflow,
			sharedByTransfereeCredential,
		] = await Promise.all([
			// personal resource
			// -> transferred to transferee's personal project
			createWorkflow({}, member),
			saveCredential(randomCredentialPayload(), {
				user: member,
				role: 'credential:owner',
			}),

			// resources in a team project
			// -> untouched
			createWorkflow({}, teamProject),
			saveCredential(randomCredentialPayload(), {
				project: teamProject,
				role: 'credential:owner',
			}),

			// credential and workflow that are shared with the user to delete
			// -> transferred to transferee's personal project
			createWorkflow({}, otherMember),
			saveCredential(randomCredentialPayload(), {
				user: otherMember,
				role: 'credential:owner',
			}),

			// credential and workflow that are shared with the user to delete but owned by the transferee
			// -> not transferred but deleted
			createWorkflow({}, transferee),
			saveCredential(randomCredentialPayload(), {
				user: transferee,
				role: 'credential:owner',
			}),
		]);

		await Promise.all([
			shareWorkflowWithUsers(sharedByOtherMemberWorkflow, [member]),
			shareCredentialWithUsers(sharedByOtherMemberCredential, [member]),

			shareWorkflowWithUsers(sharedByTransfereeWorkflow, [member]),
			shareCredentialWithUsers(sharedByTransfereeCredential, [member]),
		]);

		const [memberPersonalProject, transfereePersonalProject] = await Promise.all([
			getPersonalProject(member),
			getPersonalProject(transferee),
		]);

		await Promise.all([
			createFolder(memberPersonalProject, { name: 'folder1' }),
			createFolder(memberPersonalProject, { name: 'folder2' }),
			createFolder(transfereePersonalProject, { name: 'folder3' }),
			createFolder(transfereePersonalProject, { name: 'folder1' }),
		]);

		const deleteSpy = jest.spyOn(Container.get(CacheService), 'deleteMany');

		//
		// ACT
		//
		await ownerAgent
			.delete(`/users/${member.id}`)
			.query({ transferId: transfereePersonalProject.id })
			.expect(200);

		//
		// ASSERT
		//

		expect(deleteSpy).toBeCalledWith(
			expect.arrayContaining([
				`credential-can-use-secrets:${sharedByTransfereeCredential.id}`,
				`credential-can-use-secrets:${ownedCredential.id}`,
			]),
		);
		deleteSpy.mockClear();

		const userRepository = Container.get(UserRepository);
		const projectRepository = Container.get(ProjectRepository);
		const projectRelationRepository = Container.get(ProjectRelationRepository);
		const sharedWorkflowRepository = Container.get(SharedWorkflowRepository);
		const sharedCredentialsRepository = Container.get(SharedCredentialsRepository);
		const folderRepository = Container.get(FolderRepository);

		await Promise.all([
			// user, their personal project and their relationship to the team project is gone
			expect(userRepository.findOneBy({ id: member.id })).resolves.toBeNull(),
			expect(projectRepository.findOneBy({ id: memberPersonalProject.id })).resolves.toBeNull(),
			expect(
				projectRelationRepository.findOneBy({
					projectId: teamProject.id,
					userId: member.id,
				}),
			).resolves.toBeNull(),

			// their owned workflow and credential are transferred to the transferee
			expect(
				sharedWorkflowRepository.findOneBy({
					workflowId: ownedWorkflow.id,
					projectId: transfereePersonalProject.id,
					role: 'workflow:owner',
				}),
			).resolves.not.toBeNull,
			expect(
				sharedCredentialsRepository.findOneBy({
					credentialsId: ownedCredential.id,
					projectId: transfereePersonalProject.id,
					role: 'credential:owner',
				}),
			).resolves.not.toBeNull(),

			// the credential and workflow shared with them by another member is now shared with the transferee
			expect(
				sharedWorkflowRepository.findOneBy({
					workflowId: sharedByOtherMemberWorkflow.id,
					projectId: transfereePersonalProject.id,
					role: 'workflow:editor',
				}),
			).resolves.not.toBeNull(),
			expect(
				sharedCredentialsRepository.findOneBy({
					credentialsId: sharedByOtherMemberCredential.id,
					projectId: transfereePersonalProject.id,
					role: 'credential:user',
				}),
			),

			// the transferee is still owner of the workflow and credential they shared with the user to delete
			expect(
				sharedWorkflowRepository.findOneBy({
					workflowId: sharedByTransfereeWorkflow.id,
					projectId: transfereePersonalProject.id,
					role: 'workflow:owner',
				}),
			).resolves.not.toBeNull(),
			expect(
				sharedCredentialsRepository.findOneBy({
					credentialsId: sharedByTransfereeCredential.id,
					projectId: transfereePersonalProject.id,
					role: 'credential:owner',
				}),
			).resolves.not.toBeNull(),

			// the transferee's relationship to the team project is unchanged
			expect(
				projectRepository.findOneBy({
					id: teamProject.id,
					projectRelations: {
						userId: transferee.id,
						role: { slug: 'project:editor' },
					},
				}),
			).resolves.not.toBeNull(),

			// the sharing of the team workflow is unchanged
			expect(
				sharedWorkflowRepository.findOneBy({
					workflowId: teamWorkflow.id,
					projectId: teamProject.id,
					role: 'workflow:owner',
				}),
			).resolves.not.toBeNull(),

			// the sharing of the team credential is unchanged
			expect(
				sharedCredentialsRepository.findOneBy({
					credentialsId: teamCredential.id,
					projectId: teamProject.id,
					role: 'credential:owner',
				}),
			).resolves.not.toBeNull(),
		]);

		// Assert that the folders have been transferred

		const transfereeFolders = await folderRepository.findBy({
			homeProject: { id: transfereePersonalProject.id },
		});

		const deletedUserFolders = await folderRepository.findBy({
			homeProject: { id: memberPersonalProject.id },
		});

		expect(transfereeFolders).toHaveLength(4);
		expect(transfereeFolders.map((folder) => folder.name)).toEqual(
			expect.arrayContaining(['folder1', 'folder2', 'folder3', 'folder1']),
		);

		expect(deletedUserFolders).toHaveLength(0);
	});

	test('should delete user and transfer their personal resources to team project', async () => {
		//
		// ARRANGE
		//
		const memberToDelete = await createMember();

		const teamProject = await createTeamProject('test project', owner);

		const memberPersonalProject = await getPersonalProject(memberToDelete);

		const memberToDeleteWorkflow = await createWorkflow({ name: 'workflow1' }, memberToDelete);
		const memberToDeleteCredential = await saveCredential(randomCredentialPayload(), {
			user: memberToDelete,
			role: 'credential:owner',
		});

		await Promise.all([
			createFolder(memberPersonalProject, { name: 'folder1' }),
			createFolder(memberPersonalProject, { name: 'folder2' }),
			createFolder(teamProject, { name: 'folder3' }),
			createFolder(teamProject, { name: 'folder1' }),
		]);

		const deleteSpy = jest.spyOn(Container.get(CacheService), 'deleteMany');

		//
		// ACT
		//
		await ownerAgent
			.delete(`/users/${memberToDelete.id}`)
			.query({ transferId: teamProject.id })
			.expect(200);

		//
		// ASSERT
		//

		deleteSpy.mockClear();

		const sharedWorkflowRepository = Container.get(SharedWorkflowRepository);
		const sharedCredentialRepository = Container.get(SharedCredentialsRepository);
		const folderRepository = Container.get(FolderRepository);
		const userRepository = Container.get(UserRepository);

		// assert member has been deleted
		const user = await userRepository.findOneBy({ id: memberToDelete.id });
		expect(user).toBeNull();

		// assert the workflow has been transferred
		const memberToDeleteWorkflowProjectOwner =
			await sharedWorkflowRepository.getWorkflowOwningProject(memberToDeleteWorkflow.id);

		expect(memberToDeleteWorkflowProjectOwner?.id).toBe(teamProject.id);

		// assert the credential has been transferred
		const memberToDeleteCredentialProjectOwner =
			await sharedCredentialRepository.findCredentialOwningProject(memberToDeleteCredential.id);

		expect(memberToDeleteCredentialProjectOwner?.id).toBe(teamProject.id);

		// assert that the folders have been transferred
		const transfereeFolders = await folderRepository.findBy({
			homeProject: { id: teamProject.id },
		});

		const deletedUserFolders = await folderRepository.findBy({
			homeProject: { id: memberPersonalProject.id },
		});

		expect(transfereeFolders).toHaveLength(4);
		expect(transfereeFolders.map((folder) => folder.name)).toEqual(
			expect.arrayContaining(['folder1', 'folder2', 'folder3', 'folder1']),
		);

		expect(deletedUserFolders).toHaveLength(0);
	});

	test('should fail to delete self', async () => {
		await ownerAgent.delete(`/users/${owner.id}`).expect(400);

		const user = await getUserById(owner.id);

		expect(user).toBeDefined();
	});

	test('should fail to delete the instance owner', async () => {
		const admin = await createAdmin();
		const adminAgent = testServer.authAgentFor(admin);
		await adminAgent.delete(`/users/${owner.id}`).expect(403);

		const user = await getUserById(owner.id);
		expect(user).toBeDefined();
	});

	test('should fail to delete a user that does not exist', async () => {
		await ownerAgent.delete(`/users/${uuid()}`).query({ transferId: '' }).expect(404);
	});

	test('should fail to transfer to a project that does not exist', async () => {
		const member = await createMember();

		await ownerAgent.delete(`/users/${member.id}`).query({ transferId: 'foobar' }).expect(404);

		const user = await Container.get(UserRepository).findOneBy({ id: member.id });

		expect(user).toBeDefined();
	});

	test('should fail to delete if user to delete is transferee', async () => {
		const member = await createMember();
		const personalProject = await getPersonalProject(member);

		await ownerAgent
			.delete(`/users/${member.id}`)
			.query({ transferId: personalProject.id })
			.expect(400);

		const user = await Container.get(UserRepository).findOneBy({ id: member.id });

		expect(user).toBeDefined();
	});
});

describe('PATCH /users/:id/role', () => {
	let owner: User;
	let admin: User;
	let otherAdmin: User;
	let member: User;
	let otherMember: User;

	let ownerAgent: SuperAgentTest;
	let adminAgent: SuperAgentTest;
	let memberAgent: SuperAgentTest;
	let authlessAgent: SuperAgentTest;

	const { NO_ADMIN_ON_OWNER, NO_USER, NO_OWNER_ON_OWNER } =
		UsersController.ERROR_MESSAGES.CHANGE_ROLE;

	beforeAll(async () => {
		await testDb.truncate(['User']);

		[owner, admin, otherAdmin, member, otherMember] = await Promise.all([
			await createOwner(),
			await createAdmin(),
			await createAdmin(),
			await createMember(),
			await createMember(),
		]);

		ownerAgent = testServer.authAgentFor(owner);
		adminAgent = testServer.authAgentFor(admin);
		memberAgent = testServer.authAgentFor(member);
		authlessAgent = testServer.authlessAgent;
	});

	describe('unauthenticated user', () => {
		test('should receive 401', async () => {
			const response = await authlessAgent.patch(`/users/${member.id}/role`).send({
				newRoleName: 'global:admin',
			});

			expect(response.statusCode).toBe(401);
		});
	});

	describe('Invalid payload should return 400 when newRoleName', () => {
		test.each([
			['is missing', {}],
			['is `owner`', { newRoleName: 'global:owner' }],
			['is an array', { newRoleName: ['global:owner'] }],
		])('%s', async (_, payload) => {
			const response = await adminAgent.patch(`/users/${member.id}/role`).send(payload);
			expect(response.statusCode).toBe(400);
		});
	});

	describe('member', () => {
		test('should fail to demote owner to member', async () => {
			await memberAgent
				.patch(`/users/${owner.id}/role`)
				.send({
					newRoleName: 'global:member',
				})
				.expect(403, { status: 'error', message: RESPONSE_ERROR_MESSAGES.MISSING_SCOPE });
		});

		test('should fail to demote owner to admin', async () => {
			await memberAgent
				.patch(`/users/${owner.id}/role`)
				.send({
					newRoleName: 'global:admin',
				})
				.expect(403, { status: 'error', message: RESPONSE_ERROR_MESSAGES.MISSING_SCOPE });
		});

		test('should fail to demote admin to member', async () => {
			await memberAgent
				.patch(`/users/${admin.id}/role`)
				.send({
					newRoleName: 'global:member',
				})
				.expect(403, { status: 'error', message: RESPONSE_ERROR_MESSAGES.MISSING_SCOPE });
		});

		test('should fail to promote other member to owner', async () => {
			await memberAgent
				.patch(`/users/${otherMember.id}/role`)
				.send({
					newRoleName: 'global:owner',
				})
				.expect(403, { status: 'error', message: RESPONSE_ERROR_MESSAGES.MISSING_SCOPE });
		});

		test('should fail to promote other member to admin', async () => {
			await memberAgent
				.patch(`/users/${otherMember.id}/role`)
				.send({
					newRoleName: 'global:admin',
				})
				.expect(403, { status: 'error', message: RESPONSE_ERROR_MESSAGES.MISSING_SCOPE });
		});

		test('should fail to promote self to admin', async () => {
			await memberAgent
				.patch(`/users/${member.id}/role`)
				.send({
					newRoleName: 'global:admin',
				})
				.expect(403, { status: 'error', message: RESPONSE_ERROR_MESSAGES.MISSING_SCOPE });
		});

		test('should fail to promote self to owner', async () => {
			await memberAgent
				.patch(`/users/${member.id}/role`)
				.send({
					newRoleName: 'global:owner',
				})
				.expect(403, { status: 'error', message: RESPONSE_ERROR_MESSAGES.MISSING_SCOPE });
		});
	});

	describe('admin', () => {
		test('should receive 404 on unknown target user', async () => {
			const response = await adminAgent
				.patch('/users/c2317ff3-7a9f-4fd4-ad2b-7331f6359260/role')
				.send({
					newRoleName: 'global:member',
				});

			expect(response.statusCode).toBe(404);
			expect(response.body.message).toBe(NO_USER);
		});

		test('should fail to demote owner to admin', async () => {
			const response = await adminAgent.patch(`/users/${owner.id}/role`).send({
				newRoleName: 'global:admin',
			});

			expect(response.statusCode).toBe(403);
			expect(response.body.message).toBe(NO_ADMIN_ON_OWNER);
		});

		test('should fail to demote owner to member', async () => {
			const response = await adminAgent.patch(`/users/${owner.id}/role`).send({
				newRoleName: 'global:member',
			});

			expect(response.statusCode).toBe(403);
			expect(response.body.message).toBe(NO_ADMIN_ON_OWNER);
		});

		test('should fail to promote member to admin if not licensed', async () => {
			testServer.license.disable('feat:advancedPermissions');

			const response = await adminAgent.patch(`/users/${member.id}/role`).send({
				newRoleName: 'global:admin',
			});

			expect(response.statusCode).toBe(403);
			expect(response.body.message).toBe('Plan lacks license for this feature');
		});

		test('should be able to demote admin to member', async () => {
			const response = await adminAgent.patch(`/users/${otherAdmin.id}/role`).send({
				newRoleName: 'global:member',
			});

			expect(response.statusCode).toBe(200);
			expect(response.body.data).toStrictEqual({ success: true });

			const user = await getUserById(otherAdmin.id);

			expect(user.role.slug).toBe('global:member');

			// restore other admin

			otherAdmin = await createAdmin();
			adminAgent = testServer.authAgentFor(otherAdmin);
		});

		test('should be able to demote self to member', async () => {
			const response = await adminAgent.patch(`/users/${admin.id}/role`).send({
				newRoleName: 'global:member',
			});

			expect(response.statusCode).toBe(200);
			expect(response.body.data).toStrictEqual({ success: true });

			const user = await getUserById(admin.id);

			expect(user.role.slug).toBe('global:member');

			// restore admin

			admin = await createAdmin();
			adminAgent = testServer.authAgentFor(admin);
		});

		test('should be able to promote member to admin if licensed', async () => {
			const response = await adminAgent.patch(`/users/${member.id}/role`).send({
				newRoleName: 'global:admin',
			});

			expect(response.statusCode).toBe(200);
			expect(response.body.data).toStrictEqual({ success: true });

			const user = await getUserById(member.id);

			expect(user.role.slug).toBe('global:admin');

			// restore member

			member = await createMember();
			memberAgent = testServer.authAgentFor(member);
		});
	});

	describe('owner', () => {
		test('should fail to demote self to admin', async () => {
			const response = await ownerAgent.patch(`/users/${owner.id}/role`).send({
				newRoleName: 'global:admin',
			});

			expect(response.statusCode).toBe(403);
			expect(response.body.message).toBe(NO_OWNER_ON_OWNER);
		});

		test('should fail to demote self to member', async () => {
			const response = await ownerAgent.patch(`/users/${owner.id}/role`).send({
				newRoleName: 'global:member',
			});

			expect(response.statusCode).toBe(403);
			expect(response.body.message).toBe(NO_OWNER_ON_OWNER);
		});

		test('should fail to promote member to admin if not licensed', async () => {
			testServer.license.disable('feat:advancedPermissions');

			const response = await ownerAgent.patch(`/users/${member.id}/role`).send({
				newRoleName: 'global:admin',
			});

			expect(response.statusCode).toBe(403);
			expect(response.body.message).toBe('Plan lacks license for this feature');
		});

		test('should be able to promote member to admin if licensed', async () => {
			const response = await ownerAgent.patch(`/users/${member.id}/role`).send({
				newRoleName: 'global:admin',
			});

			expect(response.statusCode).toBe(200);
			expect(response.body.data).toStrictEqual({ success: true });

			const user = await getUserById(admin.id);

			expect(user.role.slug).toBe('global:admin');

			// restore member

			member = await createMember();
			memberAgent = testServer.authAgentFor(member);
		});

		test('should be able to demote admin to member', async () => {
			const response = await ownerAgent.patch(`/users/${admin.id}/role`).send({
				newRoleName: 'global:member',
			});

			expect(response.statusCode).toBe(200);
			expect(response.body.data).toStrictEqual({ success: true });

			const user = await getUserById(admin.id);

			expect(user.role.slug).toBe('global:member');

			// restore admin

			admin = await createAdmin();
			adminAgent = testServer.authAgentFor(admin);
		});
	});

	test("should clear credential external secrets usability cache when changing a user's role", async () => {
		const user = await createAdmin();

		const [project1, project2] = await Promise.all([
			createTeamProject(undefined, user),
			createTeamProject(),
		]);

		await Promise.all([
			saveCredential(randomCredentialPayload(), {
				user,
				role: 'credential:owner',
			}),
			saveCredential(randomCredentialPayload(), {
				project: project1,
				role: 'credential:owner',
			}),
			saveCredential(randomCredentialPayload(), {
				project: project2,
				role: 'credential:owner',
			}),
			linkUserToProject(user, project2, 'project:editor'),
		]);

		const deleteSpy = jest.spyOn(Container.get(CacheService), 'deleteMany');
		const response = await ownerAgent.patch(`/users/${user.id}/role`).send({
			newRoleName: 'global:member',
		});

		expect(deleteSpy).toBeCalledTimes(2);
		deleteSpy.mockClear();

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toStrictEqual({ success: true });
	});

	test('should fail to change to non-existing role', async () => {
		const customRole = 'custom:project-role';
		await createRole({ slug: customRole, displayName: 'Custom Role', roleType: 'project' });
		const response = await ownerAgent.patch(`/users/${member.id}/role`).send({
			newRoleName: customRole,
		});

		expect(response.statusCode).toBe(400);
		expect(response.body.message).toBe('Role custom:project-role does not exist');
	});

	test('should change to existing custom role', async () => {
		const customRole = 'custom:role';
		await createRole({ slug: customRole, displayName: 'Custom Role', roleType: 'global' });
		const response = await ownerAgent.patch(`/users/${member.id}/role`).send({
			newRoleName: customRole,
		});

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toStrictEqual({ success: true });

		const user = await getUserById(member.id);

		expect(user.role.slug).toBe(customRole);
	});
});

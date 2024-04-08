import Container from 'typedi';
import type { SuperAgentTest } from 'supertest';

import { UsersController } from '@/controllers/users.controller';
import type { User } from '@db/entities/User';
import { UserRepository } from '@db/repositories/user.repository';
import { SharedCredentialsRepository } from '@db/repositories/sharedCredentials.repository';
import { SharedWorkflowRepository } from '@db/repositories/sharedWorkflow.repository';
import { ExecutionService } from '@/executions/execution.service';

import { getCredentialById, saveCredential } from './shared/db/credentials';
import { createAdmin, createMember, createOwner, getUserById } from './shared/db/users';
import { createWorkflow, getWorkflowById } from './shared/db/workflows';
import { SUCCESS_RESPONSE_BODY } from './shared/constants';
import { validateUser } from './shared/utils/users';
import { randomName } from './shared/random';
import * as utils from './shared/utils/';
import * as testDb from './shared/testDb';
import { mockInstance } from '../shared/mocking';

mockInstance(ExecutionService);

const testServer = utils.setupTestServer({
	endpointGroups: ['users'],
	enabledFeatures: ['feat:advancedPermissions'],
});

describe('GET /users', () => {
	let owner: User;
	let member: User;
	let ownerAgent: SuperAgentTest;

	beforeAll(async () => {
		await testDb.truncate(['User']);

		owner = await createOwner();
		member = await createMember();
		await createMember();

		ownerAgent = testServer.authAgentFor(owner);
	});

	test('should return all users', async () => {
		const response = await ownerAgent.get('/users').expect(200);

		expect(response.body.data).toHaveLength(3);

		response.body.data.forEach(validateUser);
	});

	describe('list query options', () => {
		describe('filter', () => {
			test('should filter users by field: email', async () => {
				const response = await ownerAgent
					.get('/users')
					.query(`filter={ "email": "${member.email}" }`)
					.expect(200);

				expect(response.body.data).toHaveLength(1);

				const [user] = response.body.data;

				expect(user.email).toBe(member.email);

				const _response = await ownerAgent
					.get('/users')
					.query('filter={ "email": "non@existing.com" }')
					.expect(200);

				expect(_response.body.data).toHaveLength(0);
			});

			test('should filter users by field: firstName', async () => {
				const response = await ownerAgent
					.get('/users')
					.query(`filter={ "firstName": "${member.firstName}" }`)
					.expect(200);

				expect(response.body.data).toHaveLength(1);

				const [user] = response.body.data;

				expect(user.email).toBe(member.email);

				const _response = await ownerAgent
					.get('/users')
					.query('filter={ "firstName": "Non-Existing" }')
					.expect(200);

				expect(_response.body.data).toHaveLength(0);
			});

			test('should filter users by field: lastName', async () => {
				const response = await ownerAgent
					.get('/users')
					.query(`filter={ "lastName": "${member.lastName}" }`)
					.expect(200);

				expect(response.body.data).toHaveLength(1);

				const [user] = response.body.data;

				expect(user.email).toBe(member.email);

				const _response = await ownerAgent
					.get('/users')
					.query('filter={ "lastName": "Non-Existing" }')
					.expect(200);

				expect(_response.body.data).toHaveLength(0);
			});

			test('should filter users by computed field: isOwner', async () => {
				const response = await ownerAgent
					.get('/users')
					.query('filter={ "isOwner": true }')
					.expect(200);

				expect(response.body.data).toHaveLength(1);

				const [user] = response.body.data;

				expect(user.isOwner).toBe(true);

				const _response = await ownerAgent
					.get('/users')
					.query('filter={ "isOwner": false }')
					.expect(200);

				expect(_response.body.data).toHaveLength(2);

				const [_user] = _response.body.data;

				expect(_user.isOwner).toBe(false);
			});
		});

		describe('select', () => {
			test('should select user field: id', async () => {
				const response = await ownerAgent.get('/users').query('select=["id"]').expect(200);

				expect(response.body).toEqual({
					data: [
						{ id: expect.any(String) },
						{ id: expect.any(String) },
						{ id: expect.any(String) },
					],
				});
			});

			test('should select user field: email', async () => {
				const response = await ownerAgent.get('/users').query('select=["email"]').expect(200);

				expect(response.body).toEqual({
					data: [
						{ email: expect.any(String) },
						{ email: expect.any(String) },
						{ email: expect.any(String) },
					],
				});
			});

			test('should select user field: firstName', async () => {
				const response = await ownerAgent.get('/users').query('select=["firstName"]').expect(200);

				expect(response.body).toEqual({
					data: [
						{ firstName: expect.any(String) },
						{ firstName: expect.any(String) },
						{ firstName: expect.any(String) },
					],
				});
			});

			test('should select user field: lastName', async () => {
				const response = await ownerAgent.get('/users').query('select=["lastName"]').expect(200);

				expect(response.body).toEqual({
					data: [
						{ lastName: expect.any(String) },
						{ lastName: expect.any(String) },
						{ lastName: expect.any(String) },
					],
				});
			});
		});

		describe('take', () => {
			test('should return n users or less, without skip', async () => {
				const response = await ownerAgent.get('/users').query('take=2').expect(200);

				expect(response.body.data).toHaveLength(2);

				response.body.data.forEach(validateUser);

				const _response = await ownerAgent.get('/users').query('take=1').expect(200);

				expect(_response.body.data).toHaveLength(1);

				_response.body.data.forEach(validateUser);
			});

			test('should return n users or less, with skip', async () => {
				const response = await ownerAgent.get('/users').query('take=1&skip=1').expect(200);

				expect(response.body.data).toHaveLength(1);

				response.body.data.forEach(validateUser);
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
					.query('filter={ "isOwner": true }&select=["firstName"]&take=1')
					.expect(200);

				expect(response.body).toEqual({ data: [{ firstName: expect.any(String) }] });
			});
		});
	});
});

describe('DELETE /users/:id', () => {
	let owner: User;
	let member: User;
	let ownerAgent: SuperAgentTest;

	beforeAll(async () => {
		await testDb.truncate(['User']);

		owner = await createOwner();
		member = await createMember();
		ownerAgent = testServer.authAgentFor(owner);
	});

	test('should delete user and their resources', async () => {
		const savedWorkflow = await createWorkflow({ name: randomName() }, member);

		const savedCredential = await saveCredential(
			{ name: randomName(), type: '', data: {} },
			{ user: member, role: 'credential:owner' },
		);

		const response = await ownerAgent.delete(`/users/${member.id}`);

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual(SUCCESS_RESPONSE_BODY);

		const user = await Container.get(UserRepository).findOneBy({ id: member.id });

		const sharedWorkflow = await Container.get(SharedWorkflowRepository).findOne({
			relations: ['user'],
			where: { userId: member.id, role: 'workflow:owner' },
		});

		const sharedCredential = await Container.get(SharedCredentialsRepository).findOne({
			relations: ['user'],
			where: { userId: member.id, role: 'credential:owner' },
		});

		const workflow = await getWorkflowById(savedWorkflow.id);

		const credential = await getCredentialById(savedCredential.id);

		// @TODO: Include active workflow and check whether webhook has been removed

		expect(user).toBeNull();
		expect(sharedWorkflow).toBeNull();
		expect(sharedCredential).toBeNull();
		expect(workflow).toBeNull();
		expect(credential).toBeNull();

		// restore

		member = await createMember();
	});

	test('should delete user and transfer their resources', async () => {
		const [savedWorkflow, savedCredential] = await Promise.all([
			await createWorkflow({ name: randomName() }, member),
			await saveCredential(
				{ name: randomName(), type: '', data: {} },
				{
					user: member,
					role: 'credential:owner',
				},
			),
		]);

		const response = await ownerAgent.delete(`/users/${member.id}`).query({
			transferId: owner.id,
		});

		expect(response.statusCode).toBe(200);

		const [user, sharedWorkflow, sharedCredential] = await Promise.all([
			await Container.get(UserRepository).findOneBy({ id: member.id }),
			await Container.get(SharedWorkflowRepository).findOneOrFail({
				relations: ['workflow'],
				where: { userId: owner.id },
			}),
			await Container.get(SharedCredentialsRepository).findOneOrFail({
				relations: ['credentials'],
				where: { userId: owner.id },
			}),
		]);

		expect(user).toBeNull();
		expect(sharedWorkflow.workflow.id).toBe(savedWorkflow.id);
		expect(sharedCredential.credentials.id).toBe(savedCredential.id);
	});

	test('should fail to delete self', async () => {
		const response = await ownerAgent.delete(`/users/${owner.id}`);

		expect(response.statusCode).toBe(400);

		const user = await getUserById(owner.id);

		expect(user).toBeDefined();
	});

	test('should fail to delete if user to delete is transferee', async () => {
		const response = await ownerAgent.delete(`/users/${member.id}`).query({
			transferId: member.id,
		});

		expect(response.statusCode).toBe(400);

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

	const UNAUTHORIZED = 'Unauthorized';

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
			expect(response.body.message).toBe(
				'newRoleName must be one of the following values: global:admin, global:member',
			);
		});
	});

	describe('member', () => {
		test('should fail to demote owner to member', async () => {
			const response = await memberAgent.patch(`/users/${owner.id}/role`).send({
				newRoleName: 'global:member',
			});

			expect(response.statusCode).toBe(403);
			expect(response.body.message).toBe(UNAUTHORIZED);
		});

		test('should fail to demote owner to admin', async () => {
			const response = await memberAgent.patch(`/users/${owner.id}/role`).send({
				newRoleName: 'global:admin',
			});

			expect(response.statusCode).toBe(403);
			expect(response.body.message).toBe(UNAUTHORIZED);
		});

		test('should fail to demote admin to member', async () => {
			const response = await memberAgent.patch(`/users/${admin.id}/role`).send({
				newRoleName: 'global:member',
			});

			expect(response.statusCode).toBe(403);
			expect(response.body.message).toBe(UNAUTHORIZED);
		});

		test('should fail to promote other member to owner', async () => {
			const response = await memberAgent.patch(`/users/${otherMember.id}/role`).send({
				newRoleName: 'global:owner',
			});

			expect(response.statusCode).toBe(403);
			expect(response.body.message).toBe(UNAUTHORIZED);
		});

		test('should fail to promote other member to admin', async () => {
			const response = await memberAgent.patch(`/users/${otherMember.id}/role`).send({
				newRoleName: 'global:admin',
			});

			expect(response.statusCode).toBe(403);
			expect(response.body.message).toBe(UNAUTHORIZED);
		});

		test('should fail to promote self to admin', async () => {
			const response = await memberAgent.patch(`/users/${member.id}/role`).send({
				newRoleName: 'global:admin',
			});

			expect(response.statusCode).toBe(403);
			expect(response.body.message).toBe(UNAUTHORIZED);
		});

		test('should fail to promote self to owner', async () => {
			const response = await memberAgent.patch(`/users/${member.id}/role`).send({
				newRoleName: 'global:owner',
			});

			expect(response.statusCode).toBe(403);
			expect(response.body.message).toBe(UNAUTHORIZED);
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

			expect(user.role).toBe('global:member');

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

			expect(user.role).toBe('global:member');

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

			const user = await getUserById(admin.id);

			expect(user.role).toBe('global:admin');

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

			expect(user.role).toBe('global:admin');

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

			expect(user.role).toBe('global:member');

			// restore admin

			admin = await createAdmin();
			adminAgent = testServer.authAgentFor(admin);
		});
	});
});

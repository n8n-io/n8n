import type { SuperAgentTest } from 'supertest';

import { CredentialsEntity } from '@db/entities/CredentialsEntity';
import type { Role } from '@db/entities/Role';
import type { User } from '@db/entities/User';
import { WorkflowEntity } from '@db/entities/WorkflowEntity';

import Container from 'typedi';
import { UserRepository } from '@db/repositories/user.repository';
import { WorkflowRepository } from '@db/repositories/workflow.repository';
import { CredentialsRepository } from '@db/repositories/credentials.repository';
import { SharedCredentialsRepository } from '@db/repositories/sharedCredentials.repository';
import { SharedWorkflowRepository } from '@db/repositories/sharedWorkflow.repository';

import { mockInstance } from '../shared/mocking';
import { SUCCESS_RESPONSE_BODY } from './shared/constants';
import { randomCredentialPayload, randomName } from './shared/random';
import * as testDb from './shared/testDb';
import * as utils from './shared/utils/';
import { saveCredential } from './shared/db/credentials';
import { getAllRoles } from './shared/db/roles';
import { createAdmin, createMember, createOwner, createUser, getUserById } from './shared/db/users';
import { createWorkflow } from './shared/db/workflows';
import type { PublicUser } from '@/Interfaces';
import { InternalHooks } from '@/InternalHooks';
import { UsersController } from '@/controllers/users.controller';
import { ExternalHooks } from '@/ExternalHooks';
import { Logger } from '@/Logger';
import { ActiveWorkflowRunner } from '@/ActiveWorkflowRunner';

const { any } = expect;

let credentialOwnerRole: Role;
let globalMemberRole: Role;
let workflowOwnerRole: Role;

let owner: User;
let admin: User;
let otherAdmin: User;
let member: User;
let otherMember: User;

let authOwnerAgent: SuperAgentTest;
let authAdminAgent: SuperAgentTest;
let authMemberAgent: SuperAgentTest;
let authlessAgent: SuperAgentTest;

let usersCount: number;

mockInstance(InternalHooks);
mockInstance(ExternalHooks);
mockInstance(Logger);
mockInstance(ActiveWorkflowRunner);

const testServer = utils.setupTestServer({ endpointGroups: ['users'] });

beforeAll(async () => {
	const [_, fetchedGlobalMemberRole, fetchedWorkflowOwnerRole, fetchedCredentialOwnerRole] =
		await getAllRoles();

	credentialOwnerRole = fetchedCredentialOwnerRole;
	globalMemberRole = fetchedGlobalMemberRole;
	workflowOwnerRole = fetchedWorkflowOwnerRole;

	usersCount = [owner, admin, otherAdmin, member, otherMember].length;
});

beforeEach(async () => {
	jest.resetAllMocks();
	await testDb.truncate(['User', 'SharedCredentials', 'SharedWorkflow', 'Workflow', 'Credentials']);
	owner = await createOwner();
	member = await createMember();
	otherMember = await createMember();
	admin = await createAdmin();
	otherAdmin = await createAdmin();
	authOwnerAgent = testServer.authAgentFor(owner);
	authAdminAgent = testServer.authAgentFor(admin);
	authMemberAgent = testServer.authAgentFor(member);
	authlessAgent = testServer.authlessAgent;
});

const validatePublicUser = (user: PublicUser) => {
	expect(typeof user.id).toBe('string');
	expect(user.email).toBeDefined();
	expect(user.firstName).toBeDefined();
	expect(user.lastName).toBeDefined();
	expect(typeof user.isOwner).toBe('boolean');
	expect(user.isPending).toBe(false);
	expect(user.signInType).toBe('email');
	expect(user.settings).toBe(null);
	expect(user.personalizationAnswers).toBeNull();
	expect(user.password).toBeUndefined();
	expect(user.globalRole).toBeDefined();
};

describe('GET /users', () => {
	test('should return all users', async () => {
		const response = await authOwnerAgent.get('/users').expect(200);

		expect(response.body.data).toHaveLength(usersCount);

		response.body.data.forEach(validatePublicUser);
	});

	describe('filter', () => {
		test('should filter users by field: email', async () => {
			const secondMember = await createMember();

			const response = await authOwnerAgent
				.get('/users')
				.query(`filter={ "email": "${secondMember.email}" }`)
				.expect(200);

			expect(response.body.data).toHaveLength(1);

			const [user] = response.body.data;

			expect(user.email).toBe(secondMember.email);

			const _response = await testServer
				.authAgentFor(owner)
				.get('/users')
				.query('filter={ "email": "non@existing.com" }')
				.expect(200);

			expect(_response.body.data).toHaveLength(0);
		});

		test('should filter users by field: firstName', async () => {
			const secondMember = await createMember();

			const response = await authOwnerAgent
				.get('/users')
				.query(`filter={ "firstName": "${secondMember.firstName}" }`)
				.expect(200);

			expect(response.body.data).toHaveLength(1);

			const [user] = response.body.data;

			expect(user.email).toBe(secondMember.email);

			const _response = await testServer
				.authAgentFor(owner)
				.get('/users')
				.query('filter={ "firstName": "Non-Existing" }')
				.expect(200);

			expect(_response.body.data).toHaveLength(0);
		});

		test('should filter users by field: lastName', async () => {
			const secondMember = await createMember();

			const response = await authOwnerAgent
				.get('/users')
				.query(`filter={ "lastName": "${secondMember.lastName}" }`)
				.expect(200);

			expect(response.body.data).toHaveLength(1);

			const [user] = response.body.data;

			expect(user.email).toBe(secondMember.email);

			const _response = await authOwnerAgent
				.get('/users')
				.query('filter={ "lastName": "Non-Existing" }')
				.expect(200);

			expect(_response.body.data).toHaveLength(0);
		});

		test('should filter users by computed field: isOwner', async () => {
			const response = await authOwnerAgent
				.get('/users')
				.query('filter={ "isOwner": true }')
				.expect(200);

			expect(response.body.data).toHaveLength(1);

			const [user] = response.body.data;

			expect(user.isOwner).toBe(true);

			const _response = await testServer
				.authAgentFor(owner)
				.get('/users')
				.query('filter={ "isOwner": false }')
				.expect(200);

			expect(_response.body.data).toHaveLength(usersCount - 1);

			const [_user] = _response.body.data;

			expect(_user.isOwner).toBe(false);
		});
	});

	describe('select', () => {
		test('should select user field: id', async () => {
			const response = await authOwnerAgent.get('/users').query('select=["id"]').expect(200);

			expect(response.body).toEqual({
				data: new Array(usersCount).fill({ id: any(String) }),
			});
		});

		test('should select user field: email', async () => {
			const response = await authOwnerAgent.get('/users').query('select=["email"]').expect(200);

			expect(response.body).toEqual({
				data: new Array(usersCount).fill({ email: any(String) }),
			});
		});

		test('should select user field: firstName', async () => {
			const response = await authOwnerAgent.get('/users').query('select=["firstName"]').expect(200);

			expect(response.body).toEqual({
				data: new Array(usersCount).fill({ firstName: any(String) }),
			});
		});

		test('should select user field: lastName', async () => {
			const response = await authOwnerAgent.get('/users').query('select=["lastName"]').expect(200);

			expect(response.body).toEqual({
				data: new Array(usersCount).fill({ lastName: any(String) }),
			});
		});
	});

	describe('take', () => {
		test('should return n users or less, without skip', async () => {
			const response = await authOwnerAgent.get('/users').query('take=2').expect(200);

			expect(response.body.data).toHaveLength(2);

			response.body.data.forEach(validatePublicUser);

			const _response = await authOwnerAgent.get('/users').query('take=1').expect(200);

			expect(_response.body.data).toHaveLength(1);

			_response.body.data.forEach(validatePublicUser);
		});

		test('should return n users or less, with skip', async () => {
			const response = await authOwnerAgent.get('/users').query('take=1&skip=1').expect(200);

			expect(response.body.data).toHaveLength(1);

			response.body.data.forEach(validatePublicUser);
		});
	});

	describe('combinations', () => {
		test('should support options that require auxiliary fields', async () => {
			// isOwner requires globalRole
			// id-less select with take requires id

			const response = await authOwnerAgent
				.get('/users')
				.query('filter={ "isOwner": true }&select=["firstName"]&take=10')
				.expect(200);

			expect(response.body).toEqual({ data: [{ firstName: any(String) }] });
		});
	});
});

describe('DELETE /users/:id', () => {
	test('should delete the user', async () => {
		const newWorkflow = new WorkflowEntity();

		Object.assign(newWorkflow, {
			name: randomName(),
			active: false,
			connections: {},
			nodes: [],
		});

		const savedWorkflow = await Container.get(WorkflowRepository).save(newWorkflow);

		await Container.get(SharedWorkflowRepository).save({
			role: workflowOwnerRole,
			user: member,
			workflow: savedWorkflow,
		});

		const newCredential = new CredentialsEntity();

		Object.assign(newCredential, {
			name: randomName(),
			data: '',
			type: '',
			nodesAccess: [],
		});

		const savedCredential = await Container.get(CredentialsRepository).save(newCredential);

		await Container.get(SharedCredentialsRepository).save({
			role: credentialOwnerRole,
			user: member,
			credentials: savedCredential,
		});

		const response = await authOwnerAgent.delete(`/users/${member.id}`);

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual(SUCCESS_RESPONSE_BODY);

		const user = await Container.get(UserRepository).findOneBy({ id: member.id });
		expect(user).toBeNull(); // deleted

		const sharedWorkflow = await Container.get(SharedWorkflowRepository).findOne({
			relations: ['user'],
			where: { userId: member.id, roleId: workflowOwnerRole.id },
		});
		expect(sharedWorkflow).toBeNull(); // deleted

		const sharedCredential = await Container.get(SharedCredentialsRepository).findOne({
			relations: ['user'],
			where: { userId: member.id, roleId: credentialOwnerRole.id },
		});
		expect(sharedCredential).toBeNull(); // deleted

		const workflow = await Container.get(WorkflowRepository).findOneBy({ id: savedWorkflow.id });
		expect(workflow).toBeNull(); // deleted

		// TODO: Include active workflow and check whether webhook has been removed

		const credential = await Container.get(CredentialsRepository).findOneBy({
			id: savedCredential.id,
		});
		expect(credential).toBeNull(); // deleted
	});

	test('should fail to delete self', async () => {
		const response = await authOwnerAgent.delete(`/users/${owner.id}`);

		expect(response.statusCode).toBe(400);

		const user = await Container.get(UserRepository).findOneBy({ id: owner.id });
		expect(user).toBeDefined();
	});

	test('should fail if user to delete is transferee', async () => {
		const { id: idToDelete } = await createUser({ globalRole: globalMemberRole });

		const response = await authOwnerAgent.delete(`/users/${idToDelete}`).query({
			transferId: idToDelete,
		});

		expect(response.statusCode).toBe(400);

		const user = await Container.get(UserRepository).findOneBy({ id: idToDelete });
		expect(user).toBeDefined();
	});

	test('with transferId should perform transfer', async () => {
		const userToDelete = await createUser({ globalRole: globalMemberRole });

		const savedWorkflow = await createWorkflow(undefined, userToDelete);

		const savedCredential = await saveCredential(randomCredentialPayload(), {
			user: userToDelete,
			role: credentialOwnerRole,
		});

		const response = await authOwnerAgent.delete(`/users/${userToDelete.id}`).query({
			transferId: owner.id,
		});

		expect(response.statusCode).toBe(200);

		const sharedWorkflow = await Container.get(SharedWorkflowRepository).findOneOrFail({
			relations: ['workflow'],
			where: { userId: owner.id },
		});

		expect(sharedWorkflow.workflow).toBeDefined();
		expect(sharedWorkflow.workflow.id).toBe(savedWorkflow.id);

		const sharedCredential = await Container.get(SharedCredentialsRepository).findOneOrFail({
			relations: ['credentials'],
			where: { userId: owner.id },
		});

		expect(sharedCredential.credentials).toBeDefined();
		expect(sharedCredential.credentials.id).toBe(savedCredential.id);

		const deletedUser = await Container.get(UserRepository).findOneBy({ id: userToDelete.id });

		expect(deletedUser).toBeNull();
	});
});

describe('PATCH /users/:id/role', () => {
	const {
		NO_MEMBER,
		MISSING_NEW_ROLE_KEY,
		MISSING_NEW_ROLE_VALUE,
		NO_ADMIN_ON_OWNER,
		NO_ADMIN_TO_OWNER,
		NO_USER,
		NO_OWNER_ON_OWNER,
	} = UsersController.ERROR_MESSAGES.CHANGE_ROLE;

	describe('unauthenticated user', () => {
		test('should receive 401', async () => {
			const response = await authlessAgent.patch(`/users/${member.id}/role`).send({
				newRole: { scope: 'global', name: 'admin' },
			});

			expect(response.statusCode).toBe(401);
		});
	});

	describe('member', () => {
		test('should fail to demote owner to member', async () => {
			const response = await authMemberAgent.patch(`/users/${owner.id}/role`).send({
				newRole: { scope: 'global', name: 'member' },
			});

			expect(response.statusCode).toBe(403);
			expect(response.body.message).toBe(NO_MEMBER);
		});

		test('should fail to demote owner to admin', async () => {
			const response = await authMemberAgent.patch(`/users/${owner.id}/role`).send({
				newRole: { scope: 'global', name: 'admin' },
			});

			expect(response.statusCode).toBe(403);
			expect(response.body.message).toBe(NO_MEMBER);
		});

		test('should fail to demote admin to member', async () => {
			const response = await authMemberAgent.patch(`/users/${admin.id}/role`).send({
				newRole: { scope: 'global', name: 'member' },
			});

			expect(response.statusCode).toBe(403);
			expect(response.body.message).toBe(NO_MEMBER);
		});

		test('should fail to promote other member to owner', async () => {
			const response = await authMemberAgent.patch(`/users/${otherMember.id}/role`).send({
				newRole: { scope: 'global', name: 'owner' },
			});

			expect(response.statusCode).toBe(403);
			expect(response.body.message).toBe(NO_MEMBER);
		});

		test('should fail to promote other member to admin', async () => {
			const response = await authMemberAgent.patch(`/users/${otherMember.id}/role`).send({
				newRole: { scope: 'global', name: 'admin' },
			});

			expect(response.statusCode).toBe(403);
			expect(response.body.message).toBe(NO_MEMBER);
		});

		test('should fail to promote self to admin', async () => {
			const response = await authMemberAgent.patch(`/users/${member.id}/role`).send({
				newRole: { scope: 'global', name: 'admin' },
			});

			expect(response.statusCode).toBe(403);
			expect(response.body.message).toBe(NO_MEMBER);
		});

		test('should fail to promote self to owner', async () => {
			const response = await authMemberAgent.patch(`/users/${member.id}/role`).send({
				newRole: { scope: 'global', name: 'owner' },
			});

			expect(response.statusCode).toBe(403);
			expect(response.body.message).toBe(NO_MEMBER);
		});
	});

	describe('admin', () => {
		test('should receive 400 on invalid payload', async () => {
			const response = await authAdminAgent.patch(`/users/${member.id}/role`).send({});

			expect(response.statusCode).toBe(400);
			expect(response.body.message).toBe(MISSING_NEW_ROLE_KEY);

			const _response = await authAdminAgent.patch(`/users/${member.id}/role`).send({
				newRole: {},
			});

			expect(_response.statusCode).toBe(400);
			expect(_response.body.message).toBe(MISSING_NEW_ROLE_VALUE);
		});

		test('should receive 404 on unknown target user', async () => {
			const response = await authAdminAgent
				.patch('/users/c2317ff3-7a9f-4fd4-ad2b-7331f6359260/role')
				.send({
					newRole: { scope: 'global', name: 'member' },
				});

			expect(response.statusCode).toBe(404);
			expect(response.body.message).toBe(NO_USER);
		});

		test('should fail to demote owner to admin', async () => {
			const response = await authAdminAgent.patch(`/users/${owner.id}/role`).send({
				newRole: { scope: 'global', name: 'admin' },
			});

			expect(response.statusCode).toBe(403);
			expect(response.body.message).toBe(NO_ADMIN_ON_OWNER);
		});

		test('should fail to demote owner to member', async () => {
			const response = await authAdminAgent.patch(`/users/${owner.id}/role`).send({
				newRole: { scope: 'global', name: 'member' },
			});

			expect(response.statusCode).toBe(403);
			expect(response.body.message).toBe(NO_ADMIN_ON_OWNER);
		});

		test('should fail to promote member to owner', async () => {
			const response = await authAdminAgent.patch(`/users/${member.id}/role`).send({
				newRole: { scope: 'global', name: 'owner' },
			});

			expect(response.statusCode).toBe(403);
			expect(response.body.message).toBe(NO_ADMIN_TO_OWNER);
		});

		test('should fail to promote admin to owner', async () => {
			const response = await authAdminAgent.patch(`/users/${member.id}/role`).send({
				newRole: { scope: 'global', name: 'owner' },
			});

			expect(response.statusCode).toBe(403);
			expect(response.body.message).toBe(NO_ADMIN_TO_OWNER);
		});

		test('should be able to demote admin to member', async () => {
			const response = await authAdminAgent.patch(`/users/${otherAdmin.id}/role`).send({
				newRole: { scope: 'global', name: 'member' },
			});

			expect(response.statusCode).toBe(200);
			expect(response.body.data).toStrictEqual({ success: true });

			const user = await getUserById(otherAdmin.id);

			expect(user.globalRole.scope).toBe('global');
			expect(user.globalRole.name).toBe('member');
		});

		test('should be able to demote self to member', async () => {
			const response = await authAdminAgent.patch(`/users/${admin.id}/role`).send({
				newRole: { scope: 'global', name: 'member' },
			});

			expect(response.statusCode).toBe(200);
			expect(response.body.data).toStrictEqual({ success: true });

			const user = await getUserById(admin.id);

			expect(user.globalRole.scope).toBe('global');
			expect(user.globalRole.name).toBe('member');
		});

		test('should be able to promote member to admin', async () => {
			const response = await authAdminAgent.patch(`/users/${member.id}/role`).send({
				newRole: { scope: 'global', name: 'admin' },
			});

			expect(response.statusCode).toBe(200);
			expect(response.body.data).toStrictEqual({ success: true });

			const user = await getUserById(admin.id);

			expect(user.globalRole.scope).toBe('global');
			expect(user.globalRole.name).toBe('admin');
		});
	});

	describe('owner', () => {
		test('should be able to promote member to admin', async () => {
			const response = await authOwnerAgent.patch(`/users/${member.id}/role`).send({
				newRole: { scope: 'global', name: 'admin' },
			});

			expect(response.statusCode).toBe(200);
			expect(response.body.data).toStrictEqual({ success: true });

			const user = await getUserById(admin.id);

			expect(user.globalRole.scope).toBe('global');
			expect(user.globalRole.name).toBe('admin');
		});

		test('should be able to demote admin to member', async () => {
			const response = await authOwnerAgent.patch(`/users/${admin.id}/role`).send({
				newRole: { scope: 'global', name: 'member' },
			});

			expect(response.statusCode).toBe(200);
			expect(response.body.data).toStrictEqual({ success: true });

			const user = await getUserById(admin.id);

			expect(user.globalRole.scope).toBe('global');
			expect(user.globalRole.name).toBe('member');
		});

		test('should fail to demote self to admin', async () => {
			const response = await authOwnerAgent.patch(`/users/${owner.id}/role`).send({
				newRole: { scope: 'global', name: 'admin' },
			});

			expect(response.statusCode).toBe(403);
			expect(response.body.message).toBe(NO_OWNER_ON_OWNER);
		});

		test('should fail to demote self to member', async () => {
			const response = await authOwnerAgent.patch(`/users/${owner.id}/role`).send({
				newRole: { scope: 'global', name: 'member' },
			});

			expect(response.statusCode).toBe(403);
			expect(response.body.message).toBe(NO_OWNER_ON_OWNER);
		});
	});
});

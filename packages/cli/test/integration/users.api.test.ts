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
import { createMember, createOwner, createUser } from './shared/db/users';
import { createWorkflow } from './shared/db/workflows';
import type { PublicUser } from '@/Interfaces';
import { InternalHooks } from '@/InternalHooks';

const { any } = expect;

let credentialOwnerRole: Role;
let globalMemberRole: Role;
let workflowOwnerRole: Role;

let owner: User;
let member: User;
let authOwnerAgent: SuperAgentTest;
let authlessAgent: SuperAgentTest;

mockInstance(InternalHooks);

const testServer = utils.setupTestServer({ endpointGroups: ['users'] });

type UserInvitationResponse = {
	user: Pick<User, 'id' | 'email'> & { inviteAcceptUrl: string; emailSent: boolean };
	error?: string;
};

beforeAll(async () => {
	const [_, fetchedGlobalMemberRole, fetchedWorkflowOwnerRole, fetchedCredentialOwnerRole] =
		await getAllRoles();

	credentialOwnerRole = fetchedCredentialOwnerRole;
	globalMemberRole = fetchedGlobalMemberRole;
	workflowOwnerRole = fetchedWorkflowOwnerRole;
});

beforeEach(async () => {
	jest.resetAllMocks();
	await testDb.truncate(['User', 'SharedCredentials', 'SharedWorkflow', 'Workflow', 'Credentials']);
	owner = await createOwner();
	member = await createMember();
	authOwnerAgent = testServer.authAgentFor(owner);
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

		expect(response.body.data).toHaveLength(2);

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

			expect(_response.body.data).toHaveLength(1);

			const [_user] = _response.body.data;

			expect(_user.isOwner).toBe(false);
		});
	});

	describe('select', () => {
		test('should select user field: id', async () => {
			const response = await authOwnerAgent.get('/users').query('select=["id"]').expect(200);

			expect(response.body).toEqual({
				data: [{ id: any(String) }, { id: any(String) }],
			});
		});

		test('should select user field: email', async () => {
			const response = await authOwnerAgent.get('/users').query('select=["email"]').expect(200);

			expect(response.body).toEqual({
				data: [{ email: any(String) }, { email: any(String) }],
			});
		});

		test('should select user field: firstName', async () => {
			const response = await authOwnerAgent.get('/users').query('select=["firstName"]').expect(200);

			expect(response.body).toEqual({
				data: [{ firstName: any(String) }, { firstName: any(String) }],
			});
		});

		test('should select user field: lastName', async () => {
			const response = await authOwnerAgent.get('/users').query('select=["lastName"]').expect(200);

			expect(response.body).toEqual({
				data: [{ lastName: any(String) }, { lastName: any(String) }],
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

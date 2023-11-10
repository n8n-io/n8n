import validator from 'validator';
import type { SuperAgentTest } from 'supertest';

import { CredentialsEntity } from '@db/entities/CredentialsEntity';
import type { Role } from '@db/entities/Role';
import type { User } from '@db/entities/User';
import { WorkflowEntity } from '@db/entities/WorkflowEntity';
import { compareHash } from '@/UserManagement/UserManagementHelper';
import { UserManagementMailer } from '@/UserManagement/email/UserManagementMailer';

import Container from 'typedi';
import { UserRepository } from '@db/repositories/user.repository';
import { WorkflowRepository } from '@db/repositories/workflow.repository';
import { CredentialsRepository } from '@db/repositories/credentials.repository';
import { SharedCredentialsRepository } from '@db/repositories/sharedCredentials.repository';
import { SharedWorkflowRepository } from '@db/repositories/sharedWorkflow.repository';

import { mockInstance } from '../shared/mocking';
import { SUCCESS_RESPONSE_BODY } from './shared/constants';
import {
	randomCredentialPayload,
	randomEmail,
	randomInvalidPassword,
	randomName,
	randomValidPassword,
} from './shared/random';
import * as testDb from './shared/testDb';
import * as utils from './shared/utils/';
import { saveCredential } from './shared/db/credentials';
import { getAllRoles } from './shared/db/roles';
import { createMember, createOwner, createUser, createUserShell } from './shared/db/users';
import { createWorkflow } from './shared/db/workflows';
import type { PublicUser } from '@/Interfaces';
import { ExternalHooks } from '@/ExternalHooks';
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
const externalHooks = mockInstance(ExternalHooks);
const mailer = mockInstance(UserManagementMailer, { isEmailSetUp: true });

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

const assertInviteUserSuccessResponse = (data: UserInvitationResponse) => {
	expect(validator.isUUID(data.user.id)).toBe(true);
	expect(data.user.inviteAcceptUrl).toBeUndefined();
	expect(data.user.email).toBeDefined();
	expect(data.user.emailSent).toBe(true);
};

const assertInviteUserErrorResponse = (data: UserInvitationResponse) => {
	expect(validator.isUUID(data.user.id)).toBe(true);
	expect(data.user.inviteAcceptUrl).toBeDefined();
	expect(data.user.email).toBeDefined();
	expect(data.user.emailSent).toBe(false);
	expect(data.error).toBeDefined();
};

const assertInvitedUsersOnDb = (user: User) => {
	expect(user.firstName).toBeNull();
	expect(user.lastName).toBeNull();
	expect(user.personalizationAnswers).toBeNull();
	expect(user.password).toBeNull();
	expect(user.isPending).toBe(true);
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

describe('POST /users/:id', () => {
	test('should fill out a user shell', async () => {
		const memberShell = await createUserShell(globalMemberRole);

		const memberData = {
			inviterId: owner.id,
			firstName: randomName(),
			lastName: randomName(),
			password: randomValidPassword(),
		};

		const response = await authlessAgent.post(`/users/${memberShell.id}`).send(memberData);

		const {
			id,
			email,
			firstName,
			lastName,
			personalizationAnswers,
			password,
			globalRole,
			isPending,
			apiKey,
		} = response.body.data;

		expect(validator.isUUID(id)).toBe(true);
		expect(email).toBeDefined();
		expect(firstName).toBe(memberData.firstName);
		expect(lastName).toBe(memberData.lastName);
		expect(personalizationAnswers).toBeNull();
		expect(password).toBeUndefined();
		expect(isPending).toBe(false);
		expect(globalRole).toBeDefined();
		expect(apiKey).not.toBeDefined();

		const authToken = utils.getAuthToken(response);
		expect(authToken).toBeDefined();

		const member = await Container.get(UserRepository).findOneByOrFail({ id: memberShell.id });
		expect(member.firstName).toBe(memberData.firstName);
		expect(member.lastName).toBe(memberData.lastName);
		expect(member.password).not.toBe(memberData.password);
	});

	test('should fail with invalid inputs', async () => {
		const memberShellEmail = randomEmail();

		const memberShell = await Container.get(UserRepository).save({
			email: memberShellEmail,
			globalRole: globalMemberRole,
		});

		const invalidPayloads = [
			{
				firstName: randomName(),
				lastName: randomName(),
				password: randomValidPassword(),
			},
			{
				inviterId: owner.id,
				firstName: randomName(),
				password: randomValidPassword(),
			},
			{
				inviterId: owner.id,
				firstName: randomName(),
				password: randomValidPassword(),
			},
			{
				inviterId: owner.id,
				firstName: randomName(),
				lastName: randomName(),
			},
			{
				inviterId: owner.id,
				firstName: randomName(),
				lastName: randomName(),
				password: randomInvalidPassword(),
			},
		];

		for (const invalidPayload of invalidPayloads) {
			const response = await authlessAgent.post(`/users/${memberShell.id}`).send(invalidPayload);
			expect(response.statusCode).toBe(400);

			const storedUser = await Container.get(UserRepository).findOneOrFail({
				where: { email: memberShellEmail },
			});

			expect(storedUser.firstName).toBeNull();
			expect(storedUser.lastName).toBeNull();
			expect(storedUser.password).toBeNull();
		}
	});

	test('should fail with already accepted invite', async () => {
		const member = await createUser({ globalRole: globalMemberRole });

		const newMemberData = {
			inviterId: owner.id,
			firstName: randomName(),
			lastName: randomName(),
			password: randomValidPassword(),
		};

		const response = await authlessAgent.post(`/users/${member.id}`).send(newMemberData);

		expect(response.statusCode).toBe(400);

		const storedMember = await Container.get(UserRepository).findOneOrFail({
			where: { email: member.email },
		});
		expect(storedMember.firstName).not.toBe(newMemberData.firstName);
		expect(storedMember.lastName).not.toBe(newMemberData.lastName);

		const comparisonResult = await compareHash(member.password, storedMember.password);
		expect(comparisonResult).toBe(false);
		expect(storedMember.password).not.toBe(newMemberData.password);
	});
});

describe('POST /users', () => {
	test('should fail with invalid inputs', async () => {
		const invalidPayloads = [
			randomEmail(),
			[randomEmail()],
			{},
			[{ name: randomName() }],
			[{ email: randomName() }],
		];

		await Promise.all(
			invalidPayloads.map(async (invalidPayload) => {
				const response = await authOwnerAgent.post('/users').send(invalidPayload);
				expect(response.statusCode).toBe(400);

				const users = await Container.get(UserRepository).find();
				expect(users.length).toBe(2); // DB unaffected
			}),
		);
	});

	test('should ignore an empty payload', async () => {
		const response = await authOwnerAgent.post('/users').send([]);

		const { data } = response.body;

		expect(response.statusCode).toBe(200);
		expect(Array.isArray(data)).toBe(true);
		expect(data.length).toBe(0);

		const users = await Container.get(UserRepository).find();
		expect(users.length).toBe(2);
	});

	test('should succeed if emailing is not set up', async () => {
		mailer.invite.mockResolvedValueOnce({ emailSent: false });
		const usersToInvite = randomEmail();
		const response = await authOwnerAgent.post('/users').send([{ email: usersToInvite }]);

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toBeInstanceOf(Array);
		expect(response.body.data.length).toBe(1);
		const { user } = response.body.data[0];
		expect(user.inviteAcceptUrl).toBeDefined();
		const inviteUrl = new URL(user.inviteAcceptUrl);
		expect(inviteUrl.searchParams.get('inviterId')).toBe(owner.id);
		expect(inviteUrl.searchParams.get('inviteeId')).toBe(user.id);
	});

	test('should email invites and create user shells but ignore existing', async () => {
		const internalHooks = Container.get(InternalHooks);

		mailer.invite.mockImplementation(async () => ({ emailSent: true }));

		const memberShell = await createUserShell(globalMemberRole);

		const newUser = randomEmail();

		const shellUsers = [memberShell.email];
		const usersToInvite = [newUser, ...shellUsers];
		const usersToCreate = [newUser];
		const existingUsers = [member.email];

		const testEmails = [...usersToInvite, ...existingUsers];

		const payload = testEmails.map((email) => ({ email }));

		const response = await authOwnerAgent.post('/users').send(payload);

		expect(response.statusCode).toBe(200);

		expect(internalHooks.onUserTransactionalEmail).toHaveBeenCalledTimes(usersToInvite.length);

		expect(externalHooks.run).toHaveBeenCalledTimes(1);
		const [hookName, hookData] = externalHooks.run.mock.calls[0];
		expect(hookName).toBe('user.invited');
		expect(hookData?.[0]).toStrictEqual(usersToCreate);

		for (const invitationResponse of response.body.data as UserInvitationResponse[]) {
			const storedUser = await Container.get(UserRepository).findOneByOrFail({
				id: invitationResponse.user.id,
			});

			assertInviteUserSuccessResponse(invitationResponse);

			assertInvitedUsersOnDb(storedUser);
		}

		for (const [onUserTransactionalEmailParameter] of internalHooks.onUserTransactionalEmail.mock
			.calls) {
			expect(onUserTransactionalEmailParameter.user_id).toBeDefined();
			expect(onUserTransactionalEmailParameter.message_type).toBe('New user invite');
			expect(onUserTransactionalEmailParameter.public_api).toBe(false);
		}
	});

	test('should return error when invite method throws an error', async () => {
		const error = 'failed to send email';

		mailer.invite.mockImplementation(async () => {
			throw new Error(error);
		});

		const newUser = randomEmail();

		const usersToCreate = [newUser];

		const payload = usersToCreate.map((email) => ({ email }));

		const response = await authOwnerAgent.post('/users').send(payload);

		expect(response.body.data).toBeInstanceOf(Array);
		expect(response.body.data.length).toBe(1);
		expect(response.statusCode).toBe(200);
		const invitationResponse = response.body.data[0];

		assertInviteUserErrorResponse(invitationResponse);
	});
});

describe('POST /users/:id/reinvite', () => {
	test('should send reinvite, but fail if user already accepted invite', async () => {
		mailer.invite.mockImplementation(async () => ({ emailSent: true }));

		const email = randomEmail();
		const payload = [{ email }];
		const response = await authOwnerAgent.post('/users').send(payload);

		expect(response.statusCode).toBe(200);

		const { data } = response.body;
		const invitedUserId = data[0].user.id;
		const reinviteResponse = await authOwnerAgent.post(`/users/${invitedUserId}/reinvite`);

		expect(reinviteResponse.statusCode).toBe(200);

		const member = await createMember();
		const reinviteMemberResponse = await authOwnerAgent.post(`/users/${member.id}/reinvite`);

		expect(reinviteMemberResponse.statusCode).toBe(400);
	});
});

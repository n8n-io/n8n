import validator from 'validator';
import type { SuperAgentTest } from 'supertest';

import type { Role } from '@db/entities/Role';
import type { User } from '@db/entities/User';
import { compareHash } from '@/UserManagement/UserManagementHelper';
import { UserManagementMailer } from '@/UserManagement/email/UserManagementMailer';

import Container from 'typedi';
import { UserRepository } from '@db/repositories/user.repository';

import { mockInstance } from '../shared/mocking';
import {
	randomEmail,
	randomInvalidPassword,
	randomName,
	randomValidPassword,
} from './shared/random';
import * as testDb from './shared/testDb';
import * as utils from './shared/utils/';
import { getAllRoles } from './shared/db/roles';
import { createMember, createOwner, createUser, createUserShell } from './shared/db/users';
import { ExternalHooks } from '@/ExternalHooks';
import { InternalHooks } from '@/InternalHooks';

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

const testServer = utils.setupTestServer({ endpointGroups: ['invitations'] });

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

describe('POST /invitations/:id/accept', () => {
	test('should fill out a user shell', async () => {
		const memberShell = await createUserShell(globalMemberRole);

		const memberData = {
			inviterId: owner.id,
			firstName: randomName(),
			lastName: randomName(),
			password: randomValidPassword(),
		};

		const response = await authlessAgent
			.post(
				`/invitations/${memberShell.id}/
		accept`,
			)
			.send(memberData);

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
			const response = await authlessAgent
				.post(`/invitations/${memberShell.id}/accept`)
				.send(invalidPayload);
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

		const response = await authlessAgent
			.post(`/invitations/${member.id}/accept`)
			.send(newMemberData);

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

describe('POST /invitations', () => {
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
				const response = await authOwnerAgent.post('/invitations').send(invalidPayload);
				expect(response.statusCode).toBe(400);

				const users = await Container.get(UserRepository).find();
				expect(users.length).toBe(2); // DB unaffected
			}),
		);
	});

	test('should ignore an empty payload', async () => {
		const response = await authOwnerAgent.post('/invitations').send([]);

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
		const response = await authOwnerAgent.post('/invitations').send([{ email: usersToInvite }]);

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

		const response = await authOwnerAgent.post('/invitations').send(payload);

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

		const response = await authOwnerAgent.post('/invitations').send(payload);

		expect(response.body.data).toBeInstanceOf(Array);
		expect(response.body.data.length).toBe(1);
		expect(response.statusCode).toBe(200);
		const invitationResponse = response.body.data[0];

		assertInviteUserErrorResponse(invitationResponse);
	});
});

import validator from 'validator';
import type { SuperAgentTest } from 'supertest';

import type { User } from '@db/entities/User';
import { PasswordUtility } from '@/services/password.utility';
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
import { getGlobalAdminRole, getGlobalMemberRole } from './shared/db/roles';
import { createMember, createOwner, createUser, createUserShell } from './shared/db/users';
import { ExternalHooks } from '@/ExternalHooks';
import { InternalHooks } from '@/InternalHooks';
import type { UserInvitationResponse } from './shared/utils/users';
import {
	assertInviteUserSuccessResponse,
	assertInvitedUsersOnDb,
	assertInviteUserErrorResponse,
} from './shared/utils/users';
import { mocked } from 'jest-mock';
import { License } from '@/License';

mockInstance(InternalHooks);

const license = mockInstance(License, {
	isAdvancedPermissionsLicensed: jest.fn().mockReturnValue(true),
	isWithinUsersLimit: jest.fn().mockReturnValue(true),
});

const externalHooks = mockInstance(ExternalHooks);
const mailer = mockInstance(UserManagementMailer, { isEmailSetUp: true });

const testServer = utils.setupTestServer({ endpointGroups: ['invitations'] });

describe('POST /invitations/:id/accept', () => {
	let owner: User;

	let authlessAgent: SuperAgentTest;

	beforeAll(async () => {
		await testDb.truncate(['User']);

		owner = await createOwner();

		authlessAgent = testServer.authlessAgent;
	});

	test('should fill out a member shell', async () => {
		const globalMemberRole = await getGlobalMemberRole();
		const memberShell = await createUserShell(globalMemberRole);

		const memberData = {
			inviterId: owner.id,
			firstName: randomName(),
			lastName: randomName(),
			password: randomValidPassword(),
		};

		const response = await authlessAgent
			.post(`/invitations/${memberShell.id}/accept`)
			.send(memberData)
			.expect(200);

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
			globalScopes,
		} = response.body.data;

		expect(validator.isUUID(id)).toBe(true);
		expect(email).toBeDefined();
		expect(firstName).toBe(memberData.firstName);
		expect(lastName).toBe(memberData.lastName);
		expect(personalizationAnswers).toBeNull();
		expect(password).toBeUndefined();
		expect(isPending).toBe(false);
		expect(globalRole.scope).toBe('global');
		expect(globalRole.name).toBe('member');
		expect(apiKey).not.toBeDefined();
		expect(globalScopes).toBeDefined();
		expect(globalScopes).not.toHaveLength(0);

		const authToken = utils.getAuthToken(response);
		expect(authToken).toBeDefined();

		const storedMember = await Container.get(UserRepository).findOneByOrFail({
			id: memberShell.id,
		});

		expect(storedMember.firstName).toBe(memberData.firstName);
		expect(storedMember.lastName).toBe(memberData.lastName);
		expect(storedMember.password).not.toBe(memberData.password);
	});

	test('should fill out an admin shell', async () => {
		const globalAdminRole = await getGlobalAdminRole();
		const adminShell = await createUserShell(globalAdminRole);

		const memberData = {
			inviterId: owner.id,
			firstName: randomName(),
			lastName: randomName(),
			password: randomValidPassword(),
		};

		const response = await authlessAgent
			.post(`/invitations/${adminShell.id}/accept`)
			.send(memberData)
			.expect(200);

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
			globalScopes,
		} = response.body.data;

		expect(validator.isUUID(id)).toBe(true);
		expect(email).toBeDefined();
		expect(firstName).toBe(memberData.firstName);
		expect(lastName).toBe(memberData.lastName);
		expect(personalizationAnswers).toBeNull();
		expect(password).toBeUndefined();
		expect(isPending).toBe(false);
		expect(globalRole.scope).toBe('global');
		expect(globalRole.name).toBe('admin');
		expect(apiKey).not.toBeDefined();
		expect(globalScopes).toBeDefined();
		expect(globalScopes).not.toHaveLength(0);

		const authToken = utils.getAuthToken(response);
		expect(authToken).toBeDefined();

		const storedAdmin = await Container.get(UserRepository).findOneByOrFail({
			id: adminShell.id,
		});

		expect(storedAdmin.firstName).toBe(memberData.firstName);
		expect(storedAdmin.lastName).toBe(memberData.lastName);
		expect(storedAdmin.password).not.toBe(memberData.password);
	});

	test('should fail with invalid payloads', async () => {
		const memberShellEmail = randomEmail();

		const globalMemberRole = await getGlobalMemberRole();

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
			await authlessAgent
				.post(`/invitations/${memberShell.id}/accept`)
				.send(invalidPayload)
				.expect(400);

			const storedMemberShell = await Container.get(UserRepository).findOneOrFail({
				where: { email: memberShellEmail },
			});

			expect(storedMemberShell.firstName).toBeNull();
			expect(storedMemberShell.lastName).toBeNull();
			expect(storedMemberShell.password).toBeNull();
		}
	});

	test('should fail with already accepted invite', async () => {
		const globalMemberRole = await getGlobalMemberRole();
		const member = await createUser({ globalRole: globalMemberRole });

		const memberData = {
			inviterId: owner.id,
			firstName: randomName(),
			lastName: randomName(),
			password: randomValidPassword(),
		};

		await authlessAgent.post(`/invitations/${member.id}/accept`).send(memberData).expect(400);

		const storedMember = await Container.get(UserRepository).findOneOrFail({
			where: { email: member.email },
		});

		expect(storedMember.firstName).not.toBe(memberData.firstName);
		expect(storedMember.lastName).not.toBe(memberData.lastName);
		expect(storedMember.password).not.toBe(memberData.password);

		const comparisonResult = await Container.get(PasswordUtility).compare(
			member.password,
			storedMember.password,
		);

		expect(comparisonResult).toBe(false);
	});
});

describe('POST /invitations', () => {
	let owner: User;
	let member: User;
	let ownerAgent: SuperAgentTest;

	beforeAll(async () => {
		await testDb.truncate(['User']);

		owner = await createOwner();
		member = await createMember();
		ownerAgent = testServer.authAgentFor(owner);
	});

	test('should fail with invalid payloads', async () => {
		const invalidPayloads = [
			randomEmail(),
			[randomEmail()],
			{},
			[{ name: randomName() }],
			[{ email: randomName() }],
		];

		await Promise.all(
			invalidPayloads.map(async (invalidPayload) => {
				await ownerAgent.post('/invitations').send(invalidPayload).expect(400);

				const usersCount = await Container.get(UserRepository).count();

				expect(usersCount).toBe(2); // DB unaffected
			}),
		);
	});

	test('should return 200 on empty payload', async () => {
		const response = await ownerAgent.post('/invitations').send([]).expect(200);

		expect(response.body.data).toStrictEqual([]);

		const usersCount = await Container.get(UserRepository).count();

		expect(usersCount).toBe(2);
	});

	test('should return 200 if emailing is not set up', async () => {
		mailer.invite.mockResolvedValue({ emailSent: false });

		const response = await ownerAgent
			.post('/invitations')
			.send([{ email: randomEmail() }])
			.expect(200);

		expect(response.body.data).toBeInstanceOf(Array);
		expect(response.body.data.length).toBe(1);

		const { user } = response.body.data[0];

		expect(user.inviteAcceptUrl).toBeDefined();

		const inviteUrl = new URL(user.inviteAcceptUrl);

		expect(inviteUrl.searchParams.get('inviterId')).toBe(owner.id);
		expect(inviteUrl.searchParams.get('inviteeId')).toBe(user.id);
	});

	test('should create member shell', async () => {
		mailer.invite.mockResolvedValue({ emailSent: false });

		const response = await ownerAgent
			.post('/invitations')
			.send([{ email: randomEmail() }])
			.expect(200);

		const [result] = response.body.data as UserInvitationResponse[];

		const storedUser = await Container.get(UserRepository).findOneByOrFail({
			id: result.user.id,
		});

		assertInvitedUsersOnDb(storedUser);
	});

	test('should create admin shell if licensed', async () => {
		mailer.invite.mockResolvedValue({ emailSent: false });

		const response = await ownerAgent
			.post('/invitations')
			.send([{ email: randomEmail(), role: 'admin' }])
			.expect(200);

		const [result] = response.body.data as UserInvitationResponse[];

		const storedUser = await Container.get(UserRepository).findOneByOrFail({
			id: result.user.id,
		});

		assertInvitedUsersOnDb(storedUser);
	});

	test('should reinvite member', async () => {
		mailer.invite.mockResolvedValue({ emailSent: false });

		await ownerAgent.post('/invitations').send([{ email: randomEmail(), role: 'member' }]);

		await ownerAgent
			.post('/invitations')
			.send([{ email: randomEmail(), role: 'member' }])
			.expect(200);
	});

	test('should reinvite admin if licensed', async () => {
		license.isAdvancedPermissionsLicensed.mockReturnValue(true);
		mailer.invite.mockResolvedValue({ emailSent: false });

		await ownerAgent.post('/invitations').send([{ email: randomEmail(), role: 'admin' }]);

		await ownerAgent
			.post('/invitations')
			.send([{ email: randomEmail(), role: 'admin' }])
			.expect(200);
	});

	test('should fail to create admin shell if not licensed', async () => {
		license.isAdvancedPermissionsLicensed.mockReturnValue(false);
		mailer.invite.mockResolvedValue({ emailSent: false });

		await ownerAgent
			.post('/invitations')
			.send([{ email: randomEmail(), role: 'admin' }])
			.expect(403);
	});

	test('should email invites and create user shells but ignore existing', async () => {
		externalHooks.run.mockClear();

		mailer.invite.mockResolvedValue({ emailSent: true });

		const globalMemberRole = await getGlobalMemberRole();
		const memberShell = await createUserShell(globalMemberRole);

		const newUser = randomEmail();

		const shellUsers = [memberShell.email];
		const usersToInvite = [newUser, ...shellUsers];
		const usersToCreate = [newUser];
		const existingUsers = [member.email];

		const testEmails = [...usersToInvite, ...existingUsers];

		const payload = testEmails.map((email) => ({ email }));

		const response = await ownerAgent.post('/invitations').send(payload).expect(200);

		const internalHooks = Container.get(InternalHooks);

		expect(internalHooks.onUserTransactionalEmail).toHaveBeenCalledTimes(usersToInvite.length);

		expect(externalHooks.run).toHaveBeenCalledTimes(1);

		const [hookName, hookData] = externalHooks.run.mock.calls[0];

		expect(hookName).toBe('user.invited');
		expect(hookData?.[0]).toStrictEqual(usersToCreate);

		const result = response.body.data as UserInvitationResponse[];

		for (const invitationResponse of result) {
			assertInviteUserSuccessResponse(invitationResponse);

			const storedUser = await Container.get(UserRepository).findOneByOrFail({
				id: invitationResponse.user.id,
			});

			assertInvitedUsersOnDb(storedUser);
		}

		const calls = mocked(internalHooks).onUserTransactionalEmail.mock.calls;

		for (const [onUserTransactionalEmailParameter] of calls) {
			expect(onUserTransactionalEmailParameter.user_id).toBeDefined();
			expect(onUserTransactionalEmailParameter.message_type).toBe('New user invite');
			expect(onUserTransactionalEmailParameter.public_api).toBe(false);
		}
	});

	test('should return 200 when invite method throws error', async () => {
		mailer.invite.mockImplementation(async () => {
			throw new Error('failed to send email');
		});

		const response = await ownerAgent
			.post('/invitations')
			.send([{ email: randomEmail() }])
			.expect(200);

		expect(response.body.data).toBeInstanceOf(Array);
		expect(response.body.data.length).toBe(1);

		const [invitationResponse] = response.body.data;

		assertInviteUserErrorResponse(invitationResponse);
	});
});

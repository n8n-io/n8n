import { mocked } from 'jest-mock';
import Container from 'typedi';
import { Not } from '@n8n/typeorm';

import { InternalHooks } from '@/InternalHooks';
import { ExternalHooks } from '@/ExternalHooks';
import { UserManagementMailer } from '@/UserManagement/email';
import { UserRepository } from '@/databases/repositories/user.repository';
import { PasswordUtility } from '@/services/password.utility';

import {
	randomEmail,
	randomInvalidPassword,
	randomName,
	randomValidPassword,
} from '../../shared/random';
import { createMember, createOwner, createUserShell } from '../../shared/db/users';
import { mockInstance } from '../../../shared/mocking';
import * as utils from '../../shared/utils';

import {
	assertReturnedUserProps,
	assertStoredUserProps,
	assertUserInviteResult,
} from './assertions';

import type { User } from '@/databases/entities/User';
import type { UserInvitationResult } from '../../shared/utils/users';
import { ProjectRepository } from '@/databases/repositories/project.repository';
import { ProjectRelationRepository } from '@/databases/repositories/projectRelation.repository';

describe('InvitationController', () => {
	const mailer = mockInstance(UserManagementMailer);
	const externalHooks = mockInstance(ExternalHooks);
	const internalHooks = mockInstance(InternalHooks);

	const testServer = utils.setupTestServer({ endpointGroups: ['invitations'] });

	let instanceOwner: User;
	let userRepository: UserRepository;
	let projectRepository: ProjectRepository;
	let projectRelationRepository: ProjectRelationRepository;

	beforeAll(async () => {
		userRepository = Container.get(UserRepository);
		projectRepository = Container.get(ProjectRepository);
		projectRelationRepository = Container.get(ProjectRelationRepository);
		instanceOwner = await createOwner();
	});

	beforeEach(async () => {
		jest.clearAllMocks();
		await userRepository.delete({ role: Not('global:owner') });
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('POST /invitations/:id/accept', () => {
		test('should fill out a member shell', async () => {
			const memberShell = await createUserShell('global:member');

			const memberProps = {
				inviterId: instanceOwner.id,
				firstName: randomName(),
				lastName: randomName(),
				password: randomValidPassword(),
			};

			const response = await testServer.authlessAgent
				.post(`/invitations/${memberShell.id}/accept`)
				.send(memberProps)
				.expect(200);

			const { data: returnedMember } = response.body;

			assertReturnedUserProps(returnedMember);

			expect(returnedMember.firstName).toBe(memberProps.firstName);
			expect(returnedMember.lastName).toBe(memberProps.lastName);
			expect(returnedMember.role).toBe('global:member');
			expect(utils.getAuthToken(response)).toBeDefined();

			const storedMember = await userRepository.findOneByOrFail({ id: returnedMember.id });

			expect(storedMember.firstName).toBe(memberProps.firstName);
			expect(storedMember.lastName).toBe(memberProps.lastName);
			expect(storedMember.password).not.toBe(memberProps.password);
		});

		test('should fill out an admin shell', async () => {
			const adminShell = await createUserShell('global:admin');

			const memberProps = {
				inviterId: instanceOwner.id,
				firstName: randomName(),
				lastName: randomName(),
				password: randomValidPassword(),
			};

			const response = await testServer.authlessAgent
				.post(`/invitations/${adminShell.id}/accept`)
				.send(memberProps)
				.expect(200);

			const { data: returnedAdmin } = response.body;

			assertReturnedUserProps(returnedAdmin);

			expect(returnedAdmin.firstName).toBe(memberProps.firstName);
			expect(returnedAdmin.lastName).toBe(memberProps.lastName);
			expect(returnedAdmin.role).toBe('global:admin');
			expect(utils.getAuthToken(response)).toBeDefined();

			const storedAdmin = await userRepository.findOneByOrFail({ id: returnedAdmin.id });

			expect(storedAdmin.firstName).toBe(memberProps.firstName);
			expect(storedAdmin.lastName).toBe(memberProps.lastName);
			expect(storedAdmin.password).not.toBe(memberProps.password);
		});

		test('should fail with invalid payloads', async () => {
			const memberShell = await userRepository.save({
				email: randomEmail(),
				role: 'global:member',
			});

			const invalidPaylods = [
				{
					firstName: randomName(),
					lastName: randomName(),
					password: randomValidPassword(),
				},
				{
					inviterId: instanceOwner.id,
					firstName: randomName(),
					password: randomValidPassword(),
				},
				{
					inviterId: instanceOwner.id,
					firstName: randomName(),
					password: randomValidPassword(),
				},
				{
					inviterId: instanceOwner.id,
					firstName: randomName(),
					lastName: randomName(),
				},
				{
					inviterId: instanceOwner.id,
					firstName: randomName(),
					lastName: randomName(),
					password: randomInvalidPassword(),
				},
			];

			for (const payload of invalidPaylods) {
				await testServer.authlessAgent
					.post(`/invitations/${memberShell.id}/accept`)
					.send(payload)
					.expect(400);

				const storedMemberShell = await userRepository.findOneByOrFail({
					email: memberShell.email,
				});

				expect(storedMemberShell.firstName).toBeNull();
				expect(storedMemberShell.lastName).toBeNull();
				expect(storedMemberShell.password).toBeNull();
			}
		});

		test('should fail with already accepted invite', async () => {
			const member = await createMember();

			const memberProps = {
				inviterId: instanceOwner.id,
				firstName: randomName(),
				lastName: randomName(),
				password: randomValidPassword(),
			};

			await testServer.authlessAgent
				.post(`/invitations/${member.id}/accept`)
				.send(memberProps)
				.expect(400);

			const storedMember = await userRepository.findOneByOrFail({
				email: member.email,
			});

			expect(storedMember.firstName).not.toBe(memberProps.firstName);
			expect(storedMember.lastName).not.toBe(memberProps.lastName);
			expect(storedMember.password).not.toBe(memberProps.password);

			const comparisonResult = await Container.get(PasswordUtility).compare(
				member.password,
				storedMember.password,
			);

			expect(comparisonResult).toBe(false);
		});
	});

	describe('POST /invitations', () => {
		type InvitationResponse = { body: { data: UserInvitationResult[] } };

		test('should fail with invalid payloads', async () => {
			const invalidPayloads = [
				randomEmail(),
				[randomEmail()],
				{},
				[{ name: randomName() }],
				[{ email: randomName() }],
			];

			for (const invalidPayload of invalidPayloads) {
				await testServer
					.authAgentFor(instanceOwner)
					.post('/invitations')
					.send(invalidPayload)
					.expect(400);

				await expect(userRepository.count()).resolves.toBe(2); // DB unaffected
			}
		});

		test('should return 200 on empty payload', async () => {
			const response = await testServer
				.authAgentFor(instanceOwner)
				.post('/invitations')
				.send([])
				.expect(200);

			expect(response.body.data).toStrictEqual([]);

			await expect(userRepository.count()).resolves.toBe(2); // DB unaffected
		});

		test('should return 200 if emailing is not set up', async () => {
			mailer.invite.mockResolvedValue({ emailSent: false });

			const response = await testServer
				.authAgentFor(instanceOwner)
				.post('/invitations')
				.send([{ email: randomEmail() }]);

			expect(response.body.data).toBeInstanceOf(Array);
			expect(response.body.data.length).toBe(1);

			const { user } = response.body.data[0];

			expect(user.inviteAcceptUrl).toBeDefined();

			const inviteUrl = new URL(user.inviteAcceptUrl);

			expect(inviteUrl.searchParams.get('inviterId')).toBe(instanceOwner.id);
			expect(inviteUrl.searchParams.get('inviteeId')).toBe(user.id);
		});

		test('should create member shell', async () => {
			mailer.invite.mockResolvedValue({ emailSent: false });

			const response: InvitationResponse = await testServer
				.authAgentFor(instanceOwner)
				.post('/invitations')
				.send([{ email: randomEmail() }])
				.expect(200);

			const [result] = response.body.data;

			const storedUser = await userRepository.findOneByOrFail({
				id: result.user.id,
			});

			assertStoredUserProps(storedUser);
		});

		test('should create personal project for shell account', async () => {
			mailer.invite.mockResolvedValue({ emailSent: false });

			const response: InvitationResponse = await testServer
				.authAgentFor(instanceOwner)
				.post('/invitations')
				.send([{ email: randomEmail() }])
				.expect(200);

			const [result] = response.body.data;

			const storedUser = await userRepository.findOneByOrFail({
				id: result.user.id,
			});

			assertStoredUserProps(storedUser);

			const projectRelation = await projectRelationRepository.findOneOrFail({
				where: {
					userId: storedUser.id,
					role: 'project:personalOwner',
					project: {
						type: 'personal',
					},
				},
				relations: { project: true },
			});

			expect(projectRelation).not.toBeUndefined();
			expect(projectRelation.project.name).toBe(storedUser.createPersonalProjectName());
			expect(projectRelation.project.type).toBe('personal');
		});

		test('should create admin shell when advanced permissions is licensed', async () => {
			testServer.license.enable('feat:advancedPermissions');

			mailer.invite.mockResolvedValue({ emailSent: false });

			const response: InvitationResponse = await testServer
				.authAgentFor(instanceOwner)
				.post('/invitations')
				.send([{ email: randomEmail(), role: 'global:admin' }])
				.expect(200);

			const [result] = response.body.data;

			const storedUser = await userRepository.findOneByOrFail({
				id: result.user.id,
			});

			assertStoredUserProps(storedUser);
		});

		test('should reinvite member when sharing is licensed', async () => {
			testServer.license.enable('feat:sharing');

			mailer.invite.mockResolvedValue({ emailSent: false });

			await testServer
				.authAgentFor(instanceOwner)
				.post('/invitations')
				.send([{ email: randomEmail(), role: 'global:member' }]);

			await testServer
				.authAgentFor(instanceOwner)
				.post('/invitations')
				.send([{ email: randomEmail(), role: 'global:member' }])
				.expect(200);
		});

		test('should reinvite admin when advanced permissions is licensed', async () => {
			testServer.license.enable('feat:advancedPermissions');

			mailer.invite.mockResolvedValue({ emailSent: false });

			await testServer
				.authAgentFor(instanceOwner)
				.post('/invitations')
				.send([{ email: randomEmail(), role: 'global:admin' }]);

			await testServer
				.authAgentFor(instanceOwner)
				.post('/invitations')
				.send([{ email: randomEmail(), role: 'global:admin' }])
				.expect(200);
		});

		test('should return 403 on creating admin shell when advanced permissions is unlicensed', async () => {
			testServer.license.disable('feat:advancedPermissions');

			mailer.invite.mockResolvedValue({ emailSent: false });

			await testServer
				.authAgentFor(instanceOwner)
				.post('/invitations')
				.send([{ email: randomEmail(), role: 'global:admin' }])
				.expect(403);
		});

		test('should email invites and create user shells, without inviting existing users', async () => {
			mailer.invite.mockResolvedValue({ emailSent: true });

			const member = await createMember();
			const memberShell = await createUserShell('global:member');
			const newUserEmail = randomEmail();

			const existingUserEmails = [member.email];
			const inviteeUserEmails = [memberShell.email, newUserEmail];
			const payload = inviteeUserEmails.concat(existingUserEmails).map((email) => ({ email }));

			const response: InvitationResponse = await testServer
				.authAgentFor(instanceOwner)
				.post('/invitations')
				.send(payload)
				.expect(200);

			// invite results

			const { data: results } = response.body;

			for (const result of results) {
				assertUserInviteResult(result);

				const storedUser = await Container.get(UserRepository).findOneByOrFail({
					id: result.user.id,
				});

				assertStoredUserProps(storedUser);
			}

			// external hooks

			expect(externalHooks.run).toHaveBeenCalledTimes(1);

			const [externalHookName, externalHookArg] = externalHooks.run.mock.calls[0];

			expect(externalHookName).toBe('user.invited');
			expect(externalHookArg?.[0]).toStrictEqual([newUserEmail]);

			// internal hooks

			const calls = mocked(internalHooks).onUserTransactionalEmail.mock.calls;

			for (const [onUserTransactionalEmailArg] of calls) {
				expect(onUserTransactionalEmailArg.user_id).toBeDefined();
				expect(onUserTransactionalEmailArg.message_type).toBe('New user invite');
				expect(onUserTransactionalEmailArg.public_api).toBe(false);
			}
		});

		test('should return 200 and surface error when invite method throws error', async () => {
			const errorMsg = 'Failed to send email';

			mailer.invite.mockImplementation(async () => {
				throw new Error(errorMsg);
			});

			const response: InvitationResponse = await testServer
				.authAgentFor(instanceOwner)
				.post('/invitations')
				.send([{ email: randomEmail() }])
				.expect(200);

			expect(response.body.data).toBeInstanceOf(Array);
			expect(response.body.data.length).toBe(1);

			const [result] = response.body.data;

			expect(result.error).toBe(errorMsg);
		});
	});
});

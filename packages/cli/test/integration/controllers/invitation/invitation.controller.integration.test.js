'use strict';
var __createBinding =
	(this && this.__createBinding) ||
	(Object.create
		? function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				var desc = Object.getOwnPropertyDescriptor(m, k);
				if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
					desc = {
						enumerable: true,
						get: function () {
							return m[k];
						},
					};
				}
				Object.defineProperty(o, k2, desc);
			}
		: function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				o[k2] = m[k];
			});
var __setModuleDefault =
	(this && this.__setModuleDefault) ||
	(Object.create
		? function (o, v) {
				Object.defineProperty(o, 'default', { enumerable: true, value: v });
			}
		: function (o, v) {
				o['default'] = v;
			});
var __importStar =
	(this && this.__importStar) ||
	(function () {
		var ownKeys = function (o) {
			ownKeys =
				Object.getOwnPropertyNames ||
				function (o) {
					var ar = [];
					for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
					return ar;
				};
			return ownKeys(o);
		};
		return function (mod) {
			if (mod && mod.__esModule) return mod;
			var result = {};
			if (mod != null)
				for (var k = ownKeys(mod), i = 0; i < k.length; i++)
					if (k[i] !== 'default') __createBinding(result, mod, k[i]);
			__setModuleDefault(result, mod);
			return result;
		};
	})();
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const typeorm_1 = require('@n8n/typeorm');
const event_service_1 = require('@/events/event.service');
const external_hooks_1 = require('@/external-hooks');
const password_utility_1 = require('@/services/password.utility');
const email_1 = require('@/user-management/email');
const assertions_1 = require('./assertions');
const users_1 = require('../../shared/db/users');
const utils = __importStar(require('../../shared/utils'));
describe('InvitationController', () => {
	const mailer = (0, backend_test_utils_1.mockInstance)(email_1.UserManagementMailer);
	const externalHooks = (0, backend_test_utils_1.mockInstance)(external_hooks_1.ExternalHooks);
	const eventService = (0, backend_test_utils_1.mockInstance)(event_service_1.EventService);
	const testServer = utils.setupTestServer({ endpointGroups: ['invitations'] });
	let instanceOwner;
	let userRepository;
	let projectRelationRepository;
	beforeAll(async () => {
		userRepository = di_1.Container.get(db_1.UserRepository);
		projectRelationRepository = di_1.Container.get(db_1.ProjectRelationRepository);
		instanceOwner = await (0, users_1.createOwner)();
	});
	beforeEach(async () => {
		jest.clearAllMocks();
		await userRepository.delete({ role: (0, typeorm_1.Not)('global:owner') });
	});
	afterEach(() => {
		jest.restoreAllMocks();
	});
	describe('POST /invitations/:id/accept', () => {
		test('should fill out a member shell', async () => {
			const memberShell = await (0, users_1.createUserShell)('global:member');
			const memberProps = {
				inviterId: instanceOwner.id,
				firstName: (0, backend_test_utils_1.randomName)(),
				lastName: (0, backend_test_utils_1.randomName)(),
				password: (0, backend_test_utils_1.randomValidPassword)(),
			};
			const response = await testServer.authlessAgent
				.post(`/invitations/${memberShell.id}/accept`)
				.send(memberProps)
				.expect(200);
			const { data: returnedMember } = response.body;
			(0, assertions_1.assertReturnedUserProps)(returnedMember);
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
			const adminShell = await (0, users_1.createUserShell)('global:admin');
			const memberProps = {
				inviterId: instanceOwner.id,
				firstName: (0, backend_test_utils_1.randomName)(),
				lastName: (0, backend_test_utils_1.randomName)(),
				password: (0, backend_test_utils_1.randomValidPassword)(),
			};
			const response = await testServer.authlessAgent
				.post(`/invitations/${adminShell.id}/accept`)
				.send(memberProps)
				.expect(200);
			const { data: returnedAdmin } = response.body;
			(0, assertions_1.assertReturnedUserProps)(returnedAdmin);
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
				email: (0, backend_test_utils_1.randomEmail)(),
				role: 'global:member',
			});
			const invalidPaylods = [
				{
					firstName: (0, backend_test_utils_1.randomName)(),
					lastName: (0, backend_test_utils_1.randomName)(),
					password: (0, backend_test_utils_1.randomValidPassword)(),
				},
				{
					inviterId: instanceOwner.id,
					firstName: (0, backend_test_utils_1.randomName)(),
					password: (0, backend_test_utils_1.randomValidPassword)(),
				},
				{
					inviterId: instanceOwner.id,
					firstName: (0, backend_test_utils_1.randomName)(),
					password: (0, backend_test_utils_1.randomValidPassword)(),
				},
				{
					inviterId: instanceOwner.id,
					firstName: (0, backend_test_utils_1.randomName)(),
					lastName: (0, backend_test_utils_1.randomName)(),
				},
				{
					inviterId: instanceOwner.id,
					firstName: (0, backend_test_utils_1.randomName)(),
					lastName: (0, backend_test_utils_1.randomName)(),
					password: (0, backend_test_utils_1.randomInvalidPassword)(),
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
			const member = await (0, users_1.createMember)();
			const memberProps = {
				inviterId: instanceOwner.id,
				firstName: (0, backend_test_utils_1.randomName)(),
				lastName: (0, backend_test_utils_1.randomName)(),
				password: (0, backend_test_utils_1.randomValidPassword)(),
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
			const comparisonResult = await di_1.Container.get(password_utility_1.PasswordUtility).compare(
				member.password,
				storedMember.password,
			);
			expect(comparisonResult).toBe(false);
		});
	});
	describe('POST /invitations', () => {
		test('should fail with invalid payloads', async () => {
			const invalidPayloads = [
				(0, backend_test_utils_1.randomEmail)(),
				[(0, backend_test_utils_1.randomEmail)()],
				{},
				[{ name: (0, backend_test_utils_1.randomName)() }],
				[{ email: (0, backend_test_utils_1.randomName)() }],
			];
			for (const invalidPayload of invalidPayloads) {
				await testServer
					.authAgentFor(instanceOwner)
					.post('/invitations')
					.send(invalidPayload)
					.expect(400);
				await expect(userRepository.count()).resolves.toBe(2);
			}
		});
		test('should return 200 on empty payload', async () => {
			const response = await testServer
				.authAgentFor(instanceOwner)
				.post('/invitations')
				.send([])
				.expect(200);
			expect(response.body.data).toStrictEqual([]);
			await expect(userRepository.count()).resolves.toBe(2);
		});
		test('should return 200 if emailing is not set up', async () => {
			mailer.invite.mockResolvedValue({ emailSent: false });
			const response = await testServer
				.authAgentFor(instanceOwner)
				.post('/invitations')
				.send([{ email: (0, backend_test_utils_1.randomEmail)() }]);
			expect(response.body.data).toBeInstanceOf(Array);
			expect(response.body.data.length).toBe(1);
			const { user } = response.body.data[0];
			expect(user.inviteAcceptUrl).toBeDefined();
			expect(user).toHaveProperty('role', 'global:member');
			const inviteUrl = new URL(user.inviteAcceptUrl);
			expect(inviteUrl.searchParams.get('inviterId')).toBe(instanceOwner.id);
			expect(inviteUrl.searchParams.get('inviteeId')).toBe(user.id);
		});
		test('should create member shell', async () => {
			mailer.invite.mockResolvedValue({ emailSent: false });
			const response = await testServer
				.authAgentFor(instanceOwner)
				.post('/invitations')
				.send([{ email: (0, backend_test_utils_1.randomEmail)() }])
				.expect(200);
			const [result] = response.body.data;
			const storedUser = await userRepository.findOneByOrFail({
				id: result.user.id,
			});
			(0, assertions_1.assertStoredUserProps)(storedUser);
		});
		test('should create personal project for shell account', async () => {
			mailer.invite.mockResolvedValue({ emailSent: false });
			const response = await testServer
				.authAgentFor(instanceOwner)
				.post('/invitations')
				.send([{ email: (0, backend_test_utils_1.randomEmail)() }])
				.expect(200);
			const [result] = response.body.data;
			const storedUser = await userRepository.findOneByOrFail({
				id: result.user.id,
			});
			(0, assertions_1.assertStoredUserProps)(storedUser);
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
			const response = await testServer
				.authAgentFor(instanceOwner)
				.post('/invitations')
				.send([{ email: (0, backend_test_utils_1.randomEmail)(), role: 'global:admin' }])
				.expect(200);
			const [result] = response.body.data;
			const storedUser = await userRepository.findOneByOrFail({
				id: result.user.id,
			});
			(0, assertions_1.assertStoredUserProps)(storedUser);
		});
		test('should reinvite member when sharing is licensed', async () => {
			testServer.license.enable('feat:sharing');
			mailer.invite.mockResolvedValue({ emailSent: false });
			await testServer
				.authAgentFor(instanceOwner)
				.post('/invitations')
				.send([{ email: (0, backend_test_utils_1.randomEmail)(), role: 'global:member' }]);
			await testServer
				.authAgentFor(instanceOwner)
				.post('/invitations')
				.send([{ email: (0, backend_test_utils_1.randomEmail)(), role: 'global:member' }])
				.expect(200);
		});
		test('should reinvite admin when advanced permissions is licensed', async () => {
			testServer.license.enable('feat:advancedPermissions');
			mailer.invite.mockResolvedValue({ emailSent: false });
			await testServer
				.authAgentFor(instanceOwner)
				.post('/invitations')
				.send([{ email: (0, backend_test_utils_1.randomEmail)(), role: 'global:admin' }]);
			await testServer
				.authAgentFor(instanceOwner)
				.post('/invitations')
				.send([{ email: (0, backend_test_utils_1.randomEmail)(), role: 'global:admin' }])
				.expect(200);
		});
		test('should return 403 on creating admin shell when advanced permissions is unlicensed', async () => {
			testServer.license.disable('feat:advancedPermissions');
			mailer.invite.mockResolvedValue({ emailSent: false });
			await testServer
				.authAgentFor(instanceOwner)
				.post('/invitations')
				.send([{ email: (0, backend_test_utils_1.randomEmail)(), role: 'global:admin' }])
				.expect(403);
		});
		test('should email invites and create user shells, without inviting existing users', async () => {
			mailer.invite.mockResolvedValue({ emailSent: true });
			const member = await (0, users_1.createMember)();
			const memberShell = await (0, users_1.createUserShell)('global:member');
			const newUserEmail = (0, backend_test_utils_1.randomEmail)();
			const existingUserEmails = [member.email];
			const inviteeUserEmails = [memberShell.email, newUserEmail];
			const payload = inviteeUserEmails.concat(existingUserEmails).map((email) => ({ email }));
			const response = await testServer
				.authAgentFor(instanceOwner)
				.post('/invitations')
				.send(payload)
				.expect(200);
			const { data: results } = response.body;
			for (const result of results) {
				(0, assertions_1.assertUserInviteResult)(result);
				const storedUser = await di_1.Container.get(db_1.UserRepository).findOneByOrFail({
					id: result.user.id,
				});
				(0, assertions_1.assertStoredUserProps)(storedUser);
			}
			expect(externalHooks.run).toHaveBeenCalledTimes(1);
			const [externalHookName, externalHookArg] = externalHooks.run.mock.calls[0];
			expect(externalHookName).toBe('user.invited');
			expect(externalHookArg?.[0]).toStrictEqual([newUserEmail]);
			for (const [eventName, payload] of eventService.emit.mock.calls) {
				if (eventName === 'user-invited') {
					expect(payload).toEqual({
						user: expect.objectContaining({ id: expect.any(String) }),
						targetUserId: expect.arrayContaining([expect.any(String), expect.any(String)]),
						publicApi: false,
						emailSent: true,
						inviteeRole: 'global:member',
					});
				} else if (eventName === 'user-transactional-email-sent') {
					expect(payload).toEqual({
						userId: expect.any(String),
						messageType: 'New user invite',
						publicApi: false,
					});
				} else {
					fail(`Unexpected event name: ${eventName}`);
				}
			}
		});
		test('should return 200 and surface error when invite method throws error', async () => {
			const errorMsg = 'Failed to send email';
			mailer.invite.mockImplementation(async () => {
				throw new Error(errorMsg);
			});
			const response = await testServer
				.authAgentFor(instanceOwner)
				.post('/invitations')
				.send([{ email: (0, backend_test_utils_1.randomEmail)() }])
				.expect(200);
			expect(response.body.data).toBeInstanceOf(Array);
			expect(response.body.data.length).toBe(1);
			const [result] = response.body.data;
			expect(result.error).toBe(errorMsg);
		});
	});
});
//# sourceMappingURL=invitation.controller.integration.test.js.map

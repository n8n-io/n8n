'use strict';
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
const backend_common_1 = require('@n8n/backend-common');
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const jest_mock_extended_1 = require('jest-mock-extended');
const auth_service_1 = require('@/auth/auth.service');
const config_1 = __importDefault(require('@/config'));
const constants_1 = require('@/constants');
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const forbidden_error_1 = require('@/errors/response-errors/forbidden.error');
const event_service_1 = require('@/events/event.service');
const external_hooks_1 = require('@/external-hooks');
const license_1 = require('@/license');
const posthog_1 = require('@/posthog');
const password_utility_1 = require('@/services/password.utility');
const user_service_1 = require('@/services/user.service');
const invitation_controller_1 = require('../invitation.controller');
jest.mock('@/sso.ee/saml/saml-helpers', () => ({
	isSamlLicensedAndEnabled: jest.fn(),
}));
jest.mock('@/config');
const mockedConfig = config_1.default;
describe('InvitationController', () => {
	(0, backend_test_utils_1.mockInstance)(backend_common_1.Logger);
	const externalHooks = (0, backend_test_utils_1.mockInstance)(external_hooks_1.ExternalHooks);
	const authService = (0, backend_test_utils_1.mockInstance)(auth_service_1.AuthService);
	const userService = (0, backend_test_utils_1.mockInstance)(user_service_1.UserService);
	const license = (0, backend_test_utils_1.mockInstance)(license_1.License);
	const passwordUtility = (0, backend_test_utils_1.mockInstance)(
		password_utility_1.PasswordUtility,
	);
	const userRepository = (0, backend_test_utils_1.mockInstance)(db_1.UserRepository);
	const postHog = (0, backend_test_utils_1.mockInstance)(posthog_1.PostHogClient);
	const eventService = (0, backend_test_utils_1.mockInstance)(event_service_1.EventService);
	const controller = di_1.Container.get(invitation_controller_1.InvitationController);
	const mockUser = (0, jest_mock_extended_1.mock)({
		id: 'user-123',
		email: 'admin@example.com',
		firstName: 'Admin',
		lastName: 'User',
		role: 'global:owner',
	});
	const mockResponse = (0, jest_mock_extended_1.mock)();
	beforeEach(() => {
		jest.clearAllMocks();
		const { isSamlLicensedAndEnabled } = require('@/sso.ee/saml/saml-helpers');
		isSamlLicensedAndEnabled.mockReturnValue(false);
		mockedConfig.getEnv.mockReturnValue(true);
		license.isWithinUsersLimit.mockReturnValue(true);
		license.isAdvancedPermissionsLicensed.mockReturnValue(true);
	});
	describe('inviteUser', () => {
		const validInvitations = [
			{ email: 'user1@example.com', role: 'global:member' },
			{ email: 'user2@example.com', role: 'global:member' },
		];
		it('should successfully invite users', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
			});
			const mockInviteResult = {
				usersInvited: [
					{ email: 'user1@example.com', role: 'global:member', inviteAcceptUrl: 'http://invite1' },
					{ email: 'user2@example.com', role: 'global:member', inviteAcceptUrl: 'http://invite2' },
				],
				usersCreated: [
					(0, jest_mock_extended_1.mock)({ id: 'invited-1', email: 'user1@example.com' }),
					(0, jest_mock_extended_1.mock)({ id: 'invited-2', email: 'user2@example.com' }),
				],
			};
			userService.inviteUsers.mockResolvedValue(mockInviteResult);
			externalHooks.run.mockResolvedValue(undefined);
			const result = await controller.inviteUser(req, mockResponse, validInvitations);
			expect(license.isWithinUsersLimit).toHaveBeenCalled();
			const { isSamlLicensedAndEnabled } = require('@/sso.ee/saml/saml-helpers');
			expect(isSamlLicensedAndEnabled).toHaveBeenCalled();
			expect(mockedConfig.getEnv).toHaveBeenCalledWith('userManagement.isInstanceOwnerSetUp');
			expect(userService.inviteUsers).toHaveBeenCalledWith(mockUser, validInvitations);
			expect(externalHooks.run).toHaveBeenCalledWith('user.invited', [
				mockInviteResult.usersCreated,
			]);
			expect(result).toEqual(mockInviteResult.usersInvited);
		});
		it('should return empty array for empty invitations', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
			});
			const result = await controller.inviteUser(req, mockResponse, []);
			expect(result).toEqual([]);
			expect(userService.inviteUsers).not.toHaveBeenCalled();
		});
		it('should throw BadRequestError when SAML is enabled', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
			});
			const { isSamlLicensedAndEnabled } = require('@/sso.ee/saml/saml-helpers');
			isSamlLicensedAndEnabled.mockReturnValue(true);
			await expect(controller.inviteUser(req, mockResponse, validInvitations)).rejects.toThrow(
				bad_request_error_1.BadRequestError,
			);
			await expect(controller.inviteUser(req, mockResponse, validInvitations)).rejects.toThrow(
				'SAML is enabled, so users are managed by the Identity Provider and cannot be added through invites',
			);
			expect(userService.inviteUsers).not.toHaveBeenCalled();
		});
		it('should throw ForbiddenError when user limit is reached', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
			});
			license.isWithinUsersLimit.mockReturnValue(false);
			await expect(controller.inviteUser(req, mockResponse, validInvitations)).rejects.toThrow(
				forbidden_error_1.ForbiddenError,
			);
			await expect(controller.inviteUser(req, mockResponse, validInvitations)).rejects.toThrow(
				constants_1.RESPONSE_ERROR_MESSAGES.USERS_QUOTA_REACHED,
			);
			expect(userService.inviteUsers).not.toHaveBeenCalled();
		});
		it('should throw BadRequestError when instance owner is not set up', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
			});
			mockedConfig.getEnv.mockReturnValue(false);
			await expect(controller.inviteUser(req, mockResponse, validInvitations)).rejects.toThrow(
				bad_request_error_1.BadRequestError,
			);
			await expect(controller.inviteUser(req, mockResponse, validInvitations)).rejects.toThrow(
				'You must set up your own account before inviting others',
			);
			expect(userService.inviteUsers).not.toHaveBeenCalled();
		});
		it('should throw ForbiddenError when trying to invite admin without license', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
			});
			const adminInvitations = [{ email: 'admin@example.com', role: 'global:admin' }];
			license.isAdvancedPermissionsLicensed.mockReturnValue(false);
			await expect(controller.inviteUser(req, mockResponse, adminInvitations)).rejects.toThrow(
				forbidden_error_1.ForbiddenError,
			);
			await expect(controller.inviteUser(req, mockResponse, adminInvitations)).rejects.toThrow(
				'Cannot invite admin user without advanced permissions. Please upgrade to a license that includes this feature.',
			);
			expect(userService.inviteUsers).not.toHaveBeenCalled();
		});
		it('should allow inviting admin with proper license', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
			});
			const adminInvitations = [{ email: 'admin@example.com', role: 'global:admin' }];
			const mockInviteResult = {
				usersInvited: [
					{ email: 'admin@example.com', role: 'global:admin', inviteAcceptUrl: 'http://invite' },
				],
				usersCreated: [
					(0, jest_mock_extended_1.mock)({ id: 'invited-admin', email: 'admin@example.com' }),
				],
			};
			license.isAdvancedPermissionsLicensed.mockReturnValue(true);
			userService.inviteUsers.mockResolvedValue(mockInviteResult);
			externalHooks.run.mockResolvedValue(undefined);
			const result = await controller.inviteUser(req, mockResponse, adminInvitations);
			expect(userService.inviteUsers).toHaveBeenCalledWith(mockUser, adminInvitations);
			expect(result).toEqual(mockInviteResult.usersInvited);
		});
		it('should handle mixed role invitations correctly', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
			});
			const mixedInvitations = [
				{ email: 'member@example.com', role: 'global:member' },
				{ email: 'admin@example.com', role: 'global:admin' },
			];
			const mockInviteResult = {
				usersInvited: [
					{ email: 'member@example.com', role: 'global:member', inviteAcceptUrl: 'http://invite1' },
					{ email: 'admin@example.com', role: 'global:admin', inviteAcceptUrl: 'http://invite2' },
				],
				usersCreated: [
					(0, jest_mock_extended_1.mock)({ id: 'invited-member', email: 'member@example.com' }),
					(0, jest_mock_extended_1.mock)({ id: 'invited-admin', email: 'admin@example.com' }),
				],
			};
			userService.inviteUsers.mockResolvedValue(mockInviteResult);
			externalHooks.run.mockResolvedValue(undefined);
			const result = await controller.inviteUser(req, mockResponse, mixedInvitations);
			expect(result).toEqual(mockInviteResult.usersInvited);
			expect(result).toHaveLength(2);
		});
		it('should handle external hooks errors gracefully', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
			});
			const mockInviteResult = {
				usersInvited: [
					{ email: 'user@example.com', role: 'global:member', inviteAcceptUrl: 'http://invite' },
				],
				usersCreated: [
					(0, jest_mock_extended_1.mock)({ id: 'invited-user', email: 'user@example.com' }),
				],
			};
			userService.inviteUsers.mockResolvedValue(mockInviteResult);
			externalHooks.run.mockRejectedValue(new Error('External hook failed'));
			await expect(
				controller.inviteUser(req, mockResponse, [
					{ email: 'user@example.com', role: 'global:member' },
				]),
			).rejects.toThrow('External hook failed');
		});
	});
	describe('acceptInvitation', () => {
		const validPayload = {
			inviterId: 'inviter-123',
			firstName: 'John',
			lastName: 'Doe',
			password: 'SecurePassword123!',
		};
		const inviteeId = 'invitee-456';
		it('should successfully accept invitation', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				browserId: 'browser-123',
			});
			const inviter = (0, jest_mock_extended_1.mock)({
				id: 'inviter-123',
				email: 'inviter@example.com',
			});
			const invitee = {
				id: 'invitee-456',
				email: 'invitee@example.com',
				password: null,
				firstName: undefined,
				lastName: undefined,
			};
			const updatedInvitee = (0, jest_mock_extended_1.mock)({
				...invitee,
				firstName: 'John',
				lastName: 'Doe',
				password: 'hashedPassword',
			});
			const publicUser = {
				id: 'invitee-456',
				email: 'invitee@example.com',
				firstName: 'John',
				lastName: 'Doe',
			};
			userRepository.findManyByIds.mockResolvedValue([inviter, invitee]);
			passwordUtility.hash.mockResolvedValue('hashedPassword');
			userRepository.save.mockResolvedValue(updatedInvitee);
			authService.issueCookie.mockReturnValue(undefined);
			eventService.emit.mockReturnValue(undefined);
			userService.toPublic.mockResolvedValue(publicUser);
			externalHooks.run.mockResolvedValue(undefined);
			const result = await controller.acceptInvitation(req, mockResponse, validPayload, inviteeId);
			expect(userRepository.findManyByIds).toHaveBeenCalledWith(['inviter-123', 'invitee-456']);
			expect(passwordUtility.hash).toHaveBeenCalledWith('SecurePassword123!');
			expect(userRepository.save).toHaveBeenCalledWith(
				expect.objectContaining({
					firstName: 'John',
					lastName: 'Doe',
					password: 'hashedPassword',
				}),
				{ transaction: false },
			);
			expect(authService.issueCookie).toHaveBeenCalledWith(
				mockResponse,
				updatedInvitee,
				false,
				'browser-123',
			);
			expect(eventService.emit).toHaveBeenCalledWith('user-signed-up', {
				user: updatedInvitee,
				userType: 'email',
				wasDisabledLdapUser: false,
			});
			expect(externalHooks.run).toHaveBeenCalledWith('user.profile.update', [
				invitee.email,
				publicUser,
			]);
			expect(externalHooks.run).toHaveBeenCalledWith('user.password.update', [
				invitee.email,
				'hashedPassword',
			]);
			expect(result).toEqual(publicUser);
		});
		it('should throw BadRequestError when users are not found', async () => {
			const req = (0, jest_mock_extended_1.mock)();
			userRepository.findManyByIds.mockResolvedValue([]);
			await expect(
				controller.acceptInvitation(req, mockResponse, validPayload, inviteeId),
			).rejects.toThrow(bad_request_error_1.BadRequestError);
			await expect(
				controller.acceptInvitation(req, mockResponse, validPayload, inviteeId),
			).rejects.toThrow('Invalid payload or URL');
			expect(passwordUtility.hash).not.toHaveBeenCalled();
		});
		it('should throw BadRequestError when only one user is found', async () => {
			const req = (0, jest_mock_extended_1.mock)();
			const inviter = (0, jest_mock_extended_1.mock)({
				id: 'inviter-123',
				email: 'inviter@example.com',
			});
			userRepository.findManyByIds.mockResolvedValue([inviter]);
			await expect(
				controller.acceptInvitation(req, mockResponse, validPayload, inviteeId),
			).rejects.toThrow(bad_request_error_1.BadRequestError);
			await expect(
				controller.acceptInvitation(req, mockResponse, validPayload, inviteeId),
			).rejects.toThrow('Invalid payload or URL');
		});
		it('should throw BadRequestError when invitation is already accepted', async () => {
			const req = (0, jest_mock_extended_1.mock)();
			const inviter = (0, jest_mock_extended_1.mock)({
				id: 'inviter-123',
				email: 'inviter@example.com',
			});
			const invitee = (0, jest_mock_extended_1.mock)({
				id: 'invitee-456',
				email: 'invitee@example.com',
				password: 'alreadyHashed',
			});
			userRepository.findManyByIds.mockResolvedValue([inviter, invitee]);
			await expect(
				controller.acceptInvitation(req, mockResponse, validPayload, inviteeId),
			).rejects.toThrow(bad_request_error_1.BadRequestError);
			await expect(
				controller.acceptInvitation(req, mockResponse, validPayload, inviteeId),
			).rejects.toThrow('This invite has been accepted already');
			expect(passwordUtility.hash).not.toHaveBeenCalled();
		});
		it('should handle password hashing errors', async () => {
			const req = (0, jest_mock_extended_1.mock)();
			const inviter = (0, jest_mock_extended_1.mock)({
				id: 'inviter-123',
				email: 'inviter@example.com',
			});
			const invitee = (0, jest_mock_extended_1.mock)({
				id: 'invitee-456',
				email: 'invitee@example.com',
				password: null,
			});
			userRepository.findManyByIds.mockResolvedValue([inviter, invitee]);
			passwordUtility.hash.mockRejectedValue(new Error('Hashing failed'));
			await expect(
				controller.acceptInvitation(req, mockResponse, validPayload, inviteeId),
			).rejects.toThrow('Hashing failed');
		});
		it('should handle database save errors', async () => {
			const req = (0, jest_mock_extended_1.mock)();
			const inviter = (0, jest_mock_extended_1.mock)({
				id: 'inviter-123',
				email: 'inviter@example.com',
			});
			const invitee = (0, jest_mock_extended_1.mock)({
				id: 'invitee-456',
				email: 'invitee@example.com',
				password: null,
			});
			userRepository.findManyByIds.mockResolvedValue([inviter, invitee]);
			passwordUtility.hash.mockResolvedValue('hashedPassword');
			userRepository.save.mockRejectedValue(new Error('Database save failed'));
			await expect(
				controller.acceptInvitation(req, mockResponse, validPayload, inviteeId),
			).rejects.toThrow('Database save failed');
		});
		it('should handle external hooks errors during profile update', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				browserId: 'browser-123',
			});
			const inviter = (0, jest_mock_extended_1.mock)({
				id: 'inviter-123',
				email: 'inviter@example.com',
			});
			const invitee = (0, jest_mock_extended_1.mock)({
				id: 'invitee-456',
				email: 'invitee@example.com',
				password: null,
			});
			const updatedInvitee = (0, jest_mock_extended_1.mock)({
				...invitee,
				firstName: 'John',
				lastName: 'Doe',
				password: 'hashedPassword',
			});
			userRepository.findManyByIds.mockResolvedValue([inviter, invitee]);
			passwordUtility.hash.mockResolvedValue('hashedPassword');
			userRepository.save.mockResolvedValue(updatedInvitee);
			authService.issueCookie.mockReturnValue(undefined);
			eventService.emit.mockReturnValue(undefined);
			userService.toPublic.mockResolvedValue({ id: 'invitee-456', email: 'invitee@example.com' });
			externalHooks.run.mockRejectedValue(new Error('External hook failed'));
			await expect(
				controller.acceptInvitation(req, mockResponse, validPayload, inviteeId),
			).rejects.toThrow('External hook failed');
		});
	});
});
//# sourceMappingURL=invitation.controller.test.js.map

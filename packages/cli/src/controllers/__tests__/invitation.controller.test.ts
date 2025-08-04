import type { AcceptInvitationRequestDto, InviteUsersRequestDto } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import type { AuthenticatedRequest, User } from '@n8n/db';
import { UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { Response } from 'express';
import { mock } from 'jest-mock-extended';

import { AuthService } from '@/auth/auth.service';
import config from '@/config';
import { RESPONSE_ERROR_MESSAGES } from '@/constants';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { EventService } from '@/events/event.service';
import { ExternalHooks } from '@/external-hooks';
import { License } from '@/license';
import { PostHogClient } from '@/posthog';
import type { AuthlessRequest } from '@/requests';
import { PasswordUtility } from '@/services/password.utility';
import { UserService } from '@/services/user.service';

import { InvitationController } from '../invitation.controller';

// Mock the SAML helpers
jest.mock('@/sso.ee/saml/saml-helpers', () => ({
	isSamlLicensedAndEnabled: jest.fn(),
}));

// Mock config
jest.mock('@/config');
const mockedConfig = config as jest.Mocked<typeof config>;

describe('InvitationController', () => {
	mockInstance(Logger);

	const externalHooks = mockInstance(ExternalHooks);
	const authService = mockInstance(AuthService);
	const userService = mockInstance(UserService);
	const license = mockInstance(License);
	const passwordUtility = mockInstance(PasswordUtility);
	const userRepository = mockInstance(UserRepository);
	const postHog = mockInstance(PostHogClient);
	const eventService = mockInstance(EventService);

	const controller = Container.get(InvitationController);

	const mockUser = mock<User>({
		id: 'user-123',
		email: 'admin@example.com',
		firstName: 'Admin',
		lastName: 'User',
		role: 'global:owner',
	});

	const mockResponse = mock<Response>();

	beforeEach(() => {
		jest.clearAllMocks();

		// Default mocks
		const { isSamlLicensedAndEnabled } = require('@/sso.ee/saml/saml-helpers');
		isSamlLicensedAndEnabled.mockReturnValue(false);
		mockedConfig.getEnv.mockReturnValue(true);
		license.isWithinUsersLimit.mockReturnValue(true);
		license.isAdvancedPermissionsLicensed.mockReturnValue(true);
	});

	describe('inviteUser', () => {
		const validInvitations: InviteUsersRequestDto = [
			{ email: 'user1@example.com', role: 'global:member' },
			{ email: 'user2@example.com', role: 'global:member' },
		];

		it('should successfully invite users', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({
				user: mockUser,
			});

			const mockInviteResult = {
				usersInvited: [
					{ email: 'user1@example.com', role: 'global:member', inviteAcceptUrl: 'http://invite1' },
					{ email: 'user2@example.com', role: 'global:member', inviteAcceptUrl: 'http://invite2' },
				],
				usersCreated: [
					mock<User>({ id: 'invited-1', email: 'user1@example.com' }),
					mock<User>({ id: 'invited-2', email: 'user2@example.com' }),
				],
			};

			userService.inviteUsers.mockResolvedValue(mockInviteResult);
			externalHooks.run.mockResolvedValue(undefined);

			// Act
			const result = await controller.inviteUser(req, mockResponse, validInvitations);

			// Assert
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
			// Arrange
			const req = mock<AuthenticatedRequest>({
				user: mockUser,
			});

			// Act
			const result = await controller.inviteUser(req, mockResponse, []);

			// Assert
			expect(result).toEqual([]);
			expect(userService.inviteUsers).not.toHaveBeenCalled();
		});

		it('should throw BadRequestError when SAML is enabled', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({
				user: mockUser,
			});

			const { isSamlLicensedAndEnabled } = require('@/sso.ee/saml/saml-helpers');
			isSamlLicensedAndEnabled.mockReturnValue(true);

			// Act & Assert
			await expect(controller.inviteUser(req, mockResponse, validInvitations)).rejects.toThrow(
				BadRequestError,
			);
			await expect(controller.inviteUser(req, mockResponse, validInvitations)).rejects.toThrow(
				'SAML is enabled, so users are managed by the Identity Provider and cannot be added through invites',
			);
			expect(userService.inviteUsers).not.toHaveBeenCalled();
		});

		it('should throw ForbiddenError when user limit is reached', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({
				user: mockUser,
			});

			license.isWithinUsersLimit.mockReturnValue(false);

			// Act & Assert
			await expect(controller.inviteUser(req, mockResponse, validInvitations)).rejects.toThrow(
				ForbiddenError,
			);
			await expect(controller.inviteUser(req, mockResponse, validInvitations)).rejects.toThrow(
				RESPONSE_ERROR_MESSAGES.USERS_QUOTA_REACHED,
			);
			expect(userService.inviteUsers).not.toHaveBeenCalled();
		});

		it('should throw BadRequestError when instance owner is not set up', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({
				user: mockUser,
			});

			mockedConfig.getEnv.mockReturnValue(false);

			// Act & Assert
			await expect(controller.inviteUser(req, mockResponse, validInvitations)).rejects.toThrow(
				BadRequestError,
			);
			await expect(controller.inviteUser(req, mockResponse, validInvitations)).rejects.toThrow(
				'You must set up your own account before inviting others',
			);
			expect(userService.inviteUsers).not.toHaveBeenCalled();
		});

		it('should throw ForbiddenError when trying to invite admin without license', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({
				user: mockUser,
			});

			const adminInvitations: InviteUsersRequestDto = [
				{ email: 'admin@example.com', role: 'global:admin' },
			];

			license.isAdvancedPermissionsLicensed.mockReturnValue(false);

			// Act & Assert
			await expect(controller.inviteUser(req, mockResponse, adminInvitations)).rejects.toThrow(
				ForbiddenError,
			);
			await expect(controller.inviteUser(req, mockResponse, adminInvitations)).rejects.toThrow(
				'Cannot invite admin user without advanced permissions. Please upgrade to a license that includes this feature.',
			);
			expect(userService.inviteUsers).not.toHaveBeenCalled();
		});

		it('should allow inviting admin with proper license', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({
				user: mockUser,
			});

			const adminInvitations: InviteUsersRequestDto = [
				{ email: 'admin@example.com', role: 'global:admin' },
			];

			const mockInviteResult = {
				usersInvited: [
					{ email: 'admin@example.com', role: 'global:admin', inviteAcceptUrl: 'http://invite' },
				],
				usersCreated: [mock<User>({ id: 'invited-admin', email: 'admin@example.com' })],
			};

			license.isAdvancedPermissionsLicensed.mockReturnValue(true);
			userService.inviteUsers.mockResolvedValue(mockInviteResult);
			externalHooks.run.mockResolvedValue(undefined);

			// Act
			const result = await controller.inviteUser(req, mockResponse, adminInvitations);

			// Assert
			expect(userService.inviteUsers).toHaveBeenCalledWith(mockUser, adminInvitations);
			expect(result).toEqual(mockInviteResult.usersInvited);
		});

		it('should handle mixed role invitations correctly', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({
				user: mockUser,
			});

			const mixedInvitations: InviteUsersRequestDto = [
				{ email: 'member@example.com', role: 'global:member' },
				{ email: 'admin@example.com', role: 'global:admin' },
			];

			const mockInviteResult = {
				usersInvited: [
					{ email: 'member@example.com', role: 'global:member', inviteAcceptUrl: 'http://invite1' },
					{ email: 'admin@example.com', role: 'global:admin', inviteAcceptUrl: 'http://invite2' },
				],
				usersCreated: [
					mock<User>({ id: 'invited-member', email: 'member@example.com' }),
					mock<User>({ id: 'invited-admin', email: 'admin@example.com' }),
				],
			};

			userService.inviteUsers.mockResolvedValue(mockInviteResult);
			externalHooks.run.mockResolvedValue(undefined);

			// Act
			const result = await controller.inviteUser(req, mockResponse, mixedInvitations);

			// Assert
			expect(result).toEqual(mockInviteResult.usersInvited);
			expect(result).toHaveLength(2);
		});

		it('should handle external hooks errors gracefully', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({
				user: mockUser,
			});

			const mockInviteResult = {
				usersInvited: [
					{ email: 'user@example.com', role: 'global:member', inviteAcceptUrl: 'http://invite' },
				],
				usersCreated: [mock<User>({ id: 'invited-user', email: 'user@example.com' })],
			};

			userService.inviteUsers.mockResolvedValue(mockInviteResult);
			externalHooks.run.mockRejectedValue(new Error('External hook failed'));

			// Act & Assert
			await expect(
				controller.inviteUser(req, mockResponse, [
					{ email: 'user@example.com', role: 'global:member' },
				]),
			).rejects.toThrow('External hook failed');
		});
	});

	describe('acceptInvitation', () => {
		const validPayload: AcceptInvitationRequestDto = {
			inviterId: 'inviter-123',
			firstName: 'John',
			lastName: 'Doe',
			password: 'SecurePassword123!',
		};

		const inviteeId = 'invitee-456';

		it('should successfully accept invitation', async () => {
			// Arrange
			const req = mock<AuthlessRequest>({
				browserId: 'browser-123',
			});

			const inviter = mock<User>({
				id: 'inviter-123',
				email: 'inviter@example.com',
			});

			const invitee = {
				id: 'invitee-456',
				email: 'invitee@example.com',
				password: null, // Not yet accepted
				firstName: undefined,
				lastName: undefined,
			} as User;

			const updatedInvitee = mock<User>({
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

			// Act
			const result = await controller.acceptInvitation(req, mockResponse, validPayload, inviteeId);

			// Assert
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
			// Arrange
			const req = mock<AuthlessRequest>();

			userRepository.findManyByIds.mockResolvedValue([]);

			// Act & Assert
			await expect(
				controller.acceptInvitation(req, mockResponse, validPayload, inviteeId),
			).rejects.toThrow(BadRequestError);
			await expect(
				controller.acceptInvitation(req, mockResponse, validPayload, inviteeId),
			).rejects.toThrow('Invalid payload or URL');
			expect(passwordUtility.hash).not.toHaveBeenCalled();
		});

		it('should throw BadRequestError when only one user is found', async () => {
			// Arrange
			const req = mock<AuthlessRequest>();

			const inviter = mock<User>({
				id: 'inviter-123',
				email: 'inviter@example.com',
			});

			userRepository.findManyByIds.mockResolvedValue([inviter]); // Missing invitee

			// Act & Assert
			await expect(
				controller.acceptInvitation(req, mockResponse, validPayload, inviteeId),
			).rejects.toThrow(BadRequestError);
			await expect(
				controller.acceptInvitation(req, mockResponse, validPayload, inviteeId),
			).rejects.toThrow('Invalid payload or URL');
		});

		it('should throw BadRequestError when invitation is already accepted', async () => {
			// Arrange
			const req = mock<AuthlessRequest>();

			const inviter = mock<User>({
				id: 'inviter-123',
				email: 'inviter@example.com',
			});

			const invitee = mock<User>({
				id: 'invitee-456',
				email: 'invitee@example.com',
				password: 'alreadyHashed', // Already accepted
			});

			userRepository.findManyByIds.mockResolvedValue([inviter, invitee]);

			// Act & Assert
			await expect(
				controller.acceptInvitation(req, mockResponse, validPayload, inviteeId),
			).rejects.toThrow(BadRequestError);
			await expect(
				controller.acceptInvitation(req, mockResponse, validPayload, inviteeId),
			).rejects.toThrow('This invite has been accepted already');
			expect(passwordUtility.hash).not.toHaveBeenCalled();
		});

		it('should handle password hashing errors', async () => {
			// Arrange
			const req = mock<AuthlessRequest>();

			const inviter = mock<User>({
				id: 'inviter-123',
				email: 'inviter@example.com',
			});

			const invitee = mock<User>({
				id: 'invitee-456',
				email: 'invitee@example.com',
				password: null,
			});

			userRepository.findManyByIds.mockResolvedValue([inviter, invitee]);
			passwordUtility.hash.mockRejectedValue(new Error('Hashing failed'));

			// Act & Assert
			await expect(
				controller.acceptInvitation(req, mockResponse, validPayload, inviteeId),
			).rejects.toThrow('Hashing failed');
		});

		it('should handle database save errors', async () => {
			// Arrange
			const req = mock<AuthlessRequest>();

			const inviter = mock<User>({
				id: 'inviter-123',
				email: 'inviter@example.com',
			});

			const invitee = mock<User>({
				id: 'invitee-456',
				email: 'invitee@example.com',
				password: null,
			});

			userRepository.findManyByIds.mockResolvedValue([inviter, invitee]);
			passwordUtility.hash.mockResolvedValue('hashedPassword');
			userRepository.save.mockRejectedValue(new Error('Database save failed'));

			// Act & Assert
			await expect(
				controller.acceptInvitation(req, mockResponse, validPayload, inviteeId),
			).rejects.toThrow('Database save failed');
		});

		it('should handle external hooks errors during profile update', async () => {
			// Arrange
			const req = mock<AuthlessRequest>({
				browserId: 'browser-123',
			});

			const inviter = mock<User>({
				id: 'inviter-123',
				email: 'inviter@example.com',
			});

			const invitee = mock<User>({
				id: 'invitee-456',
				email: 'invitee@example.com',
				password: null,
			});

			const updatedInvitee = mock<User>({
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

			// Act & Assert
			await expect(
				controller.acceptInvitation(req, mockResponse, validPayload, inviteeId),
			).rejects.toThrow('External hook failed');
		});
	});
});

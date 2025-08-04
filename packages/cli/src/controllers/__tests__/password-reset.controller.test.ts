// Import types to avoid schema issues
type ChangePasswordRequestDto = {
	token: string;
	password: string;
	mfaCode?: string;
};

type ForgotPasswordRequestDto = {
	email: string;
};

type ResolvePasswordTokenQueryDto = {
	token: string;
};
import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { Response } from 'express';
import { mock } from 'jest-mock-extended';

import { AuthService } from '@/auth/auth.service';
import { RESPONSE_ERROR_MESSAGES } from '@/constants';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { UnprocessableRequestError } from '@/errors/response-errors/unprocessable.error';
import { EventService } from '@/events/event.service';
import { ExternalHooks } from '@/external-hooks';
import { License } from '@/license';
import { MfaService } from '@/mfa/mfa.service';
import type { AuthlessRequest } from '@/requests';
import { PasswordUtility } from '@/services/password.utility';
import { UserService } from '@/services/user.service';
import { UserManagementMailer } from '@/user-management/email';

// Mock the problematic api-types import in the controller
jest.mock('@n8n/api-types', () => ({}));

import { PasswordResetController } from '../password-reset.controller';

// Mock SSO helpers
jest.mock('@/sso.ee/sso-helpers', () => ({
	isSamlCurrentAuthenticationMethod: jest.fn(),
	isOidcCurrentAuthenticationMethod: jest.fn(),
}));

// Mock permissions
jest.mock('@n8n/permissions', () => ({
	hasGlobalScope: jest.fn(),
}));

describe('PasswordResetController', () => {
	mockInstance(Logger);

	const logger = Container.get(Logger);
	const externalHooks = mockInstance(ExternalHooks);
	const mailer = mockInstance(UserManagementMailer);
	const authService = mockInstance(AuthService);
	const userService = mockInstance(UserService);
	const mfaService = mockInstance(MfaService);
	const license = mockInstance(License);
	const passwordUtility = mockInstance(PasswordUtility);
	const userRepository = mockInstance(UserRepository);
	const eventService = mockInstance(EventService);

	const controller = Container.get(PasswordResetController);

	const mockUser = mock<User>({
		id: 'user-123',
		email: 'test@example.com',
		firstName: 'Test',
		lastName: 'User',
		role: 'global:member',
		password: 'hashedPassword',
		mfaEnabled: false,
		authIdentities: [],
		settings: {},
		disabled: false,
	});

	const mockRequest = mock<AuthlessRequest>({
		browserId: 'browser-123',
	});

	const mockResponse = mock<Response>();

	beforeEach(() => {
		jest.clearAllMocks();

		// Default mocks
		mailer.isEmailSetUp = true;
		license.isWithinUsersLimit.mockReturnValue(true);
		license.isLdapEnabled.mockReturnValue(false);

		// Mock SSO helpers
		const {
			isSamlCurrentAuthenticationMethod,
			isOidcCurrentAuthenticationMethod,
		} = require('@/sso.ee/sso-helpers');
		isSamlCurrentAuthenticationMethod.mockReturnValue(false);
		isOidcCurrentAuthenticationMethod.mockReturnValue(false);

		// Mock permissions
		const { hasGlobalScope } = require('@n8n/permissions');
		hasGlobalScope.mockReturnValue(false);
	});

	describe('forgotPassword', () => {
		const validPayload: ForgotPasswordRequestDto = {
			email: 'test@example.com',
		};

		it('should send password reset email successfully', async () => {
			// Arrange
			userRepository.findNonShellUser.mockResolvedValue(mockUser);
			authService.generatePasswordResetUrl.mockReturnValue(
				'https://example.com/reset?token=abc123',
			);
			mailer.passwordReset.mockResolvedValue(undefined);

			// Act
			await controller.forgotPassword(mockRequest, mockResponse, validPayload);

			// Assert
			expect(userRepository.findNonShellUser).toHaveBeenCalledWith('test@example.com');
			expect(authService.generatePasswordResetUrl).toHaveBeenCalledWith(mockUser);
			expect(mailer.passwordReset).toHaveBeenCalledWith({
				email: 'test@example.com',
				firstName: 'Test',
				passwordResetUrl: 'https://example.com/reset?token=abc123',
			});
			expect(eventService.emit).toHaveBeenCalledWith('user-transactional-email-sent', {
				userId: 'user-123',
				messageType: 'Reset password',
				publicApi: false,
			});
			expect(eventService.emit).toHaveBeenCalledWith('user-password-reset-request-click', {
				user: mockUser,
			});
		});

		it('should throw InternalServerError when email is not set up', async () => {
			// Arrange
			mailer.isEmailSetUp = false;

			// Act & Assert
			await expect(
				controller.forgotPassword(mockRequest, mockResponse, validPayload),
			).rejects.toThrow(InternalServerError);
			await expect(
				controller.forgotPassword(mockRequest, mockResponse, validPayload),
			).rejects.toThrow('Email sending must be set up in order to request a password reset email');
		});

		it('should return early when user is not found', async () => {
			// Arrange
			userRepository.findNonShellUser.mockResolvedValue(null);

			// Act
			const result = await controller.forgotPassword(mockRequest, mockResponse, validPayload);

			// Assert
			expect(result).toBeUndefined();
			expect(userRepository.findNonShellUser).toHaveBeenCalledWith('test@example.com');
			expect(mailer.passwordReset).not.toHaveBeenCalled();
		});

		it('should throw ForbiddenError when user limit is reached for non-owner', async () => {
			// Arrange
			userRepository.findNonShellUser.mockResolvedValue(mockUser);
			license.isWithinUsersLimit.mockReturnValue(false);

			// Act & Assert
			await expect(
				controller.forgotPassword(mockRequest, mockResponse, validPayload),
			).rejects.toThrow(ForbiddenError);
			await expect(
				controller.forgotPassword(mockRequest, mockResponse, validPayload),
			).rejects.toThrow(RESPONSE_ERROR_MESSAGES.USERS_QUOTA_REACHED);
		});

		it('should allow password reset for owner even when user limit is reached', async () => {
			// Arrange
			const ownerUser = { ...mockUser, role: 'global:owner' } as User;
			userRepository.findNonShellUser.mockResolvedValue(ownerUser);
			license.isWithinUsersLimit.mockReturnValue(false);
			authService.generatePasswordResetUrl.mockReturnValue(
				'https://example.com/reset?token=abc123',
			);
			mailer.passwordReset.mockResolvedValue(undefined);

			// Act
			await controller.forgotPassword(mockRequest, mockResponse, validPayload);

			// Assert
			expect(mailer.passwordReset).toHaveBeenCalled();
		});

		it('should throw ForbiddenError when SAML is enabled and user cannot reset password', async () => {
			// Arrange
			userRepository.findNonShellUser.mockResolvedValue(mockUser);
			const { isSamlCurrentAuthenticationMethod } = require('@/sso.ee/sso-helpers');
			isSamlCurrentAuthenticationMethod.mockReturnValue(true);

			// Act & Assert
			await expect(
				controller.forgotPassword(mockRequest, mockResponse, validPayload),
			).rejects.toThrow(ForbiddenError);
			await expect(
				controller.forgotPassword(mockRequest, mockResponse, validPayload),
			).rejects.toThrow(
				'Login is handled by SAML. Please contact your Identity Provider to reset your password.',
			);
		});

		it('should throw ForbiddenError when OIDC is enabled and user cannot reset password', async () => {
			// Arrange
			userRepository.findNonShellUser.mockResolvedValue(mockUser);
			const { isOidcCurrentAuthenticationMethod } = require('@/sso.ee/sso-helpers');
			isOidcCurrentAuthenticationMethod.mockReturnValue(true);

			// Act & Assert
			await expect(
				controller.forgotPassword(mockRequest, mockResponse, validPayload),
			).rejects.toThrow(ForbiddenError);
			await expect(
				controller.forgotPassword(mockRequest, mockResponse, validPayload),
			).rejects.toThrow(
				'Login is handled by OIDC. Please contact your Identity Provider to reset your password.',
			);
		});

		it('should allow password reset when SAML is enabled but user has reset permission', async () => {
			// Arrange
			userRepository.findNonShellUser.mockResolvedValue(mockUser);
			const { isSamlCurrentAuthenticationMethod } = require('@/sso.ee/sso-helpers');
			const { hasGlobalScope } = require('@n8n/permissions');
			isSamlCurrentAuthenticationMethod.mockReturnValue(true);
			hasGlobalScope.mockReturnValue(true);
			authService.generatePasswordResetUrl.mockReturnValue(
				'https://example.com/reset?token=abc123',
			);
			mailer.passwordReset.mockResolvedValue(undefined);

			// Act
			await controller.forgotPassword(mockRequest, mockResponse, validPayload);

			// Assert
			expect(hasGlobalScope).toHaveBeenCalledWith(mockUser, 'user:resetPassword');
			expect(mailer.passwordReset).toHaveBeenCalled();
		});

		it('should allow password reset when SAML is enabled but user allows manual login', async () => {
			// Arrange
			const userWithSSOLogin = {
				...mockUser,
				settings: { allowSSOManualLogin: true },
			} as User;
			userRepository.findNonShellUser.mockResolvedValue(userWithSSOLogin);
			const { isSamlCurrentAuthenticationMethod } = require('@/sso.ee/sso-helpers');
			isSamlCurrentAuthenticationMethod.mockReturnValue(true);
			authService.generatePasswordResetUrl.mockReturnValue(
				'https://example.com/reset?token=abc123',
			);
			mailer.passwordReset.mockResolvedValue(undefined);

			// Act
			await controller.forgotPassword(mockRequest, mockResponse, validPayload);

			// Assert
			expect(mailer.passwordReset).toHaveBeenCalled();
		});

		it('should return early when user has no password', async () => {
			// Arrange
			const userWithoutPassword = { ...mockUser, password: null } as User;
			userRepository.findNonShellUser.mockResolvedValue(userWithoutPassword);

			// Act
			const result = await controller.forgotPassword(mockRequest, mockResponse, validPayload);

			// Assert
			expect(result).toBeUndefined();
			expect(mailer.passwordReset).not.toHaveBeenCalled();
		});

		it('should return early when LDAP user is disabled', async () => {
			// Arrange
			const ldapUser = {
				...mockUser,
				authIdentities: [{ providerType: 'ldap' }],
				disabled: true,
			} as User;
			userRepository.findNonShellUser.mockResolvedValue(ldapUser);

			// Act
			const result = await controller.forgotPassword(mockRequest, mockResponse, validPayload);

			// Assert
			expect(result).toBeUndefined();
			expect(mailer.passwordReset).not.toHaveBeenCalled();
		});

		it('should throw UnprocessableRequestError for LDAP users when LDAP is enabled', async () => {
			// Arrange
			const ldapUser = {
				...mockUser,
				authIdentities: [{ providerType: 'ldap' }],
			} as User;
			userRepository.findNonShellUser.mockResolvedValue(ldapUser);
			license.isLdapEnabled.mockReturnValue(true);

			// Act & Assert
			await expect(
				controller.forgotPassword(mockRequest, mockResponse, validPayload),
			).rejects.toThrow(UnprocessableRequestError);
			await expect(
				controller.forgotPassword(mockRequest, mockResponse, validPayload),
			).rejects.toThrow('forgotPassword.ldapUserPasswordResetUnavailable');
		});

		it('should handle email sending errors', async () => {
			// Arrange
			userRepository.findNonShellUser.mockResolvedValue(mockUser);
			authService.generatePasswordResetUrl.mockReturnValue(
				'https://example.com/reset?token=abc123',
			);
			const emailError = new Error('SMTP server down');
			mailer.passwordReset.mockRejectedValue(emailError);

			// Act & Assert
			await expect(
				controller.forgotPassword(mockRequest, mockResponse, validPayload),
			).rejects.toThrow(InternalServerError);
			await expect(
				controller.forgotPassword(mockRequest, mockResponse, validPayload),
			).rejects.toThrow('Please contact your administrator: SMTP server down');
			expect(eventService.emit).toHaveBeenCalledWith('email-failed', {
				user: mockUser,
				messageType: 'Reset password',
				publicApi: false,
			});
		});
	});

	describe('resolvePasswordToken', () => {
		const validQuery: ResolvePasswordTokenQueryDto = {
			token: 'valid-token-123',
		};

		it('should resolve password token successfully', async () => {
			// Arrange
			authService.resolvePasswordResetToken.mockResolvedValue(mockUser);

			// Act
			await controller.resolvePasswordToken(mockRequest, mockResponse, validQuery);

			// Assert
			expect(authService.resolvePasswordResetToken).toHaveBeenCalledWith('valid-token-123');
			expect(eventService.emit).toHaveBeenCalledWith('user-password-reset-email-click', {
				user: mockUser,
			});
		});

		it('should throw NotFoundError when token is invalid', async () => {
			// Arrange
			authService.resolvePasswordResetToken.mockResolvedValue(null);

			// Act & Assert
			await expect(
				controller.resolvePasswordToken(mockRequest, mockResponse, validQuery),
			).rejects.toThrow(NotFoundError);
		});

		it('should throw ForbiddenError when user limit is reached for non-owner', async () => {
			// Arrange
			authService.resolvePasswordResetToken.mockResolvedValue(mockUser);
			license.isWithinUsersLimit.mockReturnValue(false);

			// Act & Assert
			await expect(
				controller.resolvePasswordToken(mockRequest, mockResponse, validQuery),
			).rejects.toThrow(ForbiddenError);
			await expect(
				controller.resolvePasswordToken(mockRequest, mockResponse, validQuery),
			).rejects.toThrow(RESPONSE_ERROR_MESSAGES.USERS_QUOTA_REACHED);
		});

		it('should allow token resolution for owner even when user limit is reached', async () => {
			// Arrange
			const ownerUser = { ...mockUser, role: 'global:owner' } as User;
			authService.resolvePasswordResetToken.mockResolvedValue(ownerUser);
			license.isWithinUsersLimit.mockReturnValue(false);

			// Act
			await controller.resolvePasswordToken(mockRequest, mockResponse, validQuery);

			// Assert
			expect(eventService.emit).toHaveBeenCalledWith('user-password-reset-email-click', {
				user: ownerUser,
			});
		});
	});

	describe('changePassword', () => {
		const validPayload: ChangePasswordRequestDto = {
			token: 'valid-token-123',
			password: 'newSecurePassword123!',
		};

		it('should change password successfully for user without MFA', async () => {
			// Arrange
			authService.resolvePasswordResetToken.mockResolvedValue(mockUser);
			passwordUtility.hash.mockResolvedValue('hashedNewPassword');
			userService.update.mockResolvedValue(mockUser);
			authService.issueCookie.mockReturnValue(undefined);
			externalHooks.run.mockResolvedValue(undefined);

			// Act
			await controller.changePassword(mockRequest, mockResponse, validPayload);

			// Assert
			expect(authService.resolvePasswordResetToken).toHaveBeenCalledWith('valid-token-123');
			expect(passwordUtility.hash).toHaveBeenCalledWith('newSecurePassword123!');
			expect(userService.update).toHaveBeenCalledWith('user-123', {
				password: 'hashedNewPassword',
			});
			expect(authService.issueCookie).toHaveBeenCalledWith(
				mockResponse,
				mockUser,
				false,
				'browser-123',
			);
			expect(eventService.emit).toHaveBeenCalledWith('user-updated', {
				user: mockUser,
				fieldsChanged: ['password'],
			});
			expect(externalHooks.run).toHaveBeenCalledWith('user.password.update', [
				'test@example.com',
				'hashedNewPassword',
			]);
		});

		it('should change password successfully for user with MFA', async () => {
			// Arrange
			const mfaUser = { ...mockUser, mfaEnabled: true } as User;
			const payloadWithMfa = { ...validPayload, mfaCode: '123456' };

			authService.resolvePasswordResetToken.mockResolvedValue(mfaUser);
			mfaService.getSecretAndRecoveryCodes.mockResolvedValue({
				decryptedSecret: 'mfa-secret',
				decryptedRecoveryCodes: [],
			});
			mfaService.totp = {
				verifySecret: jest.fn().mockReturnValue(true),
			} as any;
			passwordUtility.hash.mockResolvedValue('hashedNewPassword');
			userService.update.mockResolvedValue(mfaUser);
			authService.issueCookie.mockReturnValue(undefined);
			externalHooks.run.mockResolvedValue(undefined);

			// Act
			await controller.changePassword(mockRequest, mockResponse, payloadWithMfa);

			// Assert
			expect(mfaService.getSecretAndRecoveryCodes).toHaveBeenCalledWith('user-123');
			expect(mfaService.totp.verifySecret).toHaveBeenCalledWith({
				secret: 'mfa-secret',
				mfaCode: '123456',
			});
			expect(authService.issueCookie).toHaveBeenCalledWith(
				mockResponse,
				mfaUser,
				true,
				'browser-123',
			);
		});

		it('should throw NotFoundError when token is invalid', async () => {
			// Arrange
			authService.resolvePasswordResetToken.mockResolvedValue(null);

			// Act & Assert
			await expect(
				controller.changePassword(mockRequest, mockResponse, validPayload),
			).rejects.toThrow(NotFoundError);
		});

		it('should throw BadRequestError when MFA is enabled but code is missing', async () => {
			// Arrange
			const mfaUser = { ...mockUser, mfaEnabled: true } as User;
			authService.resolvePasswordResetToken.mockResolvedValue(mfaUser);

			// Act & Assert
			await expect(
				controller.changePassword(mockRequest, mockResponse, validPayload),
			).rejects.toThrow(BadRequestError);
			await expect(
				controller.changePassword(mockRequest, mockResponse, validPayload),
			).rejects.toThrow('If MFA enabled, mfaCode is required.');
		});

		it('should throw BadRequestError when MFA code is invalid', async () => {
			// Arrange
			const mfaUser = { ...mockUser, mfaEnabled: true } as User;
			const payloadWithInvalidMfa = { ...validPayload, mfaCode: 'invalid' };

			authService.resolvePasswordResetToken.mockResolvedValue(mfaUser);
			mfaService.getSecretAndRecoveryCodes.mockResolvedValue({
				decryptedSecret: 'mfa-secret',
				decryptedRecoveryCodes: [],
			});
			mfaService.totp = {
				verifySecret: jest.fn().mockReturnValue(false),
			} as any;

			// Act & Assert
			await expect(
				controller.changePassword(mockRequest, mockResponse, payloadWithInvalidMfa),
			).rejects.toThrow(BadRequestError);
			await expect(
				controller.changePassword(mockRequest, mockResponse, payloadWithInvalidMfa),
			).rejects.toThrow('Invalid MFA token.');
		});

		it('should emit user-signed-up event for LDAP users', async () => {
			// Arrange
			const ldapUser = {
				...mockUser,
				authIdentities: [{ providerType: 'ldap' }],
			} as User;

			authService.resolvePasswordResetToken.mockResolvedValue(ldapUser);
			passwordUtility.hash.mockResolvedValue('hashedNewPassword');
			userService.update.mockResolvedValue(ldapUser);
			authService.issueCookie.mockReturnValue(undefined);
			externalHooks.run.mockResolvedValue(undefined);

			// Act
			await controller.changePassword(mockRequest, mockResponse, validPayload);

			// Assert
			expect(eventService.emit).toHaveBeenCalledWith('user-signed-up', {
				user: ldapUser,
				userType: 'email',
				wasDisabledLdapUser: true,
			});
		});

		it('should handle password hashing errors', async () => {
			// Arrange
			authService.resolvePasswordResetToken.mockResolvedValue(mockUser);
			const hashError = new Error('Hashing failed');
			passwordUtility.hash.mockRejectedValue(hashError);

			// Act & Assert
			await expect(
				controller.changePassword(mockRequest, mockResponse, validPayload),
			).rejects.toThrow('Hashing failed');
		});

		it('should handle user service update errors', async () => {
			// Arrange
			authService.resolvePasswordResetToken.mockResolvedValue(mockUser);
			passwordUtility.hash.mockResolvedValue('hashedNewPassword');
			const updateError = new Error('Database update failed');
			userService.update.mockRejectedValue(updateError);

			// Act & Assert
			await expect(
				controller.changePassword(mockRequest, mockResponse, validPayload),
			).rejects.toThrow('Database update failed');
		});

		it('should handle external hooks errors', async () => {
			// Arrange
			authService.resolvePasswordResetToken.mockResolvedValue(mockUser);
			passwordUtility.hash.mockResolvedValue('hashedNewPassword');
			userService.update.mockResolvedValue(mockUser);
			authService.issueCookie.mockReturnValue(undefined);
			const hooksError = new Error('External hook failed');
			externalHooks.run.mockRejectedValue(hooksError);

			// Act & Assert
			await expect(
				controller.changePassword(mockRequest, mockResponse, validPayload),
			).rejects.toThrow('External hook failed');
		});
	});
});

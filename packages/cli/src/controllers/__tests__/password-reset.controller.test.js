'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_common_1 = require('@n8n/backend-common');
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const jest_mock_extended_1 = require('jest-mock-extended');
const auth_service_1 = require('@/auth/auth.service');
const constants_1 = require('@/constants');
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const forbidden_error_1 = require('@/errors/response-errors/forbidden.error');
const internal_server_error_1 = require('@/errors/response-errors/internal-server.error');
const not_found_error_1 = require('@/errors/response-errors/not-found.error');
const unprocessable_error_1 = require('@/errors/response-errors/unprocessable.error');
const event_service_1 = require('@/events/event.service');
const external_hooks_1 = require('@/external-hooks');
const license_1 = require('@/license');
const mfa_service_1 = require('@/mfa/mfa.service');
const password_utility_1 = require('@/services/password.utility');
const user_service_1 = require('@/services/user.service');
const email_1 = require('@/user-management/email');
jest.mock('@n8n/api-types', () => ({}));
const password_reset_controller_1 = require('../password-reset.controller');
jest.mock('@/sso.ee/sso-helpers', () => ({
	isSamlCurrentAuthenticationMethod: jest.fn(),
	isOidcCurrentAuthenticationMethod: jest.fn(),
}));
jest.mock('@n8n/permissions', () => ({
	hasGlobalScope: jest.fn(),
}));
describe('PasswordResetController', () => {
	(0, backend_test_utils_1.mockInstance)(backend_common_1.Logger);
	const logger = di_1.Container.get(backend_common_1.Logger);
	const externalHooks = (0, backend_test_utils_1.mockInstance)(external_hooks_1.ExternalHooks);
	const mailer = (0, backend_test_utils_1.mockInstance)(email_1.UserManagementMailer);
	const authService = (0, backend_test_utils_1.mockInstance)(auth_service_1.AuthService);
	const userService = (0, backend_test_utils_1.mockInstance)(user_service_1.UserService);
	const mfaService = (0, backend_test_utils_1.mockInstance)(mfa_service_1.MfaService);
	const license = (0, backend_test_utils_1.mockInstance)(license_1.License);
	const passwordUtility = (0, backend_test_utils_1.mockInstance)(
		password_utility_1.PasswordUtility,
	);
	const userRepository = (0, backend_test_utils_1.mockInstance)(db_1.UserRepository);
	const eventService = (0, backend_test_utils_1.mockInstance)(event_service_1.EventService);
	const controller = di_1.Container.get(password_reset_controller_1.PasswordResetController);
	const mockUser = (0, jest_mock_extended_1.mock)({
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
	const mockRequest = (0, jest_mock_extended_1.mock)({
		browserId: 'browser-123',
	});
	const mockResponse = (0, jest_mock_extended_1.mock)();
	beforeEach(() => {
		jest.clearAllMocks();
		mailer.isEmailSetUp = true;
		license.isWithinUsersLimit.mockReturnValue(true);
		license.isLdapEnabled.mockReturnValue(false);
		const {
			isSamlCurrentAuthenticationMethod,
			isOidcCurrentAuthenticationMethod,
		} = require('@/sso.ee/sso-helpers');
		isSamlCurrentAuthenticationMethod.mockReturnValue(false);
		isOidcCurrentAuthenticationMethod.mockReturnValue(false);
		const { hasGlobalScope } = require('@n8n/permissions');
		hasGlobalScope.mockReturnValue(false);
	});
	describe('forgotPassword', () => {
		const validPayload = {
			email: 'test@example.com',
		};
		it('should send password reset email successfully', async () => {
			userRepository.findNonShellUser.mockResolvedValue(mockUser);
			authService.generatePasswordResetUrl.mockReturnValue(
				'https://example.com/reset?token=abc123',
			);
			mailer.passwordReset.mockResolvedValue(undefined);
			await controller.forgotPassword(mockRequest, mockResponse, validPayload);
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
			mailer.isEmailSetUp = false;
			await expect(
				controller.forgotPassword(mockRequest, mockResponse, validPayload),
			).rejects.toThrow(internal_server_error_1.InternalServerError);
			await expect(
				controller.forgotPassword(mockRequest, mockResponse, validPayload),
			).rejects.toThrow('Email sending must be set up in order to request a password reset email');
		});
		it('should return early when user is not found', async () => {
			userRepository.findNonShellUser.mockResolvedValue(null);
			const result = await controller.forgotPassword(mockRequest, mockResponse, validPayload);
			expect(result).toBeUndefined();
			expect(userRepository.findNonShellUser).toHaveBeenCalledWith('test@example.com');
			expect(mailer.passwordReset).not.toHaveBeenCalled();
		});
		it('should throw ForbiddenError when user limit is reached for non-owner', async () => {
			userRepository.findNonShellUser.mockResolvedValue(mockUser);
			license.isWithinUsersLimit.mockReturnValue(false);
			await expect(
				controller.forgotPassword(mockRequest, mockResponse, validPayload),
			).rejects.toThrow(forbidden_error_1.ForbiddenError);
			await expect(
				controller.forgotPassword(mockRequest, mockResponse, validPayload),
			).rejects.toThrow(constants_1.RESPONSE_ERROR_MESSAGES.USERS_QUOTA_REACHED);
		});
		it('should allow password reset for owner even when user limit is reached', async () => {
			const ownerUser = { ...mockUser, role: 'global:owner' };
			userRepository.findNonShellUser.mockResolvedValue(ownerUser);
			license.isWithinUsersLimit.mockReturnValue(false);
			authService.generatePasswordResetUrl.mockReturnValue(
				'https://example.com/reset?token=abc123',
			);
			mailer.passwordReset.mockResolvedValue(undefined);
			await controller.forgotPassword(mockRequest, mockResponse, validPayload);
			expect(mailer.passwordReset).toHaveBeenCalled();
		});
		it('should throw ForbiddenError when SAML is enabled and user cannot reset password', async () => {
			userRepository.findNonShellUser.mockResolvedValue(mockUser);
			const { isSamlCurrentAuthenticationMethod } = require('@/sso.ee/sso-helpers');
			isSamlCurrentAuthenticationMethod.mockReturnValue(true);
			await expect(
				controller.forgotPassword(mockRequest, mockResponse, validPayload),
			).rejects.toThrow(forbidden_error_1.ForbiddenError);
			await expect(
				controller.forgotPassword(mockRequest, mockResponse, validPayload),
			).rejects.toThrow(
				'Login is handled by SAML. Please contact your Identity Provider to reset your password.',
			);
		});
		it('should throw ForbiddenError when OIDC is enabled and user cannot reset password', async () => {
			userRepository.findNonShellUser.mockResolvedValue(mockUser);
			const { isOidcCurrentAuthenticationMethod } = require('@/sso.ee/sso-helpers');
			isOidcCurrentAuthenticationMethod.mockReturnValue(true);
			await expect(
				controller.forgotPassword(mockRequest, mockResponse, validPayload),
			).rejects.toThrow(forbidden_error_1.ForbiddenError);
			await expect(
				controller.forgotPassword(mockRequest, mockResponse, validPayload),
			).rejects.toThrow(
				'Login is handled by OIDC. Please contact your Identity Provider to reset your password.',
			);
		});
		it('should allow password reset when SAML is enabled but user has reset permission', async () => {
			userRepository.findNonShellUser.mockResolvedValue(mockUser);
			const { isSamlCurrentAuthenticationMethod } = require('@/sso.ee/sso-helpers');
			const { hasGlobalScope } = require('@n8n/permissions');
			isSamlCurrentAuthenticationMethod.mockReturnValue(true);
			hasGlobalScope.mockReturnValue(true);
			authService.generatePasswordResetUrl.mockReturnValue(
				'https://example.com/reset?token=abc123',
			);
			mailer.passwordReset.mockResolvedValue(undefined);
			await controller.forgotPassword(mockRequest, mockResponse, validPayload);
			expect(hasGlobalScope).toHaveBeenCalledWith(mockUser, 'user:resetPassword');
			expect(mailer.passwordReset).toHaveBeenCalled();
		});
		it('should allow password reset when SAML is enabled but user allows manual login', async () => {
			const userWithSSOLogin = {
				...mockUser,
				settings: { allowSSOManualLogin: true },
			};
			userRepository.findNonShellUser.mockResolvedValue(userWithSSOLogin);
			const { isSamlCurrentAuthenticationMethod } = require('@/sso.ee/sso-helpers');
			isSamlCurrentAuthenticationMethod.mockReturnValue(true);
			authService.generatePasswordResetUrl.mockReturnValue(
				'https://example.com/reset?token=abc123',
			);
			mailer.passwordReset.mockResolvedValue(undefined);
			await controller.forgotPassword(mockRequest, mockResponse, validPayload);
			expect(mailer.passwordReset).toHaveBeenCalled();
		});
		it('should return early when user has no password', async () => {
			const userWithoutPassword = { ...mockUser, password: null };
			userRepository.findNonShellUser.mockResolvedValue(userWithoutPassword);
			const result = await controller.forgotPassword(mockRequest, mockResponse, validPayload);
			expect(result).toBeUndefined();
			expect(mailer.passwordReset).not.toHaveBeenCalled();
		});
		it('should return early when LDAP user is disabled', async () => {
			const ldapUser = {
				...mockUser,
				authIdentities: [{ providerType: 'ldap' }],
				disabled: true,
			};
			userRepository.findNonShellUser.mockResolvedValue(ldapUser);
			const result = await controller.forgotPassword(mockRequest, mockResponse, validPayload);
			expect(result).toBeUndefined();
			expect(mailer.passwordReset).not.toHaveBeenCalled();
		});
		it('should throw UnprocessableRequestError for LDAP users when LDAP is enabled', async () => {
			const ldapUser = {
				...mockUser,
				authIdentities: [{ providerType: 'ldap' }],
			};
			userRepository.findNonShellUser.mockResolvedValue(ldapUser);
			license.isLdapEnabled.mockReturnValue(true);
			await expect(
				controller.forgotPassword(mockRequest, mockResponse, validPayload),
			).rejects.toThrow(unprocessable_error_1.UnprocessableRequestError);
			await expect(
				controller.forgotPassword(mockRequest, mockResponse, validPayload),
			).rejects.toThrow('forgotPassword.ldapUserPasswordResetUnavailable');
		});
		it('should handle email sending errors', async () => {
			userRepository.findNonShellUser.mockResolvedValue(mockUser);
			authService.generatePasswordResetUrl.mockReturnValue(
				'https://example.com/reset?token=abc123',
			);
			const emailError = new Error('SMTP server down');
			mailer.passwordReset.mockRejectedValue(emailError);
			await expect(
				controller.forgotPassword(mockRequest, mockResponse, validPayload),
			).rejects.toThrow(internal_server_error_1.InternalServerError);
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
		const validQuery = {
			token: 'valid-token-123',
		};
		it('should resolve password token successfully', async () => {
			authService.resolvePasswordResetToken.mockResolvedValue(mockUser);
			await controller.resolvePasswordToken(mockRequest, mockResponse, validQuery);
			expect(authService.resolvePasswordResetToken).toHaveBeenCalledWith('valid-token-123');
			expect(eventService.emit).toHaveBeenCalledWith('user-password-reset-email-click', {
				user: mockUser,
			});
		});
		it('should throw NotFoundError when token is invalid', async () => {
			authService.resolvePasswordResetToken.mockResolvedValue(null);
			await expect(
				controller.resolvePasswordToken(mockRequest, mockResponse, validQuery),
			).rejects.toThrow(not_found_error_1.NotFoundError);
		});
		it('should throw ForbiddenError when user limit is reached for non-owner', async () => {
			authService.resolvePasswordResetToken.mockResolvedValue(mockUser);
			license.isWithinUsersLimit.mockReturnValue(false);
			await expect(
				controller.resolvePasswordToken(mockRequest, mockResponse, validQuery),
			).rejects.toThrow(forbidden_error_1.ForbiddenError);
			await expect(
				controller.resolvePasswordToken(mockRequest, mockResponse, validQuery),
			).rejects.toThrow(constants_1.RESPONSE_ERROR_MESSAGES.USERS_QUOTA_REACHED);
		});
		it('should allow token resolution for owner even when user limit is reached', async () => {
			const ownerUser = { ...mockUser, role: 'global:owner' };
			authService.resolvePasswordResetToken.mockResolvedValue(ownerUser);
			license.isWithinUsersLimit.mockReturnValue(false);
			await controller.resolvePasswordToken(mockRequest, mockResponse, validQuery);
			expect(eventService.emit).toHaveBeenCalledWith('user-password-reset-email-click', {
				user: ownerUser,
			});
		});
	});
	describe('changePassword', () => {
		const validPayload = {
			token: 'valid-token-123',
			password: 'newSecurePassword123!',
		};
		it('should change password successfully for user without MFA', async () => {
			authService.resolvePasswordResetToken.mockResolvedValue(mockUser);
			passwordUtility.hash.mockResolvedValue('hashedNewPassword');
			userService.update.mockResolvedValue(mockUser);
			authService.issueCookie.mockReturnValue(undefined);
			externalHooks.run.mockResolvedValue(undefined);
			await controller.changePassword(mockRequest, mockResponse, validPayload);
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
			const mfaUser = { ...mockUser, mfaEnabled: true };
			const payloadWithMfa = { ...validPayload, mfaCode: '123456' };
			authService.resolvePasswordResetToken.mockResolvedValue(mfaUser);
			mfaService.getSecretAndRecoveryCodes.mockResolvedValue({
				decryptedSecret: 'mfa-secret',
				decryptedRecoveryCodes: [],
			});
			mfaService.totp = {
				verifySecret: jest.fn().mockReturnValue(true),
			};
			passwordUtility.hash.mockResolvedValue('hashedNewPassword');
			userService.update.mockResolvedValue(mfaUser);
			authService.issueCookie.mockReturnValue(undefined);
			externalHooks.run.mockResolvedValue(undefined);
			await controller.changePassword(mockRequest, mockResponse, payloadWithMfa);
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
			authService.resolvePasswordResetToken.mockResolvedValue(null);
			await expect(
				controller.changePassword(mockRequest, mockResponse, validPayload),
			).rejects.toThrow(not_found_error_1.NotFoundError);
		});
		it('should throw BadRequestError when MFA is enabled but code is missing', async () => {
			const mfaUser = { ...mockUser, mfaEnabled: true };
			authService.resolvePasswordResetToken.mockResolvedValue(mfaUser);
			await expect(
				controller.changePassword(mockRequest, mockResponse, validPayload),
			).rejects.toThrow(bad_request_error_1.BadRequestError);
			await expect(
				controller.changePassword(mockRequest, mockResponse, validPayload),
			).rejects.toThrow('If MFA enabled, mfaCode is required.');
		});
		it('should throw BadRequestError when MFA code is invalid', async () => {
			const mfaUser = { ...mockUser, mfaEnabled: true };
			const payloadWithInvalidMfa = { ...validPayload, mfaCode: 'invalid' };
			authService.resolvePasswordResetToken.mockResolvedValue(mfaUser);
			mfaService.getSecretAndRecoveryCodes.mockResolvedValue({
				decryptedSecret: 'mfa-secret',
				decryptedRecoveryCodes: [],
			});
			mfaService.totp = {
				verifySecret: jest.fn().mockReturnValue(false),
			};
			await expect(
				controller.changePassword(mockRequest, mockResponse, payloadWithInvalidMfa),
			).rejects.toThrow(bad_request_error_1.BadRequestError);
			await expect(
				controller.changePassword(mockRequest, mockResponse, payloadWithInvalidMfa),
			).rejects.toThrow('Invalid MFA token.');
		});
		it('should emit user-signed-up event for LDAP users', async () => {
			const ldapUser = {
				...mockUser,
				authIdentities: [{ providerType: 'ldap' }],
			};
			authService.resolvePasswordResetToken.mockResolvedValue(ldapUser);
			passwordUtility.hash.mockResolvedValue('hashedNewPassword');
			userService.update.mockResolvedValue(ldapUser);
			authService.issueCookie.mockReturnValue(undefined);
			externalHooks.run.mockResolvedValue(undefined);
			await controller.changePassword(mockRequest, mockResponse, validPayload);
			expect(eventService.emit).toHaveBeenCalledWith('user-signed-up', {
				user: ldapUser,
				userType: 'email',
				wasDisabledLdapUser: true,
			});
		});
		it('should handle password hashing errors', async () => {
			authService.resolvePasswordResetToken.mockResolvedValue(mockUser);
			const hashError = new Error('Hashing failed');
			passwordUtility.hash.mockRejectedValue(hashError);
			await expect(
				controller.changePassword(mockRequest, mockResponse, validPayload),
			).rejects.toThrow('Hashing failed');
		});
		it('should handle user service update errors', async () => {
			authService.resolvePasswordResetToken.mockResolvedValue(mockUser);
			passwordUtility.hash.mockResolvedValue('hashedNewPassword');
			const updateError = new Error('Database update failed');
			userService.update.mockRejectedValue(updateError);
			await expect(
				controller.changePassword(mockRequest, mockResponse, validPayload),
			).rejects.toThrow('Database update failed');
		});
		it('should handle external hooks errors', async () => {
			authService.resolvePasswordResetToken.mockResolvedValue(mockUser);
			passwordUtility.hash.mockResolvedValue('hashedNewPassword');
			userService.update.mockResolvedValue(mockUser);
			authService.issueCookie.mockReturnValue(undefined);
			const hooksError = new Error('External hook failed');
			externalHooks.run.mockRejectedValue(hooksError);
			await expect(
				controller.changePassword(mockRequest, mockResponse, validPayload),
			).rejects.toThrow('External hook failed');
		});
	});
});
//# sourceMappingURL=password-reset.controller.test.js.map

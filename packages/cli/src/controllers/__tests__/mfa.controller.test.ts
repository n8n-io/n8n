import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import type { AuthenticatedRequest, User } from '@n8n/db';
import { UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { Response } from 'express';
import { mock } from 'jest-mock-extended';

import { AuthService } from '@/auth/auth.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { InvalidMfaCodeError } from '@/errors/response-errors/invalid-mfa-code.error';
import { InvalidMfaRecoveryCodeError } from '@/errors/response-errors/invalid-mfa-recovery-code-error';
import { ExternalHooks } from '@/external-hooks';
import { MfaService } from '@/mfa/mfa.service';
import type { MFA } from '@/requests';

import { MFAController } from '../mfa.controller';

describe('MFAController', () => {
	mockInstance(Logger);
	mockInstance(ExternalHooks);

	const mfaService = mockInstance(MfaService);
	const authService = mockInstance(AuthService);
	const userRepository = mockInstance(UserRepository);
	const externalHooks = Container.get(ExternalHooks);

	const controller = Container.get(MFAController);

	const mockUser = mock<User>({
		id: 'user-123',
		email: 'test@example.com',
		mfaEnabled: false,
		mfaSecret: null,
		mfaRecoveryCodes: [],
	});

	const mockResponse = mock<Response>();

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('enforceMFA', () => {
		it('should enforce MFA when user has MFA enabled', async () => {
			// Arrange
			const req = mock<MFA.Enforce>({
				body: { enforce: true },
				authInfo: { usedMfa: true },
			});

			mfaService.enforceMFA.mockResolvedValue(undefined);

			// Act
			const result = await controller.enforceMFA(req);

			// Assert
			expect(mfaService.enforceMFA).toHaveBeenCalledWith(true);
			expect(result).toBeUndefined();
		});

		it('should allow disabling MFA enforcement', async () => {
			// Arrange
			const req = mock<MFA.Enforce>({
				body: { enforce: false },
				authInfo: { usedMfa: false },
			});

			mfaService.enforceMFA.mockResolvedValue(undefined);

			// Act
			const result = await controller.enforceMFA(req);

			// Assert
			expect(mfaService.enforceMFA).toHaveBeenCalledWith(false);
			expect(result).toBeUndefined();
		});

		it('should throw BadRequestError when trying to enforce MFA without having MFA enabled', async () => {
			// Arrange
			const req = mock<MFA.Enforce>({
				body: { enforce: true },
				authInfo: { usedMfa: false },
			});

			// Act & Assert
			await expect(controller.enforceMFA(req)).rejects.toThrow(BadRequestError);
			await expect(controller.enforceMFA(req)).rejects.toThrow(
				'You must enable two-factor authentication on your own account before enforcing it for all users',
			);
			expect(mfaService.enforceMFA).not.toHaveBeenCalled();
		});

		it('should handle undefined authInfo gracefully', async () => {
			// Arrange
			const req = mock<MFA.Enforce>({
				body: { enforce: true },
				authInfo: undefined,
			});

			// Act & Assert
			await expect(controller.enforceMFA(req)).rejects.toThrow(BadRequestError);
			expect(mfaService.enforceMFA).not.toHaveBeenCalled();
		});
	});

	describe('canEnableMFA', () => {
		it('should run external hooks and return successfully', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({
				user: mockUser,
			});

			externalHooks.run.mockResolvedValue(undefined);

			// Act
			const result = await controller.canEnableMFA(req);

			// Assert
			expect(externalHooks.run).toHaveBeenCalledWith('mfa.beforeSetup', [mockUser]);
			expect(result).toBeUndefined();
		});

		it('should handle external hooks errors', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({
				user: mockUser,
			});

			const error = new Error('External hook failed');
			externalHooks.run.mockRejectedValue(error);

			// Act & Assert
			await expect(controller.canEnableMFA(req)).rejects.toThrow(error);
		});
	});

	describe('getQRCode', () => {
		it('should throw BadRequestError if MFA is already enabled', async () => {
			// Arrange
			const userWithMfa = mock<User>({
				...mockUser,
				mfaEnabled: true,
			});

			const req = mock<AuthenticatedRequest>({
				user: userWithMfa,
			});

			// Act & Assert
			await expect(controller.getQRCode(req)).rejects.toThrow(BadRequestError);
			await expect(controller.getQRCode(req)).rejects.toThrow(
				'MFA already enabled. Disable it to generate new secret and recovery codes',
			);
		});

		it('should return existing secret and recovery codes if available', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({
				user: mockUser,
			});

			const mockSecret = 'existing-secret';
			const mockRecoveryCodes = ['code1', 'code2', 'code3'];
			const mockQrCode = 'otpauth://totp/test@example.com?secret=existing-secret';

			mfaService.getSecretAndRecoveryCodes.mockResolvedValue({
				decryptedSecret: mockSecret,
				decryptedRecoveryCodes: mockRecoveryCodes,
			});

			mfaService.totp = {
				generateTOTPUri: jest.fn().mockReturnValue(mockQrCode),
			} as any;

			// Act
			const result = await controller.getQRCode(req);

			// Assert
			expect(mfaService.getSecretAndRecoveryCodes).toHaveBeenCalledWith(mockUser.id);
			expect(mfaService.totp.generateTOTPUri).toHaveBeenCalledWith({
				secret: mockSecret,
				label: mockUser.email,
			});
			expect(result).toEqual({
				secret: mockSecret,
				recoveryCodes: mockRecoveryCodes,
				qrCode: mockQrCode,
			});
		});

		it('should generate new secret and recovery codes if not available', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({
				user: mockUser,
			});

			const mockNewSecret = 'new-secret';
			const mockNewRecoveryCodes = ['new-code1', 'new-code2', 'new-code3'];
			const mockQrCode = 'otpauth://totp/test@example.com?secret=new-secret';

			mfaService.getSecretAndRecoveryCodes.mockResolvedValue({
				decryptedSecret: '',
				decryptedRecoveryCodes: [],
			});

			mfaService.generateRecoveryCodes.mockReturnValue(mockNewRecoveryCodes);
			mfaService.totp = {
				generateSecret: jest.fn().mockReturnValue(mockNewSecret),
				generateTOTPUri: jest.fn().mockReturnValue(mockQrCode),
			} as any;

			mfaService.saveSecretAndRecoveryCodes.mockResolvedValue(undefined);

			// Act
			const result = await controller.getQRCode(req);

			// Assert
			expect(mfaService.generateRecoveryCodes).toHaveBeenCalled();
			expect(mfaService.totp.generateSecret).toHaveBeenCalled();
			expect(mfaService.totp.generateTOTPUri).toHaveBeenCalledWith({
				secret: mockNewSecret,
				label: mockUser.email,
			});
			expect(mfaService.saveSecretAndRecoveryCodes).toHaveBeenCalledWith(
				mockUser.id,
				mockNewSecret,
				mockNewRecoveryCodes,
			);
			expect(result).toEqual({
				secret: mockNewSecret,
				qrCode: mockQrCode,
				recoveryCodes: mockNewRecoveryCodes,
			});
		});

		it('should handle partial existing data (secret but no recovery codes)', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({
				user: mockUser,
			});

			const mockNewSecret = 'new-secret';
			const mockNewRecoveryCodes = ['new-code1', 'new-code2'];
			const mockQrCode = 'otpauth://totp/test@example.com?secret=new-secret';

			mfaService.getSecretAndRecoveryCodes.mockResolvedValue({
				decryptedSecret: 'existing-secret',
				decryptedRecoveryCodes: [], // No recovery codes
			});

			mfaService.generateRecoveryCodes.mockReturnValue(mockNewRecoveryCodes);
			mfaService.totp = {
				generateSecret: jest.fn().mockReturnValue(mockNewSecret),
				generateTOTPUri: jest.fn().mockReturnValue(mockQrCode),
			} as any;

			mfaService.saveSecretAndRecoveryCodes.mockResolvedValue(undefined);

			// Act
			const result = await controller.getQRCode(req);

			// Assert
			expect(mfaService.generateRecoveryCodes).toHaveBeenCalled();
			expect(mfaService.totp.generateSecret).toHaveBeenCalled();
			expect(mfaService.saveSecretAndRecoveryCodes).toHaveBeenCalledWith(
				mockUser.id,
				mockNewSecret,
				mockNewRecoveryCodes,
			);
			expect(result).toEqual({
				secret: mockNewSecret,
				qrCode: mockQrCode,
				recoveryCodes: mockNewRecoveryCodes,
			});
		});
	});

	describe('activateMFA', () => {
		const mockSecret = 'test-secret';
		const mockRecoveryCodes = ['code1', 'code2'];
		const mockMfaCode = '123456';

		beforeEach(() => {
			mfaService.getSecretAndRecoveryCodes.mockResolvedValue({
				decryptedSecret: mockSecret,
				decryptedRecoveryCodes: mockRecoveryCodes,
			});
		});

		it('should activate MFA successfully with valid code', async () => {
			// Arrange
			const req = mock<MFA.Activate>({
				user: mockUser,
				body: { mfaCode: mockMfaCode },
				browserId: 'browser-123',
			});

			const updatedUser = mock<User>({
				...mockUser,
				mfaEnabled: true,
			});

			externalHooks.run.mockResolvedValue(undefined);
			mfaService.totp = {
				verifySecret: jest.fn().mockReturnValue(true),
			} as any;
			mfaService.enableMfa.mockResolvedValue(updatedUser);
			authService.issueCookie.mockReturnValue(undefined);

			// Act
			await controller.activateMFA(req, mockResponse);

			// Assert
			expect(externalHooks.run).toHaveBeenCalledWith('mfa.beforeSetup', [mockUser]);
			expect(mfaService.getSecretAndRecoveryCodes).toHaveBeenCalledWith(mockUser.id);
			expect(mfaService.totp.verifySecret).toHaveBeenCalledWith({
				secret: mockSecret,
				mfaCode: mockMfaCode,
				window: 10,
			});
			expect(mfaService.enableMfa).toHaveBeenCalledWith(mockUser.id);
			expect(authService.issueCookie).toHaveBeenCalledWith(
				mockResponse,
				updatedUser,
				true,
				'browser-123',
			);
		});

		it('should throw BadRequestError if MFA code is missing', async () => {
			// Arrange
			const req = mock<MFA.Activate>({
				user: mockUser,
				body: { mfaCode: null as any },
				browserId: 'browser-123',
			});

			externalHooks.run.mockResolvedValue(undefined);

			// Act & Assert
			await expect(controller.activateMFA(req, mockResponse)).rejects.toThrow(BadRequestError);
			await expect(controller.activateMFA(req, mockResponse)).rejects.toThrow(
				'Token is required to enable MFA feature',
			);
		});

		it('should throw BadRequestError if MFA is already enabled', async () => {
			// Arrange
			const userWithMfa = mock<User>({
				...mockUser,
				mfaEnabled: true,
			});

			const req = mock<MFA.Activate>({
				user: userWithMfa,
				body: { mfaCode: mockMfaCode },
				browserId: 'browser-123',
			});

			externalHooks.run.mockResolvedValue(undefined);

			// Act & Assert
			await expect(controller.activateMFA(req, mockResponse)).rejects.toThrow(BadRequestError);
			await expect(controller.activateMFA(req, mockResponse)).rejects.toThrow(
				'MFA already enabled',
			);
		});

		it('should throw BadRequestError if secret or recovery codes are missing', async () => {
			// Arrange
			const req = mock<MFA.Activate>({
				user: mockUser,
				body: { mfaCode: mockMfaCode },
				browserId: 'browser-123',
			});

			externalHooks.run.mockResolvedValue(undefined);
			mfaService.getSecretAndRecoveryCodes.mockResolvedValue({
				decryptedSecret: '',
				decryptedRecoveryCodes: [],
			});

			// Act & Assert
			await expect(controller.activateMFA(req, mockResponse)).rejects.toThrow(BadRequestError);
			await expect(controller.activateMFA(req, mockResponse)).rejects.toThrow(
				'Cannot enable MFA without generating secret and recovery codes',
			);
		});

		it('should throw BadRequestError if MFA code verification fails', async () => {
			// Arrange
			const req = mock<MFA.Activate>({
				user: mockUser,
				body: { mfaCode: 'invalid-code' },
				browserId: 'browser-123',
			});

			externalHooks.run.mockResolvedValue(undefined);
			mfaService.totp = {
				verifySecret: jest.fn().mockReturnValue(false),
			} as any;

			// Act & Assert
			await expect(controller.activateMFA(req, mockResponse)).rejects.toThrow(BadRequestError);
			await expect(controller.activateMFA(req, mockResponse)).rejects.toThrow(
				'MFA code expired. Close the modal and enable MFA again',
			);
		});
	});

	describe('disableMFA', () => {
		const mockMfaCode = '123456';
		const mockRecoveryCode = 'recovery-code-123';

		it('should disable MFA with valid MFA code', async () => {
			// Arrange
			const req = mock<MFA.Disable>({
				user: mockUser,
				body: { mfaCode: mockMfaCode },
				browserId: 'browser-123',
			});

			const updatedUser = mock<User>({
				...mockUser,
				mfaEnabled: false,
			});

			mfaService.disableMfaWithMfaCode.mockResolvedValue(undefined);
			userRepository.findOneByOrFail.mockResolvedValue(updatedUser);
			authService.issueCookie.mockReturnValue(undefined);

			// Act
			await controller.disableMFA(req, mockResponse);

			// Assert
			expect(mfaService.disableMfaWithMfaCode).toHaveBeenCalledWith(mockUser.id, mockMfaCode);
			expect(userRepository.findOneByOrFail).toHaveBeenCalledWith({ id: mockUser.id });
			expect(authService.issueCookie).toHaveBeenCalledWith(
				mockResponse,
				updatedUser,
				false,
				'browser-123',
			);
		});

		it('should disable MFA with valid recovery code', async () => {
			// Arrange
			const req = mock<MFA.Disable>({
				user: mockUser,
				body: { mfaRecoveryCode: mockRecoveryCode },
				browserId: 'browser-123',
			});

			const updatedUser = mock<User>({
				...mockUser,
				mfaEnabled: false,
			});

			mfaService.disableMfaWithRecoveryCode.mockResolvedValue(undefined);
			userRepository.findOneByOrFail.mockResolvedValue(updatedUser);
			authService.issueCookie.mockReturnValue(undefined);

			// Act
			await controller.disableMFA(req, mockResponse);

			// Assert
			expect(mfaService.disableMfaWithRecoveryCode).toHaveBeenCalledWith(
				mockUser.id,
				mockRecoveryCode,
			);
			expect(userRepository.findOneByOrFail).toHaveBeenCalledWith({ id: mockUser.id });
			expect(authService.issueCookie).toHaveBeenCalledWith(
				mockResponse,
				updatedUser,
				false,
				'browser-123',
			);
		});

		it('should throw BadRequestError when neither MFA code nor recovery code is provided', async () => {
			// Arrange
			const req = mock<MFA.Disable>({
				user: mockUser,
				body: {},
				browserId: 'browser-123',
			});

			// Act & Assert
			await expect(controller.disableMFA(req, mockResponse)).rejects.toThrow(BadRequestError);
			await expect(controller.disableMFA(req, mockResponse)).rejects.toThrow(
				'Either MFA code or recovery code is required to disable MFA feature',
			);
		});

		it('should throw BadRequestError when both MFA code and recovery code are provided', async () => {
			// Arrange
			const req = mock<MFA.Disable>({
				user: mockUser,
				body: { mfaCode: mockMfaCode, mfaRecoveryCode: mockRecoveryCode },
				browserId: 'browser-123',
			});

			// Act & Assert
			await expect(controller.disableMFA(req, mockResponse)).rejects.toThrow(BadRequestError);
			await expect(controller.disableMFA(req, mockResponse)).rejects.toThrow(
				'Either MFA code or recovery code is required to disable MFA feature',
			);
		});

		it('should handle InvalidMfaCodeError from service', async () => {
			// Arrange
			const req = mock<MFA.Disable>({
				user: mockUser,
				body: { mfaCode: 'invalid-code' },
				browserId: 'browser-123',
			});

			mfaService.disableMfaWithMfaCode.mockRejectedValue(new InvalidMfaCodeError());

			// Act & Assert
			await expect(controller.disableMFA(req, mockResponse)).rejects.toThrow(InvalidMfaCodeError);
		});

		it('should handle InvalidMfaRecoveryCodeError from service', async () => {
			// Arrange
			const req = mock<MFA.Disable>({
				user: mockUser,
				body: { mfaRecoveryCode: 'invalid-recovery-code' },
				browserId: 'browser-123',
			});

			mfaService.disableMfaWithRecoveryCode.mockRejectedValue(new InvalidMfaRecoveryCodeError());

			// Act & Assert
			await expect(controller.disableMFA(req, mockResponse)).rejects.toThrow(
				InvalidMfaRecoveryCodeError,
			);
		});

		it('should handle empty string MFA code as invalid', async () => {
			// Arrange
			const req = mock<MFA.Disable>({
				user: mockUser,
				body: { mfaCode: '' },
				browserId: 'browser-123',
			});

			// Act & Assert
			await expect(controller.disableMFA(req, mockResponse)).rejects.toThrow(BadRequestError);
			await expect(controller.disableMFA(req, mockResponse)).rejects.toThrow(
				'Either MFA code or recovery code is required to disable MFA feature',
			);
		});
	});

	describe('verifyMFA', () => {
		const mockSecret = 'test-secret';
		const mockMfaCode = '123456';

		it('should verify MFA code successfully', async () => {
			// Arrange
			const req = mock<MFA.Verify>({
				user: mockUser,
				body: { mfaCode: mockMfaCode },
			});

			mfaService.getSecretAndRecoveryCodes.mockResolvedValue({
				decryptedSecret: mockSecret,
				decryptedRecoveryCodes: [],
			});

			mfaService.totp = {
				verifySecret: jest.fn().mockReturnValue(true),
			} as any;

			// Act
			const result = await controller.verifyMFA(req);

			// Assert
			expect(mfaService.getSecretAndRecoveryCodes).toHaveBeenCalledWith(mockUser.id);
			expect(mfaService.totp.verifySecret).toHaveBeenCalledWith({
				secret: mockSecret,
				mfaCode: mockMfaCode,
			});
			expect(result).toBeUndefined();
		});

		it('should throw BadRequestError if MFA code is missing', async () => {
			// Arrange
			const req = mock<MFA.Verify>({
				user: mockUser,
				body: { mfaCode: null as any },
			});

			// Act & Assert
			await expect(controller.verifyMFA(req)).rejects.toThrow(BadRequestError);
			await expect(controller.verifyMFA(req)).rejects.toThrow(
				'MFA code is required to enable MFA feature',
			);
		});

		it('should throw BadRequestError if no MFA secret is set', async () => {
			// Arrange
			const req = mock<MFA.Verify>({
				user: mockUser,
				body: { mfaCode: mockMfaCode },
			});

			mfaService.getSecretAndRecoveryCodes.mockResolvedValue({
				decryptedSecret: '',
				decryptedRecoveryCodes: [],
			});

			// Act & Assert
			await expect(controller.verifyMFA(req)).rejects.toThrow(BadRequestError);
			await expect(controller.verifyMFA(req)).rejects.toThrow('No MFA secret se for this user');
		});

		it('should throw BadRequestError if MFA secret verification fails', async () => {
			// Arrange
			const req = mock<MFA.Verify>({
				user: mockUser,
				body: { mfaCode: 'invalid-code' },
			});

			mfaService.getSecretAndRecoveryCodes.mockResolvedValue({
				decryptedSecret: mockSecret,
				decryptedRecoveryCodes: [],
			});

			mfaService.totp = {
				verifySecret: jest.fn().mockReturnValue(false),
			} as any;

			// Act & Assert
			await expect(controller.verifyMFA(req)).rejects.toThrow(BadRequestError);
			await expect(controller.verifyMFA(req)).rejects.toThrow('MFA secret could not be verified');
		});

		it('should handle empty string MFA code', async () => {
			// Arrange
			const req = mock<MFA.Verify>({
				user: mockUser,
				body: { mfaCode: '' },
			});

			// Act & Assert
			await expect(controller.verifyMFA(req)).rejects.toThrow(BadRequestError);
			await expect(controller.verifyMFA(req)).rejects.toThrow(
				'MFA code is required to enable MFA feature',
			);
		});
	});
});

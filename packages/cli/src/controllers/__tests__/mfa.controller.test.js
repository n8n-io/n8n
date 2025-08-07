'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_common_1 = require('@n8n/backend-common');
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const jest_mock_extended_1 = require('jest-mock-extended');
const auth_service_1 = require('@/auth/auth.service');
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const invalid_mfa_code_error_1 = require('@/errors/response-errors/invalid-mfa-code.error');
const invalid_mfa_recovery_code_error_1 = require('@/errors/response-errors/invalid-mfa-recovery-code-error');
const external_hooks_1 = require('@/external-hooks');
const mfa_service_1 = require('@/mfa/mfa.service');
const mfa_controller_1 = require('../mfa.controller');
describe('MFAController', () => {
	(0, backend_test_utils_1.mockInstance)(backend_common_1.Logger);
	(0, backend_test_utils_1.mockInstance)(external_hooks_1.ExternalHooks);
	const mfaService = (0, backend_test_utils_1.mockInstance)(mfa_service_1.MfaService);
	const authService = (0, backend_test_utils_1.mockInstance)(auth_service_1.AuthService);
	const userRepository = (0, backend_test_utils_1.mockInstance)(db_1.UserRepository);
	const externalHooks = di_1.Container.get(external_hooks_1.ExternalHooks);
	const controller = di_1.Container.get(mfa_controller_1.MFAController);
	const mockUser = (0, jest_mock_extended_1.mock)({
		id: 'user-123',
		email: 'test@example.com',
		mfaEnabled: false,
		mfaSecret: null,
		mfaRecoveryCodes: [],
	});
	const mockResponse = (0, jest_mock_extended_1.mock)();
	beforeEach(() => {
		jest.clearAllMocks();
	});
	describe('enforceMFA', () => {
		it('should enforce MFA when user has MFA enabled', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				body: { enforce: true },
				authInfo: { usedMfa: true },
			});
			mfaService.enforceMFA.mockResolvedValue(undefined);
			const result = await controller.enforceMFA(req);
			expect(mfaService.enforceMFA).toHaveBeenCalledWith(true);
			expect(result).toBeUndefined();
		});
		it('should allow disabling MFA enforcement', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				body: { enforce: false },
				authInfo: { usedMfa: false },
			});
			mfaService.enforceMFA.mockResolvedValue(undefined);
			const result = await controller.enforceMFA(req);
			expect(mfaService.enforceMFA).toHaveBeenCalledWith(false);
			expect(result).toBeUndefined();
		});
		it('should throw BadRequestError when trying to enforce MFA without having MFA enabled', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				body: { enforce: true },
				authInfo: { usedMfa: false },
			});
			await expect(controller.enforceMFA(req)).rejects.toThrow(bad_request_error_1.BadRequestError);
			await expect(controller.enforceMFA(req)).rejects.toThrow(
				'You must enable two-factor authentication on your own account before enforcing it for all users',
			);
			expect(mfaService.enforceMFA).not.toHaveBeenCalled();
		});
		it('should handle undefined authInfo gracefully', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				body: { enforce: true },
				authInfo: undefined,
			});
			await expect(controller.enforceMFA(req)).rejects.toThrow(bad_request_error_1.BadRequestError);
			expect(mfaService.enforceMFA).not.toHaveBeenCalled();
		});
	});
	describe('canEnableMFA', () => {
		it('should run external hooks and return successfully', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
			});
			externalHooks.run.mockResolvedValue(undefined);
			const result = await controller.canEnableMFA(req);
			expect(externalHooks.run).toHaveBeenCalledWith('mfa.beforeSetup', [mockUser]);
			expect(result).toBeUndefined();
		});
		it('should handle external hooks errors', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
			});
			const error = new Error('External hook failed');
			externalHooks.run.mockRejectedValue(error);
			await expect(controller.canEnableMFA(req)).rejects.toThrow(error);
		});
	});
	describe('getQRCode', () => {
		it('should throw BadRequestError if MFA is already enabled', async () => {
			const userWithMfa = (0, jest_mock_extended_1.mock)({
				...mockUser,
				mfaEnabled: true,
			});
			const req = (0, jest_mock_extended_1.mock)({
				user: userWithMfa,
			});
			await expect(controller.getQRCode(req)).rejects.toThrow(bad_request_error_1.BadRequestError);
			await expect(controller.getQRCode(req)).rejects.toThrow(
				'MFA already enabled. Disable it to generate new secret and recovery codes',
			);
		});
		it('should return existing secret and recovery codes if available', async () => {
			const req = (0, jest_mock_extended_1.mock)({
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
			};
			const result = await controller.getQRCode(req);
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
			const req = (0, jest_mock_extended_1.mock)({
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
			};
			mfaService.saveSecretAndRecoveryCodes.mockResolvedValue(undefined);
			const result = await controller.getQRCode(req);
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
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
			});
			const mockNewSecret = 'new-secret';
			const mockNewRecoveryCodes = ['new-code1', 'new-code2'];
			const mockQrCode = 'otpauth://totp/test@example.com?secret=new-secret';
			mfaService.getSecretAndRecoveryCodes.mockResolvedValue({
				decryptedSecret: 'existing-secret',
				decryptedRecoveryCodes: [],
			});
			mfaService.generateRecoveryCodes.mockReturnValue(mockNewRecoveryCodes);
			mfaService.totp = {
				generateSecret: jest.fn().mockReturnValue(mockNewSecret),
				generateTOTPUri: jest.fn().mockReturnValue(mockQrCode),
			};
			mfaService.saveSecretAndRecoveryCodes.mockResolvedValue(undefined);
			const result = await controller.getQRCode(req);
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
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
				body: { mfaCode: mockMfaCode },
				browserId: 'browser-123',
			});
			const updatedUser = (0, jest_mock_extended_1.mock)({
				...mockUser,
				mfaEnabled: true,
			});
			externalHooks.run.mockResolvedValue(undefined);
			mfaService.totp = {
				verifySecret: jest.fn().mockReturnValue(true),
			};
			mfaService.enableMfa.mockResolvedValue(updatedUser);
			authService.issueCookie.mockReturnValue(undefined);
			await controller.activateMFA(req, mockResponse);
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
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
				body: { mfaCode: null },
				browserId: 'browser-123',
			});
			externalHooks.run.mockResolvedValue(undefined);
			await expect(controller.activateMFA(req, mockResponse)).rejects.toThrow(
				bad_request_error_1.BadRequestError,
			);
			await expect(controller.activateMFA(req, mockResponse)).rejects.toThrow(
				'Token is required to enable MFA feature',
			);
		});
		it('should throw BadRequestError if MFA is already enabled', async () => {
			const userWithMfa = (0, jest_mock_extended_1.mock)({
				...mockUser,
				mfaEnabled: true,
			});
			const req = (0, jest_mock_extended_1.mock)({
				user: userWithMfa,
				body: { mfaCode: mockMfaCode },
				browserId: 'browser-123',
			});
			externalHooks.run.mockResolvedValue(undefined);
			await expect(controller.activateMFA(req, mockResponse)).rejects.toThrow(
				bad_request_error_1.BadRequestError,
			);
			await expect(controller.activateMFA(req, mockResponse)).rejects.toThrow(
				'MFA already enabled',
			);
		});
		it('should throw BadRequestError if secret or recovery codes are missing', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
				body: { mfaCode: mockMfaCode },
				browserId: 'browser-123',
			});
			externalHooks.run.mockResolvedValue(undefined);
			mfaService.getSecretAndRecoveryCodes.mockResolvedValue({
				decryptedSecret: '',
				decryptedRecoveryCodes: [],
			});
			await expect(controller.activateMFA(req, mockResponse)).rejects.toThrow(
				bad_request_error_1.BadRequestError,
			);
			await expect(controller.activateMFA(req, mockResponse)).rejects.toThrow(
				'Cannot enable MFA without generating secret and recovery codes',
			);
		});
		it('should throw BadRequestError if MFA code verification fails', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
				body: { mfaCode: 'invalid-code' },
				browserId: 'browser-123',
			});
			externalHooks.run.mockResolvedValue(undefined);
			mfaService.totp = {
				verifySecret: jest.fn().mockReturnValue(false),
			};
			await expect(controller.activateMFA(req, mockResponse)).rejects.toThrow(
				bad_request_error_1.BadRequestError,
			);
			await expect(controller.activateMFA(req, mockResponse)).rejects.toThrow(
				'MFA code expired. Close the modal and enable MFA again',
			);
		});
	});
	describe('disableMFA', () => {
		const mockMfaCode = '123456';
		const mockRecoveryCode = 'recovery-code-123';
		it('should disable MFA with valid MFA code', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
				body: { mfaCode: mockMfaCode },
				browserId: 'browser-123',
			});
			const updatedUser = (0, jest_mock_extended_1.mock)({
				...mockUser,
				mfaEnabled: false,
			});
			mfaService.disableMfaWithMfaCode.mockResolvedValue(undefined);
			userRepository.findOneByOrFail.mockResolvedValue(updatedUser);
			authService.issueCookie.mockReturnValue(undefined);
			await controller.disableMFA(req, mockResponse);
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
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
				body: { mfaRecoveryCode: mockRecoveryCode },
				browserId: 'browser-123',
			});
			const updatedUser = (0, jest_mock_extended_1.mock)({
				...mockUser,
				mfaEnabled: false,
			});
			mfaService.disableMfaWithRecoveryCode.mockResolvedValue(undefined);
			userRepository.findOneByOrFail.mockResolvedValue(updatedUser);
			authService.issueCookie.mockReturnValue(undefined);
			await controller.disableMFA(req, mockResponse);
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
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
				body: {},
				browserId: 'browser-123',
			});
			await expect(controller.disableMFA(req, mockResponse)).rejects.toThrow(
				bad_request_error_1.BadRequestError,
			);
			await expect(controller.disableMFA(req, mockResponse)).rejects.toThrow(
				'Either MFA code or recovery code is required to disable MFA feature',
			);
		});
		it('should throw BadRequestError when both MFA code and recovery code are provided', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
				body: { mfaCode: mockMfaCode, mfaRecoveryCode: mockRecoveryCode },
				browserId: 'browser-123',
			});
			await expect(controller.disableMFA(req, mockResponse)).rejects.toThrow(
				bad_request_error_1.BadRequestError,
			);
			await expect(controller.disableMFA(req, mockResponse)).rejects.toThrow(
				'Either MFA code or recovery code is required to disable MFA feature',
			);
		});
		it('should handle InvalidMfaCodeError from service', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
				body: { mfaCode: 'invalid-code' },
				browserId: 'browser-123',
			});
			mfaService.disableMfaWithMfaCode.mockRejectedValue(
				new invalid_mfa_code_error_1.InvalidMfaCodeError(),
			);
			await expect(controller.disableMFA(req, mockResponse)).rejects.toThrow(
				invalid_mfa_code_error_1.InvalidMfaCodeError,
			);
		});
		it('should handle InvalidMfaRecoveryCodeError from service', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
				body: { mfaRecoveryCode: 'invalid-recovery-code' },
				browserId: 'browser-123',
			});
			mfaService.disableMfaWithRecoveryCode.mockRejectedValue(
				new invalid_mfa_recovery_code_error_1.InvalidMfaRecoveryCodeError(),
			);
			await expect(controller.disableMFA(req, mockResponse)).rejects.toThrow(
				invalid_mfa_recovery_code_error_1.InvalidMfaRecoveryCodeError,
			);
		});
		it('should handle empty string MFA code as invalid', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
				body: { mfaCode: '' },
				browserId: 'browser-123',
			});
			await expect(controller.disableMFA(req, mockResponse)).rejects.toThrow(
				bad_request_error_1.BadRequestError,
			);
			await expect(controller.disableMFA(req, mockResponse)).rejects.toThrow(
				'Either MFA code or recovery code is required to disable MFA feature',
			);
		});
	});
	describe('verifyMFA', () => {
		const mockSecret = 'test-secret';
		const mockMfaCode = '123456';
		it('should verify MFA code successfully', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
				body: { mfaCode: mockMfaCode },
			});
			mfaService.getSecretAndRecoveryCodes.mockResolvedValue({
				decryptedSecret: mockSecret,
				decryptedRecoveryCodes: [],
			});
			mfaService.totp = {
				verifySecret: jest.fn().mockReturnValue(true),
			};
			const result = await controller.verifyMFA(req);
			expect(mfaService.getSecretAndRecoveryCodes).toHaveBeenCalledWith(mockUser.id);
			expect(mfaService.totp.verifySecret).toHaveBeenCalledWith({
				secret: mockSecret,
				mfaCode: mockMfaCode,
			});
			expect(result).toBeUndefined();
		});
		it('should throw BadRequestError if MFA code is missing', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
				body: { mfaCode: null },
			});
			await expect(controller.verifyMFA(req)).rejects.toThrow(bad_request_error_1.BadRequestError);
			await expect(controller.verifyMFA(req)).rejects.toThrow(
				'MFA code is required to enable MFA feature',
			);
		});
		it('should throw BadRequestError if no MFA secret is set', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
				body: { mfaCode: mockMfaCode },
			});
			mfaService.getSecretAndRecoveryCodes.mockResolvedValue({
				decryptedSecret: '',
				decryptedRecoveryCodes: [],
			});
			await expect(controller.verifyMFA(req)).rejects.toThrow(bad_request_error_1.BadRequestError);
			await expect(controller.verifyMFA(req)).rejects.toThrow('No MFA secret se for this user');
		});
		it('should throw BadRequestError if MFA secret verification fails', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
				body: { mfaCode: 'invalid-code' },
			});
			mfaService.getSecretAndRecoveryCodes.mockResolvedValue({
				decryptedSecret: mockSecret,
				decryptedRecoveryCodes: [],
			});
			mfaService.totp = {
				verifySecret: jest.fn().mockReturnValue(false),
			};
			await expect(controller.verifyMFA(req)).rejects.toThrow(bad_request_error_1.BadRequestError);
			await expect(controller.verifyMFA(req)).rejects.toThrow('MFA secret could not be verified');
		});
		it('should handle empty string MFA code', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
				body: { mfaCode: '' },
			});
			await expect(controller.verifyMFA(req)).rejects.toThrow(bad_request_error_1.BadRequestError);
			await expect(controller.verifyMFA(req)).rejects.toThrow(
				'MFA code is required to enable MFA feature',
			);
		});
	});
});
//# sourceMappingURL=mfa.controller.test.js.map

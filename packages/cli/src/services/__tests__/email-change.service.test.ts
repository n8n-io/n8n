import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import type { AuthIdentity, User } from '@n8n/db';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { InvalidMfaCodeError } from '@/errors/response-errors/invalid-mfa-code.error';
import type { MfaService } from '@/mfa/mfa.service';
import type { PasswordUtility } from '@/services/password.utility';
import type { UserService } from '@/services/user.service';
import { getCurrentAuthenticationMethod, isSamlLicensedAndEnabled } from '@/sso.ee/sso-helpers';

import { EmailChangeService } from '../email-change.service';

vi.mock('@/sso.ee/sso-helpers', async () => ({
	...(await vi.importActual<typeof import('@/sso.ee/sso-helpers')>('@/sso.ee/sso-helpers')),
	isSamlLicensedAndEnabled: vi.fn(),
	getCurrentAuthenticationMethod: vi.fn(),
}));

const isSamlLicensedAndEnabledMock = isSamlLicensedAndEnabled as Mock;
const getCurrentAuthenticationMethodMock = getCurrentAuthenticationMethod as Mock;

describe('EmailChangeService', () => {
	const logger = mock<Logger>();
	const userService = mock<UserService>();
	const mfaService = mock<MfaService>();
	const passwordUtility = mock<PasswordUtility>();
	const globalConfig = mock<GlobalConfig>({
		instanceSettingsLoader: { ownerManagedByEnv: false, ownerEmail: 'owner@example.com' },
	});

	const service = new EmailChangeService(
		logger,
		userService,
		mfaService,
		passwordUtility,
		globalConfig,
	);

	const mockUser = (overrides: Partial<User> = {}) =>
		Object.assign(
			mock<User>(),
			{
				id: 'user-1',
				email: 'user@example.com',
				password: 'password-hash',
				mfaEnabled: false,
			},
			overrides,
		);

	beforeEach(() => {
		vi.resetAllMocks();
		isSamlLicensedAndEnabledMock.mockReturnValue(false);
		getCurrentAuthenticationMethodMock.mockReturnValue('email');
		userService.findSsoIdentity.mockResolvedValue(undefined);
		globalConfig.instanceSettingsLoader.ownerManagedByEnv = false;
		globalConfig.instanceSettingsLoader.ownerEmail = 'owner@example.com';
	});

	describe('assertMayApplyEmailChange', () => {
		it('should pass when no guard applies', async () => {
			await expect(service.assertMayApplyEmailChange(mockUser())).resolves.toBeUndefined();
		});

		it('should reject an env-managed owner', async () => {
			globalConfig.instanceSettingsLoader.ownerManagedByEnv = true;
			const user = mockUser({ email: 'owner@example.com' });

			await expect(service.assertMayApplyEmailChange(user)).rejects.toThrow(ForbiddenError);
		});

		it('should reject a user with an active SSO identity', async () => {
			userService.findSsoIdentity.mockResolvedValue(mock<AuthIdentity>({ providerType: 'ldap' }));
			getCurrentAuthenticationMethodMock.mockReturnValue('ldap');

			await expect(service.assertMayApplyEmailChange(mockUser())).rejects.toThrow(BadRequestError);
		});

		it('should reject when SAML is enabled', async () => {
			isSamlLicensedAndEnabledMock.mockReturnValue(true);

			await expect(service.assertMayApplyEmailChange(mockUser())).rejects.toThrow(BadRequestError);
		});
	});

	describe('assertMayRequestEmailChange', () => {
		describe('with MFA enabled', () => {
			const user = () => mockUser({ mfaEnabled: true });

			it('should reject when the MFA code is missing', async () => {
				await expect(service.assertMayRequestEmailChange(user(), {})).rejects.toThrow(
					BadRequestError,
				);
			});

			it('should reject an invalid MFA code', async () => {
				mfaService.validateMfa.mockResolvedValue(false);

				await expect(
					service.assertMayRequestEmailChange(user(), { mfaCode: '000000' }),
				).rejects.toThrow(InvalidMfaCodeError);
			});

			it('should pass with a valid MFA code', async () => {
				mfaService.validateMfa.mockResolvedValue(true);

				await expect(
					service.assertMayRequestEmailChange(user(), { mfaCode: '123456' }),
				).resolves.toBeUndefined();
			});
		});

		describe('with MFA disabled', () => {
			it('should pass a user without a local password', async () => {
				const user = mockUser({ password: null });

				await expect(service.assertMayRequestEmailChange(user, {})).resolves.toBeUndefined();
			});

			it('should reject when the current password is missing', async () => {
				await expect(service.assertMayRequestEmailChange(mockUser(), {})).rejects.toThrow(
					BadRequestError,
				);
			});

			it('should reject a wrong current password', async () => {
				passwordUtility.compare.mockResolvedValue(false);

				await expect(
					service.assertMayRequestEmailChange(mockUser(), { currentPassword: 'wrong' }),
				).rejects.toThrow(BadRequestError);
			});

			it('should pass a correct current password', async () => {
				passwordUtility.compare.mockResolvedValue(true);

				await expect(
					service.assertMayRequestEmailChange(mockUser(), { currentPassword: 'right' }),
				).resolves.toBeUndefined();
			});
		});
	});
});

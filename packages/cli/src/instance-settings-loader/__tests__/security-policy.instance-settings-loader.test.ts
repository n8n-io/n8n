import { mock } from 'jest-mock-extended';
import type { Logger } from '@n8n/backend-common';
import type { InstanceSettingsLoaderConfig } from '@n8n/config';
import {
	PERSONAL_SPACE_PUBLISHING_SETTING,
	PERSONAL_SPACE_SHARING_SETTING,
} from '@n8n/permissions';

import type { MfaService } from '@/mfa/mfa.service';
import type { SecuritySettingsService } from '@/services/security-settings.service';

import { SecurityPolicyInstanceSettingsLoader } from '../loaders/security-policy.instance-settings-loader';

describe('SecurityPolicyInstanceSettingsLoader', () => {
	const logger = mock<Logger>({ scoped: jest.fn().mockReturnThis() });
	const mfaService = mock<MfaService>();
	const securitySettingsService = mock<SecuritySettingsService>();

	const createLoader = (configOverrides: Partial<InstanceSettingsLoaderConfig> = {}) => {
		const config = {
			securityPolicyOverride: false,
			securityPolicyMfaEnforced: false,
			securityPolicyPersonalSpacePublishing: true,
			securityPolicyPersonalSpaceSharing: true,
			...configOverrides,
		} as InstanceSettingsLoaderConfig;

		return new SecurityPolicyInstanceSettingsLoader(
			config,
			securitySettingsService,
			mfaService,
			logger,
		);
	};

	beforeEach(() => {
		jest.resetAllMocks();
		logger.scoped.mockReturnThis();
	});

	describe('when SECURITY_POLICY_OVERRIDE is false', () => {
		it('should skip when no security env vars deviate from defaults', async () => {
			const loader = createLoader();

			const result = await loader.run();

			expect(result).toBe('skipped');
			expect(mfaService.enforceMFA).not.toHaveBeenCalled();
			expect(securitySettingsService.setPersonalSpaceSetting).not.toHaveBeenCalled();
			expect(logger.warn).not.toHaveBeenCalled();
		});

		it('should skip and warn when securityPolicyMfaEnforced is true', async () => {
			const loader = createLoader({ securityPolicyMfaEnforced: true });

			const result = await loader.run();

			expect(result).toBe('skipped');
			expect(mfaService.enforceMFA).not.toHaveBeenCalled();
			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('SECURITY_POLICY_OVERRIDE is not enabled'),
			);
		});

		it('should skip and warn when securityPolicyPersonalSpacePublishing is false', async () => {
			const loader = createLoader({ securityPolicyPersonalSpacePublishing: false });

			const result = await loader.run();

			expect(result).toBe('skipped');
			expect(securitySettingsService.setPersonalSpaceSetting).not.toHaveBeenCalled();
			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('SECURITY_POLICY_OVERRIDE is not enabled'),
			);
		});

		it('should skip and warn when securityPolicyPersonalSpaceSharing is false', async () => {
			const loader = createLoader({ securityPolicyPersonalSpaceSharing: false });

			const result = await loader.run();

			expect(result).toBe('skipped');
			expect(securitySettingsService.setPersonalSpaceSetting).not.toHaveBeenCalled();
			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('SECURITY_POLICY_OVERRIDE is not enabled'),
			);
		});
	});

	describe('when SECURITY_POLICY_OVERRIDE is true', () => {
		it('should enforce MFA when securityPolicyMfaEnforced is true', async () => {
			const loader = createLoader({
				securityPolicyOverride: true,
				securityPolicyMfaEnforced: true,
			});

			const result = await loader.run();

			expect(result).toBe('created');
			expect(mfaService.enforceMFA).toHaveBeenCalledWith(true);
		});

		it('should disable MFA enforcement when securityPolicyMfaEnforced is false', async () => {
			const loader = createLoader({
				securityPolicyOverride: true,
				securityPolicyMfaEnforced: false,
			});

			const result = await loader.run();

			expect(result).toBe('created');
			expect(mfaService.enforceMFA).toHaveBeenCalledWith(false);
		});

		it('should enable personal space publishing when securityPolicyPersonalSpacePublishing is true', async () => {
			const loader = createLoader({
				securityPolicyOverride: true,
				securityPolicyPersonalSpacePublishing: true,
			});

			const result = await loader.run();

			expect(result).toBe('created');
			expect(securitySettingsService.setPersonalSpaceSetting).toHaveBeenCalledWith(
				PERSONAL_SPACE_PUBLISHING_SETTING,
				true,
			);
		});

		it('should disable personal space publishing when securityPolicyPersonalSpacePublishing is false', async () => {
			const loader = createLoader({
				securityPolicyOverride: true,
				securityPolicyPersonalSpacePublishing: false,
			});

			const result = await loader.run();

			expect(result).toBe('created');
			expect(securitySettingsService.setPersonalSpaceSetting).toHaveBeenCalledWith(
				PERSONAL_SPACE_PUBLISHING_SETTING,
				false,
			);
		});

		it('should enable personal space sharing when securityPolicyPersonalSpaceSharing is true', async () => {
			const loader = createLoader({
				securityPolicyOverride: true,
				securityPolicyPersonalSpaceSharing: true,
			});

			const result = await loader.run();

			expect(result).toBe('created');
			expect(securitySettingsService.setPersonalSpaceSetting).toHaveBeenCalledWith(
				PERSONAL_SPACE_SHARING_SETTING,
				true,
			);
		});

		it('should disable personal space sharing when securityPolicyPersonalSpaceSharing is false', async () => {
			const loader = createLoader({
				securityPolicyOverride: true,
				securityPolicyPersonalSpaceSharing: false,
			});

			const result = await loader.run();

			expect(result).toBe('created');
			expect(securitySettingsService.setPersonalSpaceSetting).toHaveBeenCalledWith(
				PERSONAL_SPACE_SHARING_SETTING,
				false,
			);
		});

		it('should log info message about override being enabled', async () => {
			const loader = createLoader({ securityPolicyOverride: true });

			await loader.run();

			expect(logger.info).toHaveBeenCalledWith(
				expect.stringContaining('SECURITY_POLICY_OVERRIDE is enabled'),
			);
		});

		it('should apply all settings together', async () => {
			const loader = createLoader({
				securityPolicyOverride: true,
				securityPolicyMfaEnforced: true,
				securityPolicyPersonalSpacePublishing: false,
				securityPolicyPersonalSpaceSharing: false,
			});

			const result = await loader.run();

			expect(result).toBe('created');
			expect(mfaService.enforceMFA).toHaveBeenCalledWith(true);
			expect(securitySettingsService.setPersonalSpaceSetting).toHaveBeenCalledWith(
				PERSONAL_SPACE_PUBLISHING_SETTING,
				false,
			);
			expect(securitySettingsService.setPersonalSpaceSetting).toHaveBeenCalledWith(
				PERSONAL_SPACE_SHARING_SETTING,
				false,
			);
		});
	});
});

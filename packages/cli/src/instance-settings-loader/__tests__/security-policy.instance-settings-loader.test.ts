import type { Logger } from '@n8n/backend-common';
import type { InstanceSettingsLoaderConfig } from '@n8n/config';
import {
	PERSONAL_SPACE_PUBLISHING_SETTING,
	PERSONAL_SPACE_SHARING_SETTING,
} from '@n8n/permissions';
import { mock } from 'vitest-mock-extended';

import type { MfaService } from '@/mfa/mfa.service';
import type { SecuritySettingsService } from '@/services/security-settings.service';
import type { WorkflowReviewPolicyService } from '@/services/workflow-review-policy.service';

import { SecurityPolicyInstanceSettingsLoader } from '../loaders/security-policy.instance-settings-loader';

describe('SecurityPolicyInstanceSettingsLoader', () => {
	const logger = mock<Logger>({ scoped: vi.fn().mockReturnThis() });
	const mfaService = mock<MfaService>();
	const securitySettingsService = mock<SecuritySettingsService>();
	const workflowReviewPolicyService = mock<WorkflowReviewPolicyService>();

	const createLoader = (configOverrides: Partial<InstanceSettingsLoaderConfig> = {}) => {
		const config = {
			securityPolicyManagedByEnv: false,
			mfaEnforcedEnabled: false,
			personalSpacePublishingEnabled: true,
			personalSpaceSharingEnabled: true,
			workflowReviewsEnabled: false,
			workflowReviewsAlwaysRequired: false,
			...configOverrides,
		} as InstanceSettingsLoaderConfig;

		return new SecurityPolicyInstanceSettingsLoader(
			config,
			securitySettingsService,
			mfaService,
			workflowReviewPolicyService,
			logger,
		);
	};

	beforeEach(() => {
		vi.resetAllMocks();
		logger.scoped.mockReturnThis();
	});

	describe('when N8N_SECURITY_POLICY_MANAGED_BY_ENV is false', () => {
		it('should skip when securityPolicyManagedByEnv is false', async () => {
			const loader = createLoader();

			const result = await loader.run();

			expect(result).toBe('skipped');
			expect(mfaService.enforceMFA).not.toHaveBeenCalled();
			expect(securitySettingsService.setPersonalSpaceSetting).not.toHaveBeenCalled();
			expect(workflowReviewPolicyService.update).not.toHaveBeenCalled();
			expect(logger.debug).toHaveBeenCalledWith(
				expect.stringContaining('not managed by environment variables'),
			);
		});

		it('should skip without applying when mfaEnforcedEnabled is true', async () => {
			const loader = createLoader({ mfaEnforcedEnabled: true });

			const result = await loader.run();

			expect(result).toBe('skipped');
			expect(mfaService.enforceMFA).not.toHaveBeenCalled();
			expect(securitySettingsService.setPersonalSpaceSetting).not.toHaveBeenCalled();
		});

		it('should skip without applying when personalSpacePublishingEnabled is false', async () => {
			const loader = createLoader({ personalSpacePublishingEnabled: false });

			const result = await loader.run();

			expect(result).toBe('skipped');
			expect(mfaService.enforceMFA).not.toHaveBeenCalled();
			expect(securitySettingsService.setPersonalSpaceSetting).not.toHaveBeenCalled();
		});

		it('should skip without applying when personalSpaceSharingEnabled is false', async () => {
			const loader = createLoader({ personalSpaceSharingEnabled: false });

			const result = await loader.run();

			expect(result).toBe('skipped');
			expect(mfaService.enforceMFA).not.toHaveBeenCalled();
			expect(securitySettingsService.setPersonalSpaceSetting).not.toHaveBeenCalled();
		});
	});

	describe('when N8N_SECURITY_POLICY_MANAGED_BY_ENV is true', () => {
		it('should enforce MFA when mfaEnforcedEnabled is true', async () => {
			const loader = createLoader({
				securityPolicyManagedByEnv: true,
				mfaEnforcedEnabled: true,
			});

			const result = await loader.run();

			expect(result).toBe('created');
			expect(mfaService.enforceMFA).toHaveBeenCalledWith(true);
		});

		it('should disable MFA enforcement when mfaEnforcedEnabled is false', async () => {
			const loader = createLoader({
				securityPolicyManagedByEnv: true,
				mfaEnforcedEnabled: false,
			});

			const result = await loader.run();

			expect(result).toBe('created');
			expect(mfaService.enforceMFA).toHaveBeenCalledWith(false);
		});

		it('should enable personal space publishing when personalSpacePublishingEnabled is true', async () => {
			const loader = createLoader({
				securityPolicyManagedByEnv: true,
				personalSpacePublishingEnabled: true,
			});

			const result = await loader.run();

			expect(result).toBe('created');
			expect(securitySettingsService.setPersonalSpaceSetting).toHaveBeenCalledWith(
				PERSONAL_SPACE_PUBLISHING_SETTING,
				true,
			);
		});

		it('should disable personal space publishing when personalSpacePublishingEnabled is false', async () => {
			const loader = createLoader({
				securityPolicyManagedByEnv: true,
				personalSpacePublishingEnabled: false,
			});

			const result = await loader.run();

			expect(result).toBe('created');
			expect(securitySettingsService.setPersonalSpaceSetting).toHaveBeenCalledWith(
				PERSONAL_SPACE_PUBLISHING_SETTING,
				false,
			);
		});

		it('should enable personal space sharing when personalSpaceSharingEnabled is true', async () => {
			const loader = createLoader({
				securityPolicyManagedByEnv: true,
				personalSpaceSharingEnabled: true,
			});

			const result = await loader.run();

			expect(result).toBe('created');
			expect(securitySettingsService.setPersonalSpaceSetting).toHaveBeenCalledWith(
				PERSONAL_SPACE_SHARING_SETTING,
				true,
			);
		});

		it('should disable personal space sharing when personalSpaceSharingEnabled is false', async () => {
			const loader = createLoader({
				securityPolicyManagedByEnv: true,
				personalSpaceSharingEnabled: false,
			});

			const result = await loader.run();

			expect(result).toBe('created');
			expect(securitySettingsService.setPersonalSpaceSetting).toHaveBeenCalledWith(
				PERSONAL_SPACE_SHARING_SETTING,
				false,
			);
		});

		it('should require approval for every workflow version when both workflow review vars are true', async () => {
			const loader = createLoader({
				securityPolicyManagedByEnv: true,
				workflowReviewsEnabled: true,
				workflowReviewsAlwaysRequired: true,
			});

			const result = await loader.run();

			expect(result).toBe('created');
			expect(workflowReviewPolicyService.update).toHaveBeenCalledWith({
				enabled: true,
				alwaysRequired: true,
			});
		});

		it('should turn off workflow reviews when the workflow review vars are unset', async () => {
			const loader = createLoader({ securityPolicyManagedByEnv: true });

			await loader.run();

			expect(workflowReviewPolicyService.update).toHaveBeenCalledWith({
				enabled: false,
				alwaysRequired: false,
			});
		});

		it('should log info message about override being enabled', async () => {
			const loader = createLoader({ securityPolicyManagedByEnv: true });

			await loader.run();

			expect(logger.info).toHaveBeenCalledWith(
				expect.stringContaining('N8N_SECURITY_POLICY_MANAGED_BY_ENV is enabled'),
			);
		});

		it('should apply all settings together', async () => {
			const loader = createLoader({
				securityPolicyManagedByEnv: true,
				mfaEnforcedEnabled: true,
				personalSpacePublishingEnabled: false,
				personalSpaceSharingEnabled: false,
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

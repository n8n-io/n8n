import { Logger } from '@n8n/backend-common';
import { InstanceSettingsLoaderConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import {
	PERSONAL_SPACE_PUBLISHING_SETTING,
	PERSONAL_SPACE_SHARING_SETTING,
} from '@n8n/permissions';

import { MfaService } from '@/mfa/mfa.service';
import { SecuritySettingsService } from '@/services/security-settings.service';

@Service()
export class SecurityPolicyInstanceSettingsLoader {
	constructor(
		private readonly instanceSettingsLoaderConfig: InstanceSettingsLoaderConfig,
		private readonly securitySettingsService: SecuritySettingsService,
		private readonly mfaService: MfaService,
		private logger: Logger,
	) {
		this.logger = this.logger.scoped('instance-settings-loader');
	}

	async run(): Promise<'created' | 'skipped'> {
		const {
			securityPolicyManagedByEnv,
			mfaEnforcedEnabled,
			personalSpacePublishingEnabled,
			personalSpaceSharingEnabled,
		} = this.instanceSettingsLoaderConfig;

		if (!securityPolicyManagedByEnv) {
			this.logger.debug('Security policy is not managed by environment variables, skipping');
			return 'skipped';
		}

		this.logger.info(
			'N8N_SECURITY_POLICY_MANAGED_BY_ENV is enabled — applying security policy env vars',
		);

		await this.mfaService.enforceMFA(mfaEnforcedEnabled);

		await this.securitySettingsService.setPersonalSpaceSetting(
			PERSONAL_SPACE_PUBLISHING_SETTING,
			personalSpacePublishingEnabled,
		);

		await this.securitySettingsService.setPersonalSpaceSetting(
			PERSONAL_SPACE_SHARING_SETTING,
			personalSpaceSharingEnabled,
		);

		return 'created';
	}
}

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
			securityPolicyOverride,
			securityPolicyMfaEnforced,
			securityPolicyPersonalSpacePublishing,
			securityPolicyPersonalSpaceSharing,
		} = this.instanceSettingsLoaderConfig;

		if (!securityPolicyOverride) {
			if (
				securityPolicyMfaEnforced ||
				!securityPolicyPersonalSpacePublishing ||
				!securityPolicyPersonalSpaceSharing
			) {
				this.logger.warn(
					'Security policy env vars are set but SECURITY_POLICY_OVERRIDE is not enabled — ignoring security policy env vars',
				);
			}
			return 'skipped';
		}

		this.logger.info('SECURITY_POLICY_OVERRIDE is enabled — applying security policy env vars');

		await this.mfaService.enforceMFA(securityPolicyMfaEnforced);

		await this.securitySettingsService.setPersonalSpaceSetting(
			PERSONAL_SPACE_PUBLISHING_SETTING,
			securityPolicyPersonalSpacePublishing,
		);

		await this.securitySettingsService.setPersonalSpaceSetting(
			PERSONAL_SPACE_SHARING_SETTING,
			securityPolicyPersonalSpaceSharing,
		);

		return 'created';
	}
}

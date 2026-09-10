import { LicenseState } from '@n8n/backend-common';
import { SettingsRepository } from '@n8n/db';
import { BreakingChangeRule } from '@n8n/decorators';
import { EXTERNAL_SECRETS_SYSTEM_ROLES_ENABLED_SETTING } from '@n8n/permissions';

import type {
	BreakingChangeRuleMetadata,
	IBreakingChangeInstanceRule,
	InstanceDetectionReport,
} from '../../types';
import { BreakingChangeCategory } from '../../types';

@BreakingChangeRule({ version: 'v3' })
export class ExternalSecretsProjectRolesDefaultRule implements IBreakingChangeInstanceRule {
	constructor(
		private readonly licenseState: LicenseState,
		private readonly settingsRepository: SettingsRepository,
	) {}

	id: string = 'external-secrets-project-roles-default-v3';

	getMetadata(): BreakingChangeRuleMetadata {
		return {
			version: 'v3',
			title: 'External secrets access for project roles is on by default',
			description:
				'In v3, project editors and admins get external-secrets scopes in their projects by default, and the Settings → External Secrets toggle is removed. Instances that keep this toggle off today widen these role permissions after the update.',
			category: BreakingChangeCategory.environment,
			severity: 'medium',
			documentationUrl: 'https://docs.n8n.io/external-secrets/#access-for-project-roles',
		};
	}

	async detect(): Promise<InstanceDetectionReport> {
		// Project-scoped external secrets apply only on licensed instances.
		if (!this.licenseState.isExternalSecretsLicensed()) {
			return { isAffected: false, instanceIssues: [], recommendations: [] };
		}

		// The toggle already matching the v3 default means no behaviour change.
		if (await this.isSystemRolesEnabled()) {
			return { isAffected: false, instanceIssues: [], recommendations: [] };
		}

		return {
			isAffected: true,
			instanceIssues: [
				{
					title: 'Project editors and admins gain external-secrets access',
					description:
						'The external secrets feature is licensed and the Settings → External Secrets toggle is off. After the update, project editors and admins get external-secrets scopes in their projects by default, and the toggle is removed. These roles can read and use external secrets that they cannot access today.',
					level: 'warning',
				},
			],
			recommendations: [
				{
					action: 'Review project editors and admins who gain access',
					description:
						'Check which project editors and admins get external-secrets access under the new default. No action is needed to keep the new default. To limit access, review project memberships before the update.',
				},
			],
		};
	}

	private async isSystemRolesEnabled(): Promise<boolean> {
		const rows = await this.settingsRepository.findByKeys([
			EXTERNAL_SECRETS_SYSTEM_ROLES_ENABLED_SETTING.key,
		]);
		const value = rows.find(
			(r) => r.key === EXTERNAL_SECRETS_SYSTEM_ROLES_ENABLED_SETTING.key,
		)?.value;
		return value === 'true';
	}
}

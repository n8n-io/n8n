import { LicenseState } from '@n8n/backend-common';
import { SettingsRepository } from '@n8n/db';
import { BreakingChangeRule } from '@n8n/decorators';
import { EXTERNAL_SECRETS_SYSTEM_ROLES_ENABLED_SETTING } from '@n8n/permissions';

import { NOT_AFFECTED_INSTANCE } from '../../detection-report';
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
				'In v3, project editors and admins get external-secrets scopes in their projects by default, and the Settings → External Secrets toggle is removed. Instances that keep this toggle off today widen these role permissions after the update. To limit access, change the project roles of people who must not use external secrets before the update.',
			category: BreakingChangeCategory.environment,
			impact: 'behaviorChanges',
			documentationUrl: 'https://docs.n8n.io/external-secrets/#access-for-project-roles',
		};
	}

	async detect(): Promise<InstanceDetectionReport> {
		// Project-scoped external secrets apply only on licensed instances.
		if (!this.licenseState.isExternalSecretsLicensed()) {
			return NOT_AFFECTED_INSTANCE;
		}

		// The toggle already matching the v3 default means no behaviour change.
		if (await this.isSystemRolesEnabled()) {
			return NOT_AFFECTED_INSTANCE;
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
					action: 'Check which project editors and admins get external secrets access',
					description:
						'Under the new default, every project editor and admin can read and use external secrets in their projects. No action is needed to keep the new default. If a person must not use external secrets in a project, change their role in that project before the update.',
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

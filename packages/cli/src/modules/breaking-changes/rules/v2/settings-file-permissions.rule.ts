import { InstanceSettingsConfig } from '@n8n/config';
import { Service } from '@n8n/di';

import type {
	BreakingChangeRuleMetadata,
	IBreakingChangeInstanceRule,
	InstanceDetectionReport,
} from '../../types';
import { BreakingChangeCategory } from '../../types';

@Service()
export class SettingsFilePermissionsRule implements IBreakingChangeInstanceRule {
	constructor(private readonly instanceSettingsConfig: InstanceSettingsConfig) {}

	id: string = 'settings-file-permissions-v2';

	getMetadata(): BreakingChangeRuleMetadata {
		return {
			version: 'v2',
			title: 'Enforce settings file permissions',
			description:
				'n8n now enforces stricter permissions on configuration files for improved security',
			category: BreakingChangeCategory.infrastructure,
			severity: 'low',
			documentationUrl:
				'https://docs.n8n.io/2-0-breaking-changes/#enforce-settings-file-permissions',
		};
	}

	async detect(): Promise<InstanceDetectionReport> {
		// If enforceSettingsFilePermissions is explicitly set to 'false', users are not affected
		// because they've configured the system to not enforce file permissions
		if (!this.instanceSettingsConfig.enforceSettingsFilePermissions) {
			return {
				isAffected: false,
				instanceIssues: [],
				recommendations: [],
			};
		}

		const result: InstanceDetectionReport = {
			isAffected: true,
			instanceIssues: [
				{
					title: 'Settings file permissions will be enforced',
					description:
						'n8n will now enforce chmod 600 permissions on configuration files. This may affect Docker/Kubernetes setups with volume mounts.',
					level: 'warning',
				},
			],
			recommendations: [
				{
					action: 'Configure volume permissions',
					description:
						'If using Docker or Kubernetes with volume mounts for .n8n directory, ensure the mounted volume has proper ownership and chmod 600 can be enforced on the config file',
				},
				{
					action: 'Disable enforcement if needed',
					description:
						'Set N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=false to disable permission enforcement',
				},
				{
					action: 'Separate configs for multi-instance setups',
					description:
						'In multi-main or queue setups, give each instance its own .n8n directory or use N8N_ENCRYPTION_KEY environment variable instead of relying on the config file',
				},
			],
		};

		return result;
	}
}

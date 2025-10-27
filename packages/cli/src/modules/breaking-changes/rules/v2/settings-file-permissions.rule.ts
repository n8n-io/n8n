import { InstanceSettingsConfig } from '@n8n/config';
import { Service } from '@n8n/di';

import type {
	BreakingChangeMetadata,
	InstanceDetectionResult,
	IBreakingChangeInstanceRule,
} from '../../types';
import { BreakingChangeSeverity, BreakingChangeCategory, IssueLevel } from '../../types';

@Service()
export class SettingsFilePermissionsRule implements IBreakingChangeInstanceRule {
	constructor(private readonly instanceSettingsConfig: InstanceSettingsConfig) {}

	getMetadata(): BreakingChangeMetadata {
		return {
			id: 'settings-file-permissions-v2',
			version: 'v2',
			title: 'Enforce settings file permissions',
			description:
				'n8n now enforces stricter permissions on configuration files for improved security',
			category: BreakingChangeCategory.infrastructure,
			severity: BreakingChangeSeverity.medium,
		};
	}

	async detect(): Promise<InstanceDetectionResult> {
		// If enforceSettingsFilePermissions is explicitly set to 'false', users are not affected
		// because they've configured the system to not enforce file permissions
		if (!this.instanceSettingsConfig.enforceSettingsFilePermissions) {
			return {
				isAffected: false,
				instanceIssues: [],
				recommendations: [],
			};
		}

		const result: InstanceDetectionResult = {
			isAffected: true,
			instanceIssues: [
				{
					title: 'Settings file permissions will be enforced',
					description:
						'n8n will now enforce chmod 600 permissions on configuration files. This may affect Docker/Kubernetes setups with volume mounts.',
					level: IssueLevel.warning,
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

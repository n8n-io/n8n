import type { InstanceSettingsConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';

import { SettingsFilePermissionsRule } from '../settings-file-permissions.rule';

describe('SettingsFilePermissionsRule', () => {
	let rule: SettingsFilePermissionsRule;
	const instanceSettingsConfig = mock<InstanceSettingsConfig>({});

	beforeEach(() => {
		rule = new SettingsFilePermissionsRule(instanceSettingsConfig);
	});

	describe('detect()', () => {
		it('should not be affected when enforceSettingsFilePermissions is set to false', async () => {
			instanceSettingsConfig.enforceSettingsFilePermissions = false;

			const result = await rule.detect();

			expect(result.isAffected).toBe(false);
			expect(result.instanceIssues).toHaveLength(0);
			expect(result.recommendations).toHaveLength(0);

			delete process.env.N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS;
		});

		it('should be affected when enforceSettingsFilePermissions is not set to false', async () => {
			instanceSettingsConfig.enforceSettingsFilePermissions = true;
			const result = await rule.detect();

			expect(result.isAffected).toBe(true);
			expect(result.instanceIssues).toHaveLength(1);
			expect(result.instanceIssues[0].title).toBe('Settings file permissions will be enforced');
			expect(result.recommendations).toHaveLength(3);
			expect(result.recommendations[0].action).toBe('Configure volume permissions');
			expect(result.recommendations[1].action).toBe('Disable enforcement if needed');
			expect(result.recommendations[1].description).toContain(
				'N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=false',
			);
			expect(result.recommendations[2].action).toBe('Separate configs for multi-instance setups');
		});
	});
});

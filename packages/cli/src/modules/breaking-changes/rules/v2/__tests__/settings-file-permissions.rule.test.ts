import type { GlobalConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';

import { SettingsFilePermissionsRule } from '../settings-file-permissions.rule';

describe('SettingsFilePermissionsRule', () => {
	let rule: SettingsFilePermissionsRule;
	const mockGlobalConfig = mock<GlobalConfig>({
		deployment: { type: 'default' },
	});
	let originalEnvValue: string | undefined;

	beforeEach(() => {
		rule = new SettingsFilePermissionsRule(mockGlobalConfig);
		originalEnvValue = process.env.N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS;
		// Clear env var before each test
		delete process.env.N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS;
	});

	afterEach(() => {
		if (originalEnvValue === undefined) {
			delete process.env.N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS;
		} else {
			process.env.N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS = originalEnvValue;
		}
	});

	describe('detect()', () => {
		it('should not be affected on cloud deployments', async () => {
			const cloudGlobalConfig = mock<GlobalConfig>({
				deployment: { type: 'cloud' },
			});
			const cloudRule = new SettingsFilePermissionsRule(cloudGlobalConfig);

			const result = await cloudRule.detect();

			expect(result.isAffected).toBe(false);
			expect(result.instanceIssues).toHaveLength(0);
			expect(result.recommendations).toHaveLength(0);
		});

		it('should not be affected when N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS is explicitly set to false', async () => {
			process.env.N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS = 'false';

			const result = await rule.detect();

			expect(result.isAffected).toBe(false);
			expect(result.instanceIssues).toHaveLength(0);
			expect(result.recommendations).toHaveLength(0);
		});

		it('should not be affected when N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS is explicitly set to true', async () => {
			process.env.N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS = 'true';

			const result = await rule.detect();

			expect(result.isAffected).toBe(false);
			expect(result.instanceIssues).toHaveLength(0);
			expect(result.recommendations).toHaveLength(0);
		});

		it('should be affected when N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS is not set (default behavior change)', async () => {
			// Env var is not set (cleared in beforeEach)
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

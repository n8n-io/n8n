import type { LicenseState } from '@n8n/backend-common';
import type { Settings, SettingsRepository } from '@n8n/db';
import { EXTERNAL_SECRETS_SYSTEM_ROLES_ENABLED_SETTING } from '@n8n/permissions';
import { mock } from 'vitest-mock-extended';

import { ExternalSecretsProjectRolesDefaultRule } from '../external-secrets-project-roles-default.rule';

describe('ExternalSecretsProjectRolesDefaultRule', () => {
	const licenseState = mock<LicenseState>();
	const settingsRepository = mock<SettingsRepository>();

	const rule = new ExternalSecretsProjectRolesDefaultRule(licenseState, settingsRepository);

	const settingRow = (value: string) =>
		mock<Settings>({ key: EXTERNAL_SECRETS_SYSTEM_ROLES_ENABLED_SETTING.key, value });

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('detect()', () => {
		it('should not be affected when external secrets is not licensed', async () => {
			licenseState.isExternalSecretsLicensed.mockReturnValue(false);

			const result = await rule.detect();

			expect(result.isAffected).toBe(false);
			expect(result.instanceIssues).toHaveLength(0);
			expect(result.recommendations).toHaveLength(0);
			expect(settingsRepository.findByKeys).not.toHaveBeenCalled();
		});

		it('should not be affected when licensed and the toggle is on', async () => {
			licenseState.isExternalSecretsLicensed.mockReturnValue(true);
			settingsRepository.findByKeys.mockResolvedValue([settingRow('true')]);

			const result = await rule.detect();

			expect(result.isAffected).toBe(false);
			expect(result.instanceIssues).toHaveLength(0);
		});

		it('should be affected when licensed and the setting is missing', async () => {
			licenseState.isExternalSecretsLicensed.mockReturnValue(true);
			settingsRepository.findByKeys.mockResolvedValue([]);

			const result = await rule.detect();

			expect(result.isAffected).toBe(true);
			expect(result.instanceIssues).toHaveLength(1);
			expect(result.instanceIssues[0].level).toBe('warning');
			expect(result.recommendations).toHaveLength(1);
		});

		it('should be affected when licensed and the toggle is off', async () => {
			licenseState.isExternalSecretsLicensed.mockReturnValue(true);
			settingsRepository.findByKeys.mockResolvedValue([settingRow('false')]);

			const result = await rule.detect();

			expect(result.isAffected).toBe(true);
			expect(result.instanceIssues).toHaveLength(1);
		});
	});
});

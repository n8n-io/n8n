import type { LicenseState } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';

import { ExternalSecretsProjectRolesDefaultRule } from '../external-secrets-project-roles-default.rule';

describe('ExternalSecretsProjectRolesDefaultRule', () => {
	const licenseState = mock<LicenseState>();

	const rule = new ExternalSecretsProjectRolesDefaultRule(licenseState);

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
		});

		it('should be affected when licensed and the setting is missing', async () => {
			licenseState.isExternalSecretsLicensed.mockReturnValue(true);

			const result = await rule.detect();

			expect(result.isAffected).toBe(true);
			expect(result.instanceIssues).toHaveLength(1);
			expect(result.instanceIssues[0].level).toBe('warning');
			expect(result.recommendations).toHaveLength(1);
		});
	});
});

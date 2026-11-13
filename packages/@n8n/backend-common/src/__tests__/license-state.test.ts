import { LICENSE_FEATURES } from '@n8n/constants';
import { mock } from 'vitest-mock-extended';

import { LicenseState } from '../license-state';
import type { LicenseProvider } from '../types';

describe('LicenseState', () => {
	describe('isExecutionLimitsLicensed', () => {
		it.each([true, false])('returns %s when the provider returns %s', (licensed) => {
			const provider = mock<LicenseProvider>();
			provider.isLicensed.mockReturnValue(licensed);
			const licenseState = new LicenseState();
			licenseState.setLicenseProvider(provider);

			expect(licenseState.isExecutionLimitsLicensed()).toBe(licensed);
			expect(provider.isLicensed).toHaveBeenCalledWith(LICENSE_FEATURES.EXECUTION_LIMITS);
		});
	});
});

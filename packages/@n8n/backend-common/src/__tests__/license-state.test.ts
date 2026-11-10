import { LICENSE_QUOTAS, UNLIMITED_LICENSE_QUOTA } from '@n8n/constants';
import { mock } from 'vitest-mock-extended';

import { LicenseState } from '../license-state';
import type { FeatureReturnType, LicenseProvider } from '../types';

describe('LicenseState quotas', () => {
	const quotaQueries = [
		['getMaxUsers', LICENSE_QUOTAS.USERS_LIMIT, UNLIMITED_LICENSE_QUOTA],
		['getMaxActiveWorkflows', LICENSE_QUOTAS.TRIGGER_LIMIT, UNLIMITED_LICENSE_QUOTA],
		['getMaxVariables', LICENSE_QUOTAS.VARIABLES_LIMIT, UNLIMITED_LICENSE_QUOTA],
		['getMaxAiCredits', LICENSE_QUOTAS.AI_CREDITS, 0],
		['getMaxTeamProjects', LICENSE_QUOTAS.TEAM_PROJECT_LIMIT, 0],
	] as const;

	describe.each(quotaQueries)('%s', (method, key, fallback) => {
		it.each([undefined, 0, 25, UNLIMITED_LICENSE_QUOTA])(
			'reads the matching quota and preserves the value %s',
			(quota) => {
				const provider = mock<LicenseProvider>();
				const values: FeatureReturnType = { [key]: quota };
				provider.getValue.mockImplementation((feature) => values[feature]);
				const state = new LicenseState();
				state.setLicenseProvider(provider);

				expect(state[method]()).toBe(quota ?? fallback);
				expect(provider.getValue).toHaveBeenCalledExactlyOnceWith(key);
			},
		);
	});
});

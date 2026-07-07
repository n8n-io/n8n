import { mock } from 'vitest-mock-extended';

import type { CommunityPackagesConfig } from '../../../../community-packages/community-packages.config';
import { UnverifiedPackagesRule } from '../unverified-packages.rule';

describe('UnverifiedPackagesRule', () => {
	let rule: UnverifiedPackagesRule;
	const communityPackagesConfig: CommunityPackagesConfig = mock<CommunityPackagesConfig>();
	const originalEnv = process.env;

	beforeEach(() => {
		process.env = { ...originalEnv };
		delete process.env.N8N_UNVERIFIED_PACKAGES_ENABLED;
		communityPackagesConfig.enabled = true;
		rule = new UnverifiedPackagesRule(communityPackagesConfig);
	});

	afterAll(() => {
		process.env = originalEnv;
	});

	describe('detect()', () => {
		it('should be affected when the variable is not set', async () => {
			const result = await rule.detect();

			expect(result.isAffected).toBe(true);
			expect(result.instanceIssues).toHaveLength(1);
			expect(result.instanceIssues[0].level).toBe('warning');
			expect(result.recommendations).toHaveLength(1);
		});

		it('should not be affected when the variable is set to true', async () => {
			process.env.N8N_UNVERIFIED_PACKAGES_ENABLED = 'true';

			const result = await rule.detect();

			expect(result.isAffected).toBe(false);
		});

		it('should not be affected when the variable is set to false', async () => {
			process.env.N8N_UNVERIFIED_PACKAGES_ENABLED = 'false';

			const result = await rule.detect();

			expect(result.isAffected).toBe(false);
		});

		it('should not be affected when community packages are disabled', async () => {
			communityPackagesConfig.enabled = false;

			const result = await rule.detect();

			expect(result.isAffected).toBe(false);
		});
	});
});

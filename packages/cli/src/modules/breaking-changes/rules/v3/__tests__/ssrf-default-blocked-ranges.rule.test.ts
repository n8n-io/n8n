import type { GlobalConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import { SsrfDefaultBlockedRangesRule } from '../ssrf-default-blocked-ranges.rule';

describe('SsrfDefaultBlockedRangesRule', () => {
	const createRule = (enabled: boolean) =>
		new SsrfDefaultBlockedRangesRule(mock<GlobalConfig>({ ssrfProtection: { enabled } }));

	describe('detect()', () => {
		it('should be affected when SSRF protection is enabled', async () => {
			const result = await createRule(true).detect();

			expect(result.isAffected).toBe(true);
			expect(result.instanceIssues).toHaveLength(1);
			expect(result.instanceIssues[0].level).toBe('warning');
			expect(result.recommendations).toHaveLength(1);
		});

		it('should not be affected when SSRF protection is disabled', async () => {
			const result = await createRule(false).detect();

			expect(result.isAffected).toBe(false);
			expect(result.instanceIssues).toHaveLength(0);
		});
	});
});

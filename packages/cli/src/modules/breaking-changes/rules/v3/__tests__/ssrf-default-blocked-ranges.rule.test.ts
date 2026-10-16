import type { GlobalConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import { SsrfDefaultBlockedRangesRule } from '../ssrf-default-blocked-ranges.rule';

describe('SsrfDefaultBlockedRangesRule', () => {
	const createRule = (enabled: boolean) =>
		new SsrfDefaultBlockedRangesRule(mock<GlobalConfig>({ ssrfProtection: { enabled } }));

	const originalEnv = process.env;

	beforeEach(() => {
		process.env = { ...originalEnv };
		delete process.env.N8N_SSRF_BLOCKED_IP_RANGES;
	});

	afterAll(() => {
		process.env = originalEnv;
	});

	describe('detect()', () => {
		it('should be affected when SSRF protection is enabled', async () => {
			const result = await createRule(true).detect();

			expect(result.isAffected).toBe(true);
			expect(result.instanceIssues).toHaveLength(1);
			expect(result.instanceIssues[0].level).toBe('warning');
			expect(result.recommendations).toHaveLength(1);
		});

		it('should be affected when the block list keeps the default keyword', async () => {
			process.env.N8N_SSRF_BLOCKED_IP_RANGES = 'Default, 100.64.0.0/10';

			const result = await createRule(true).detect();

			expect(result.isAffected).toBe(true);
		});

		it('should not be affected when the block list is literal ranges only', async () => {
			process.env.N8N_SSRF_BLOCKED_IP_RANGES = '10.0.0.0/8,127.0.0.0/8';

			const result = await createRule(true).detect();

			expect(result.isAffected).toBe(false);
		});

		it('should not be affected when SSRF protection is disabled', async () => {
			const result = await createRule(false).detect();

			expect(result.isAffected).toBe(false);
			expect(result.instanceIssues).toHaveLength(0);
		});
	});
});

import type { ExecutionsConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import { OffloadManualExecutionsRule } from '../offload-manual-executions.rule';

describe('OffloadManualExecutionsRule', () => {
	let rule: OffloadManualExecutionsRule;
	const executionsConfig: ExecutionsConfig = mock<ExecutionsConfig>();
	const originalEnv = process.env;

	beforeEach(() => {
		process.env = { ...originalEnv };
		delete process.env.OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS;
		rule = new OffloadManualExecutionsRule(executionsConfig);
	});

	afterAll(() => {
		process.env = originalEnv;
	});

	describe('detect()', () => {
		it('should not be affected in regular mode', async () => {
			executionsConfig.mode = 'regular';

			const result = await rule.detect();

			expect(result.isAffected).toBe(false);
			expect(result.instanceIssues).toHaveLength(0);
		});

		it('should not be affected in queue mode with offloading enabled', async () => {
			executionsConfig.mode = 'queue';
			process.env.OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS = 'true';

			const result = await rule.detect();

			expect(result.isAffected).toBe(false);
		});

		it('should be affected in queue mode without offloading', async () => {
			executionsConfig.mode = 'queue';

			const result = await rule.detect();

			expect(result.isAffected).toBe(true);
			expect(result.instanceIssues).toHaveLength(1);
			expect(result.instanceIssues[0].level).toBe('warning');
			expect(result.recommendations).toHaveLength(1);
		});

		it('should be affected in queue mode with offloading explicitly disabled', async () => {
			executionsConfig.mode = 'queue';
			process.env.OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS = 'false';

			const result = await rule.detect();

			expect(result.isAffected).toBe(true);
		});
	});
});

import type { ExecutionsConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import { PreExecuteErrorCreatesExecutionRule } from '../pre-execute-error-creates-execution.rule';

describe('PreExecuteErrorCreatesExecutionRule', () => {
	const executionsConfig = mock<ExecutionsConfig>();
	const rule = new PreExecuteErrorCreatesExecutionRule(executionsConfig);

	describe('detect()', () => {
		it('should not be affected when the compatibility flag is off', async () => {
			executionsConfig.preExecuteErrorCreatesExecution = false;

			const result = await rule.detect();

			expect(result.isAffected).toBe(false);
			expect(result.instanceIssues).toHaveLength(0);
			expect(result.recommendations).toHaveLength(0);
		});

		it('should be affected when the compatibility flag is on', async () => {
			executionsConfig.preExecuteErrorCreatesExecution = true;

			const result = await rule.detect();

			expect(result.isAffected).toBe(true);
			expect(result.instanceIssues).toHaveLength(1);
			expect(result.instanceIssues[0].level).toBe('warning');
			expect(result.recommendations).toHaveLength(1);
		});
	});
});

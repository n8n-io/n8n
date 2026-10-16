import { PreExecuteErrorCreatesExecutionRule } from '../pre-execute-error-creates-execution.rule';

describe('PreExecuteErrorCreatesExecutionRule', () => {
	const rule = new PreExecuteErrorCreatesExecutionRule();

	afterEach(() => {
		delete process.env.N8N_PRE_EXECUTE_ERROR_CREATES_EXECUTION;
	});

	describe('detect()', () => {
		it.each(['false', '0', 'invalid', undefined])(
			'should not be affected when the env var is %s',
			async (value) => {
				if (value) process.env.N8N_PRE_EXECUTE_ERROR_CREATES_EXECUTION = value;

				const result = await rule.detect();

				expect(result.isAffected).toBe(false);
				expect(result.instanceIssues).toHaveLength(0);
				expect(result.recommendations).toHaveLength(0);
			},
		);

		it.each(['true', '1', ' "true" '])(
			'should be affected when the env var is %s',
			async (value) => {
				process.env.N8N_PRE_EXECUTE_ERROR_CREATES_EXECUTION = value;

				const result = await rule.detect();

				expect(result.isAffected).toBe(true);
				expect(result.instanceIssues).toHaveLength(1);
				expect(result.instanceIssues[0].level).toBe('warning');
				expect(result.recommendations).toHaveLength(1);
			},
		);
	});
});

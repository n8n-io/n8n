import { TaskRunnerTaskTimeoutRule } from '../task-runner-task-timeout.rule';

describe('TaskRunnerTaskTimeoutRule', () => {
	let rule: TaskRunnerTaskTimeoutRule;
	const originalEnv = process.env;

	beforeEach(() => {
		process.env = { ...originalEnv };
		delete process.env.N8N_RUNNERS_TASK_TIMEOUT;
		rule = new TaskRunnerTaskTimeoutRule();
	});

	afterAll(() => {
		process.env = originalEnv;
	});

	describe('detect()', () => {
		it('should be affected when the variable is not set', async () => {
			const result = await rule.detect();

			expect(result.isAffected).toBe(true);
			expect(result.instanceIssues).toHaveLength(1);
			expect(result.instanceIssues[0].level).toBe('info');
			expect(result.recommendations).toHaveLength(1);
		});

		it('should not be affected when the variable is set', async () => {
			process.env.N8N_RUNNERS_TASK_TIMEOUT = '300';

			const result = await rule.detect();

			expect(result.isAffected).toBe(false);
			expect(result.instanceIssues).toHaveLength(0);
		});
	});
});

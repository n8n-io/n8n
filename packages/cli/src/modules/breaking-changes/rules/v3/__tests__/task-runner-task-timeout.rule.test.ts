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

	describe('getMetadata()', () => {
		it('should report an executionsMightFail impact because only a default changes and the admin can override it', () => {
			expect(rule.getMetadata().impact).toBe('executionsMightFail');
		});

		it('should say that only the default changes', () => {
			const { description } = rule.getMetadata();

			expect(description).toMatch(/only the default/i);
			expect(description).not.toMatch(/will fail|will be aborted|start failing/);
		});
	});

	describe('recommendation', () => {
		it('should name the variable that keeps the current timeout, and say when to set it', async () => {
			const { recommendations } = await rule.detect();
			const { description } = recommendations[0];

			expect(description).toContain('N8N_RUNNERS_TASK_TIMEOUT=300');
			expect(description).toMatch(/only when .*not set/i);
			expect(description).toMatch(/do not need to do anything/i);
		});
	});
});

import { TaskRunnerInternalModeRule } from '../task-runner-internal-mode.rule';

describe('TaskRunnerInternalModeRule', () => {
	const rule = new TaskRunnerInternalModeRule();
	const originalEnv = process.env;

	beforeEach(() => {
		process.env = { ...originalEnv };
		delete process.env.N8N_RUNNERS_MODE;
	});

	afterAll(() => {
		process.env = originalEnv;
	});

	describe('detect()', () => {
		it('should be affected when the mode is explicitly internal', async () => {
			process.env.N8N_RUNNERS_MODE = 'internal';

			const result = await rule.detect();

			expect(result.isAffected).toBe(true);
			expect(result.instanceIssues).toHaveLength(1);
			expect(result.instanceIssues[0].level).toBe('warning');
			expect(result.recommendations).toHaveLength(1);
		});

		it('should not be affected when the mode is external', async () => {
			process.env.N8N_RUNNERS_MODE = 'external';

			const result = await rule.detect();

			expect(result.isAffected).toBe(false);
		});

		it('should not be affected when the mode is not set', async () => {
			const result = await rule.detect();

			expect(result.isAffected).toBe(false);
		});
	});
});

import type { TaskRunnersConfig } from '@n8n/config';

import { TaskRunnersRule } from '../task-runners.rule';

describe('TaskRunnersRule', () => {
	describe('detect()', () => {
		it('should not be affected when runners are already enabled', async () => {
			const mockConfig = { enabled: true } as TaskRunnersConfig;
			const rule = new TaskRunnersRule(mockConfig);

			const result = await rule.detect();

			expect(result.isAffected).toBe(false);
			expect(result.instanceIssues).toHaveLength(0);
		});

		it('should be affected when runners are not enabled', async () => {
			const mockConfig = { enabled: false } as TaskRunnersConfig;
			const rule = new TaskRunnersRule(mockConfig);

			const result = await rule.detect();

			expect(result.isAffected).toBe(true);
			expect(result.instanceIssues).toHaveLength(1);
			expect(result.instanceIssues[0].title).toBe('Task Runners will be enabled by default');
		});

		it('should be affected when runners are explicitly disabled', async () => {
			const mockConfig = { enabled: false } as TaskRunnersConfig;
			const rule = new TaskRunnersRule(mockConfig);

			const result = await rule.detect();

			expect(result.isAffected).toBe(true);
			expect(result.recommendations).toHaveLength(3);
		});
	});
});

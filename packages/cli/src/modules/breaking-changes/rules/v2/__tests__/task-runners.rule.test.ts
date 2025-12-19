import type { GlobalConfig, TaskRunnersConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';

import { TaskRunnersRule } from '../task-runners.rule';

describe('TaskRunnersRule', () => {
	let mockGlobalConfig: GlobalConfig;

	beforeEach(() => {
		mockGlobalConfig = mock<GlobalConfig>({
			deployment: { type: 'default' },
		});
	});

	describe('detect()', () => {
		it('should not be affected on cloud deployments', async () => {
			const mockConfig = { enabled: false } as TaskRunnersConfig;
			const cloudGlobalConfig = mock<GlobalConfig>({
				deployment: { type: 'cloud' },
			});
			const rule = new TaskRunnersRule(mockConfig, cloudGlobalConfig);

			const result = await rule.detect();

			expect(result.isAffected).toBe(false);
			expect(result.instanceIssues).toHaveLength(0);
			expect(result.recommendations).toHaveLength(0);
		});

		it('should not be affected when runners are already enabled', async () => {
			const mockConfig = { enabled: true } as TaskRunnersConfig;
			const rule = new TaskRunnersRule(mockConfig, mockGlobalConfig);

			const result = await rule.detect();

			expect(result.isAffected).toBe(false);
			expect(result.instanceIssues).toHaveLength(0);
		});

		it('should be affected when runners are not enabled', async () => {
			const mockConfig = { enabled: false } as TaskRunnersConfig;
			const rule = new TaskRunnersRule(mockConfig, mockGlobalConfig);

			const result = await rule.detect();

			expect(result.isAffected).toBe(true);
			expect(result.instanceIssues).toHaveLength(1);
			expect(result.instanceIssues[0].title).toBe('Task Runners will be enabled by default');
			expect(result.recommendations).toHaveLength(3);
		});

		it('should be affected when runners are explicitly disabled', async () => {
			const mockConfig = { enabled: false } as TaskRunnersConfig;
			const rule = new TaskRunnersRule(mockConfig, mockGlobalConfig);

			const result = await rule.detect();

			expect(result.isAffected).toBe(true);
			expect(result.recommendations).toHaveLength(3);
		});
	});
});

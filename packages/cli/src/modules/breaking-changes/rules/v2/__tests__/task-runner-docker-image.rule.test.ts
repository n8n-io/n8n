import type { GlobalConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';

import { TaskRunnerDockerImageRule } from '../task-runner-docker-image.rule';

describe('TaskRunnerDockerImageRule', () => {
	let rule: TaskRunnerDockerImageRule;

	beforeEach(() => {
		const mockGlobalConfig = mock<GlobalConfig>({
			deployment: { type: 'default' },
		});
		rule = new TaskRunnerDockerImageRule(mockGlobalConfig);
	});

	describe('getMetadata()', () => {
		it('should return correct metadata', () => {
			const metadata = rule.getMetadata();

			expect(metadata.version).toBe('v2');
			expect(metadata.title).toBe('Remove task runner from n8nio/n8n docker image');
			expect(metadata.severity).toBe('medium');
		});
	});

	describe('detect()', () => {
		it('should not be affected on cloud deployments', async () => {
			const mockGlobalConfig = mock<GlobalConfig>({
				deployment: { type: 'cloud' },
			});
			const cloudRule = new TaskRunnerDockerImageRule(mockGlobalConfig);

			const result = await cloudRule.detect();

			expect(result.isAffected).toBe(false);
			expect(result.instanceIssues).toHaveLength(0);
			expect(result.recommendations).toHaveLength(0);
		});

		it('should always be affected (informational)', async () => {
			const result = await rule.detect();

			expect(result.isAffected).toBe(true);
			expect(result.instanceIssues).toHaveLength(1);
			expect(result.instanceIssues[0].title).toBe('Task runner removed from main Docker image');
			expect(result.instanceIssues[0].level).toBe('warning');
		});

		it('should include description about Docker image change', async () => {
			const result = await rule.detect();

			expect(result.instanceIssues[0].description).toContain('n8nio/n8n');
			expect(result.instanceIssues[0].description).toContain('n8nio/runners');
		});

		it('should have 3 recommendations', async () => {
			const result = await rule.detect();

			expect(result.recommendations).toHaveLength(3);
			expect(result.recommendations[0].action).toContain('Update Docker configuration');
			expect(result.recommendations[1].action).toContain('Configure external task runners');
			expect(result.recommendations[2].action).toContain('Review task runner documentation');
		});

		it('should mention N8N_RUNNERS_MODE=external in recommendations', async () => {
			const result = await rule.detect();

			const externalRunnerRec = result.recommendations.find((r) =>
				r.description.includes('N8N_RUNNERS_MODE=external'),
			);
			expect(externalRunnerRec).toBeDefined();
		});
	});
});

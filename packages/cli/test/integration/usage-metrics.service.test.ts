import { mock } from 'jest-mock-extended';
import { UsageMetricsService } from '@/services/usageMetrics.service';
import type { WorkflowRepository } from '@/databases/repositories/workflow.repository';
import type { UsageMetricsRepository } from '@/databases/repositories/usageMetrics.repository';

describe('UsageMetricsService', () => {
	const workflowRepository = mock<WorkflowRepository>();
	const usageMetricsService = new UsageMetricsService(
		mock<UsageMetricsRepository>(),
		workflowRepository,
	);

	describe('collectPassthroughData', () => {
		test('should return an object with active workflow IDs', async () => {
			/**
			 * Arrange
			 */
			const activeWorkflowIds = ['1', '2'];
			workflowRepository.getActiveIds.mockResolvedValue(activeWorkflowIds);

			/**
			 * Act
			 */
			const result = await usageMetricsService.collectPassthroughData();

			/**
			 * Assert
			 */
			expect(result).toEqual({ activeWorkflowIds });
		});
	});
});

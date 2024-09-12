import { mock } from 'jest-mock-extended';

import type { LicenseMetricsRepository } from '@/databases/repositories/license-metrics.repository';
import type { WorkflowRepository } from '@/databases/repositories/workflow.repository';
import { LicenseMetricsService } from '@/metrics/license-metrics.service';

describe('LicenseMetricsService', () => {
	const workflowRepository = mock<WorkflowRepository>();
	const licenseMetricsService = new LicenseMetricsService(
		mock<LicenseMetricsRepository>(),
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
			const result = await licenseMetricsService.collectPassthroughData();

			/**
			 * Assert
			 */
			expect(result).toEqual({ activeWorkflowIds });
		});
	});
});

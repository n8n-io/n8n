import { mock } from 'jest-mock-extended';

import type { LicenseMetricsRepository } from '@/databases/repositories/license-metrics.repository';
import type { WorkflowRepository } from '@/databases/repositories/workflow.repository';
import { LicenseMetricsService } from '@/metrics/license-metrics.service';

describe('LicenseMetricsService', () => {
	const workflowRepository = mock<WorkflowRepository>();
	const licenseMetricsRespository = mock<LicenseMetricsRepository>();
	const licenseMetricsService = new LicenseMetricsService(
		licenseMetricsRespository,
		workflowRepository,
	);

	beforeEach(() => jest.clearAllMocks());

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

	describe('collectUsageMetrics', () => {
		test('should return an array of expected usage metrics', async () => {
			const mockActiveTriggerCount = 1234;
			workflowRepository.getActiveTriggerCount.mockResolvedValue(mockActiveTriggerCount);

			const mockRenewalMetrics = {
				activeWorkflows: 100,
				totalWorkflows: 200,
				enabledUsers: 300,
				totalUsers: 400,
				totalCredentials: 500,
				productionExecutions: 600,
				manualExecutions: 700,
			};

			licenseMetricsRespository.getLicenseRenewalMetrics.mockResolvedValue(mockRenewalMetrics);

			const result = await licenseMetricsService.collectUsageMetrics();

			expect(result).toEqual([
				{ name: 'activeWorkflows', value: mockRenewalMetrics.activeWorkflows },
				{ name: 'totalWorkflows', value: mockRenewalMetrics.totalWorkflows },
				{ name: 'enabledUsers', value: mockRenewalMetrics.enabledUsers },
				{ name: 'totalUsers', value: mockRenewalMetrics.totalUsers },
				{ name: 'totalCredentials', value: mockRenewalMetrics.totalCredentials },
				{ name: 'productionExecutions', value: mockRenewalMetrics.productionExecutions },
				{ name: 'manualExecutions', value: mockRenewalMetrics.manualExecutions },
				{ name: 'activeWorkflowTriggers', value: mockActiveTriggerCount },
			]);
		});
	});
});

'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const jest_mock_extended_1 = require('jest-mock-extended');
const license_metrics_service_1 = require('@/metrics/license-metrics.service');
describe('LicenseMetricsService', () => {
	const workflowRepository = (0, jest_mock_extended_1.mock)();
	const licenseMetricsRespository = (0, jest_mock_extended_1.mock)();
	const licenseMetricsService = new license_metrics_service_1.LicenseMetricsService(
		licenseMetricsRespository,
		workflowRepository,
	);
	beforeEach(() => jest.clearAllMocks());
	describe('collectPassthroughData', () => {
		test('should return an object with active workflow IDs', async () => {
			const activeWorkflowIds = ['1', '2'];
			workflowRepository.getActiveIds.mockResolvedValue(activeWorkflowIds);
			const result = await licenseMetricsService.collectPassthroughData();
			expect(result).toEqual({ activeWorkflowIds });
		});
	});
	describe('collectUsageMetrics', () => {
		test('should return an array of expected usage metrics', async () => {
			const mockActiveTriggerCount = 1234;
			const mockWorkflowsWithEvaluationsCount = 5;
			workflowRepository.getActiveTriggerCount.mockResolvedValue(mockActiveTriggerCount);
			workflowRepository.getWorkflowsWithEvaluationCount.mockResolvedValue(
				mockWorkflowsWithEvaluationsCount,
			);
			const mockRenewalMetrics = {
				activeWorkflows: 100,
				totalWorkflows: 200,
				enabledUsers: 300,
				totalUsers: 400,
				totalCredentials: 500,
				productionExecutions: 600,
				productionRootExecutions: 550,
				manualExecutions: 700,
				evaluations: 5,
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
				{
					name: 'productionRootExecutions',
					value: mockRenewalMetrics.productionRootExecutions,
				},
				{ name: 'manualExecutions', value: mockRenewalMetrics.manualExecutions },
				{ name: 'activeWorkflowTriggers', value: mockActiveTriggerCount },
				{ name: 'evaluations', value: mockRenewalMetrics.evaluations },
			]);
		});
	});
});
//# sourceMappingURL=license-metrics.service.test.js.map

'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const credentials_1 = require('./shared/db/credentials');
const users_1 = require('./shared/db/users');
describe('LicenseMetricsRepository', () => {
	let licenseMetricsRepository;
	let workflowStatisticsRepository;
	beforeAll(async () => {
		await backend_test_utils_1.testDb.init();
		licenseMetricsRepository = di_1.Container.get(db_1.LicenseMetricsRepository);
		workflowStatisticsRepository = di_1.Container.get(db_1.WorkflowStatisticsRepository);
	});
	beforeEach(async () => {
		await backend_test_utils_1.testDb.truncate([
			'User',
			'CredentialsEntity',
			'WorkflowEntity',
			'ExecutionEntity',
			'WorkflowStatistics',
		]);
	});
	afterAll(async () => {
		await backend_test_utils_1.testDb.terminate();
	});
	describe('getLicenseRenewalMetrics', () => {
		test('should return license renewal metrics', async () => {
			const [firstWorkflow, secondWorkflow] = await (0, backend_test_utils_1.createManyWorkflows)(
				2,
				{ active: false },
			);
			await Promise.all([
				(0, users_1.createOwner)(),
				(0, users_1.createAdmin)(),
				(0, users_1.createMember)(),
				(0, users_1.createMember)(),
				(0, users_1.createUser)({ disabled: true }),
				(0, credentials_1.createManyCredentials)(2),
				(0, backend_test_utils_1.createManyWorkflows)(3, { active: true }),
			]);
			await Promise.all([
				workflowStatisticsRepository.insertWorkflowStatistics(
					'production_success',
					firstWorkflow.id,
				),
				workflowStatisticsRepository.insertWorkflowStatistics('production_error', firstWorkflow.id),
				workflowStatisticsRepository.insertWorkflowStatistics('manual_success', secondWorkflow.id),
				workflowStatisticsRepository.insertWorkflowStatistics('manual_error', secondWorkflow.id),
				workflowStatisticsRepository.upsertWorkflowStatistics(
					'production_success',
					secondWorkflow.id,
					true,
				),
			]);
			const metrics = await licenseMetricsRepository.getLicenseRenewalMetrics();
			expect(metrics).toStrictEqual({
				enabledUsers: 4,
				totalUsers: 5,
				totalCredentials: 2,
				totalWorkflows: 5,
				activeWorkflows: 3,
				productionExecutions: 3,
				productionRootExecutions: 3,
				manualExecutions: 2,
				evaluations: 0,
			});
		});
		test('should handle zero execution statistics correctly', async () => {
			await Promise.all([
				(0, users_1.createOwner)(),
				(0, backend_test_utils_1.createManyWorkflows)(3, { active: true }),
			]);
			const metrics = await licenseMetricsRepository.getLicenseRenewalMetrics();
			expect(metrics).toStrictEqual({
				enabledUsers: 1,
				totalUsers: 1,
				totalCredentials: 0,
				totalWorkflows: 3,
				activeWorkflows: 3,
				productionExecutions: 0,
				productionRootExecutions: 0,
				manualExecutions: 0,
				evaluations: 0,
			});
		});
	});
});
//# sourceMappingURL=license-metrics.repository.test.js.map

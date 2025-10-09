import { createManyWorkflows, testDb } from '@n8n/backend-test-utils';
import { StatisticsNames, LicenseMetricsRepository, WorkflowStatisticsRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { createManyCredentials } from './shared/db/credentials';
import { createAdmin, createMember, createOwner, createUser } from './shared/db/users';

describe('LicenseMetricsRepository', () => {
	let licenseMetricsRepository: LicenseMetricsRepository;
	let workflowStatisticsRepository: WorkflowStatisticsRepository;

	beforeAll(async () => {
		await testDb.init();

		licenseMetricsRepository = Container.get(LicenseMetricsRepository);

		workflowStatisticsRepository = Container.get(WorkflowStatisticsRepository);
	});

	beforeEach(async () => {
		await testDb.truncate([
			'User',
			'CredentialsEntity',
			'WorkflowEntity',
			'ExecutionEntity',
			'WorkflowStatistics',
		]);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('getLicenseRenewalMetrics', () => {
		test('should return license renewal metrics', async () => {
			const [firstWorkflow, secondWorkflow] = await createManyWorkflows(2, { active: false });

			await Promise.all([
				createOwner(),
				createAdmin(),
				createMember(),
				createMember(),
				createUser({ disabled: true }),
				createManyCredentials(2),
				createManyWorkflows(3, { active: true }),
			]);

			await Promise.all([
				workflowStatisticsRepository.insertWorkflowStatistics(
					StatisticsNames.productionSuccess,
					firstWorkflow.id,
				),
				workflowStatisticsRepository.insertWorkflowStatistics(
					StatisticsNames.productionError,
					firstWorkflow.id,
				),
				workflowStatisticsRepository.insertWorkflowStatistics(
					StatisticsNames.manualSuccess,
					secondWorkflow.id,
				),
				workflowStatisticsRepository.insertWorkflowStatistics(
					StatisticsNames.manualError,
					secondWorkflow.id,
				),
				workflowStatisticsRepository.upsertWorkflowStatistics(
					StatisticsNames.productionSuccess,
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
			await Promise.all([createOwner(), createManyWorkflows(3, { active: true })]);

			const metrics = await licenseMetricsRepository.getLicenseRenewalMetrics();

			expect(metrics).toStrictEqual({
				enabledUsers: 1,
				totalUsers: 1,
				totalCredentials: 0,
				totalWorkflows: 3,
				activeWorkflows: 3,
				productionExecutions: 0, // not NaN
				productionRootExecutions: 0, // not NaN
				manualExecutions: 0, // not NaN
				evaluations: 0,
			});
		});
	});
});

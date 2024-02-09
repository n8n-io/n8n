import { UsageMetricsRepository } from '@/databases/repositories/usageMetrics.repository';
import { createAdmin, createMember, createOwner, createUser } from './shared/db/users';
import * as testDb from './shared/testDb';
import Container from 'typedi';
import { createManyWorkflows } from './shared/db/workflows';
import { createManyCredentials } from './shared/db/credentials';
import { WorkflowStatisticsRepository } from '@/databases/repositories/workflowStatistics.repository';
import { StatisticsNames } from '@/databases/entities/WorkflowStatistics';

describe('UsageMetricsRepository', () => {
	let usageMetricsRepository: UsageMetricsRepository;
	let workflowStatisticsRepository: WorkflowStatisticsRepository;

	beforeAll(async () => {
		await testDb.init();

		usageMetricsRepository = Container.get(UsageMetricsRepository);

		workflowStatisticsRepository = Container.get(WorkflowStatisticsRepository);
	});

	beforeEach(async () => {
		await testDb.truncate(['User', 'Credentials', 'Workflow', 'Execution', 'WorkflowStatistics']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('getLicenseRenewalMetrics()', () => {
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
			]);

			const metrics = await usageMetricsRepository.getLicenseRenewalMetrics();

			expect(metrics).toStrictEqual({
				enabledUsers: 4,
				totalUsers: 5,
				totalCredentials: 2,
				totalWorkflows: 5,
				activeWorkflows: 3,
				productionExecutions: 2,
				manualExecutions: 2,
			});
		});

		test('should handle zero execution statistics correctly', async () => {
			await Promise.all([createOwner(), createManyWorkflows(3, { active: true })]);

			const metrics = await usageMetricsRepository.getLicenseRenewalMetrics();

			expect(metrics).toStrictEqual({
				enabledUsers: 1,
				totalUsers: 1,
				totalCredentials: 0,
				totalWorkflows: 3,
				activeWorkflows: 3,
				productionExecutions: 0, // not NaN
				manualExecutions: 0, // not NaN
			});
		});
	});
});

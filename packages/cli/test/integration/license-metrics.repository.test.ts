import { createManyActiveWorkflows, createManyWorkflows, testDb } from '@n8n/backend-test-utils';
import {
	GLOBAL_MEMBER_ROLE,
	StatisticsNames,
	LicenseMetricsRepository,
	ServiceAccountRepository,
	WorkflowStatisticsRepository,
} from '@n8n/db';
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
			'AgentExecutionStatistics',
		]);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('agent executions', () => {
		test('returns no agent history before the first turn', async () => {
			expect(await licenseMetricsRepository.getFirstAgentExecutionDate()).toBeNull();
			expect(
				await licenseMetricsRepository.getDailyAgentExecutions({
					startDate: new Date('2026-11-01T00:00:00.000Z'),
					endDate: new Date('2026-11-10T00:00:00.000Z'),
				}),
			).toEqual(new Map());
		});

		test('keeps concurrent turns in their UTC days without a license', async () => {
			await Promise.all(
				Array.from(
					{ length: 10 },
					async () =>
						await licenseMetricsRepository.recordAgentExecution(
							new Date('2026-11-09T23:59:59.999Z'),
						),
				),
			);
			await licenseMetricsRepository.recordAgentExecution(new Date('2026-11-10T00:00:00.000Z'));
			expect(
				await licenseMetricsRepository.getDailyAgentExecutions({
					startDate: new Date('2026-11-09T00:00:00.000Z'),
					endDate: new Date('2026-11-10T00:00:00.000Z'),
				}),
			).toEqual(
				new Map([
					['2026-11-09', 10],
					['2026-11-10', 1],
				]),
			);
			expect(
				await licenseMetricsRepository.getDailyAgentExecutions({
					startDate: new Date('2026-11-10T00:00:00.000Z'),
					endDate: new Date('2026-11-10T00:00:00.000Z'),
				}),
			).toEqual(new Map([['2026-11-10', 1]]));
			expect(await licenseMetricsRepository.getFirstAgentExecutionDate()).toEqual(
				new Date('2026-11-09T00:00:00.000Z'),
			);
			expect(await licenseMetricsRepository.getLicenseRenewalMetrics()).toMatchObject({
				productionExecutions: 11,
				productionRootExecutions: 11,
				manualExecutions: 0,
			});
		});
	});

	describe('getLicenseRenewalMetrics', () => {
		test('should return license renewal metrics', async () => {
			const [firstWorkflow, secondWorkflow] = await createManyWorkflows(2);

			await Promise.all([
				createOwner(),
				createAdmin(),
				createMember(),
				createMember(),
				createUser({ disabled: true }),
				createManyCredentials(2),
				createManyActiveWorkflows(3),
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
				workflowStatisticsRepository.insertWorkflowStatistics(
					StatisticsNames.productionSuccess,
					secondWorkflow.id,
				),
			]);

			await licenseMetricsRepository.recordAgentExecution();

			const metrics = await licenseMetricsRepository.getLicenseRenewalMetrics();

			expect(metrics).toStrictEqual({
				enabledUsers: 4,
				totalUsers: 5,
				totalCredentials: 2,
				totalWorkflows: 5,
				activeWorkflows: 3,
				productionExecutions: 4,
				productionRootExecutions: 4,
				manualExecutions: 2,
				evaluations: 0,
			});
		});

		test('should handle zero execution statistics correctly', async () => {
			const owner = await createOwner();
			await createManyActiveWorkflows(3, {}, owner);

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

		test('should not count service accounts as users', async () => {
			await createMember();
			await Container.get(ServiceAccountRepository).create({
				name: 'Deploy bot',
				role: GLOBAL_MEMBER_ROLE,
			});

			const metrics = await licenseMetricsRepository.getLicenseRenewalMetrics();

			expect(metrics.enabledUsers).toBe(1);
			expect(metrics.totalUsers).toBe(1);
		});
	});
});

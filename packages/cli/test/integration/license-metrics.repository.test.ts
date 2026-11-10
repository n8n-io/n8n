import { createManyActiveWorkflows, createManyWorkflows, testDb } from '@n8n/backend-test-utils';
import {
	GLOBAL_MEMBER_ROLE,
	StatisticsNames,
	TransactionRunner,
	LicenseMetricsRepository,
	ServiceAccountRepository,
	WorkflowStatisticsRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';

import { createManyCredentials } from './shared/db/credentials';
import { createAdmin, createMember, createOwner, createUser } from './shared/db/users';

const isPostgres = process.env.DB_TYPE === 'postgresdb';

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
			'AgentExecutionStatisticsDelta',
		]);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	async function foldAgentIncrements(batchSize = 5000) {
		if (!isPostgres) return 0;
		return await licenseMetricsRepository.rollupAgentIncrements({}, batchSize);
	}

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

		test.skipIf(!isPostgres)(
			'keeps pending increments after a failed fold and respects the batch limit',
			async () => {
				const startDate = new Date('2026-11-09T00:00:00.000Z');
				const endDate = new Date('2026-11-10T00:00:00.000Z');
				await Promise.all(
					Array.from(
						{ length: 5 },
						async () => await licenseMetricsRepository.recordAgentExecution(startDate),
					),
				);
				expect(await licenseMetricsRepository.getFirstAgentExecutionDate()).toBeNull();

				await expect(
					Container.get(TransactionRunner).run({}, async (ctx) => {
						expect(await licenseMetricsRepository.rollupAgentIncrements(ctx, 2)).toBe(2);
						throw new Error('Roll back the fold');
					}),
				).rejects.toThrow('Roll back the fold');
				expect(
					await licenseMetricsRepository.getDailyAgentExecutions({ startDate, endDate }),
				).toEqual(new Map());

				const batchSizes: number[] = [];
				for (let batch = 0; batch < 4; batch++) batchSizes.push(await foldAgentIncrements(2));
				expect(batchSizes).toEqual([2, 2, 1, 0]);
				expect(
					await licenseMetricsRepository.getDailyAgentExecutions({ startDate, endDate }),
				).toEqual(new Map([['2026-11-09', 5]]));
			},
		);

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
			await foldAgentIncrements();
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
			await foldAgentIncrements();

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

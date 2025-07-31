import { createTeamProject, createWorkflow, testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { DateTime } from 'luxon';

import { InsightsConfig } from '@/modules/insights/insights.config';

import { createCompactedInsightsEvent, createMetadata } from '../../entities/__tests__/db-utils';
import { InsightsByPeriodRepository } from '../insights-by-period.repository';

describe('InsightsByPeriodRepository', () => {
	beforeAll(async () => {
		await testModules.loadModules(['insights']);
		await testDb.init();
	});

	describe('getInsightsByTime', () => {
		test.each([
			'2023-10-01T00:00:00Z',
			'2023-10-01T00:00:00.000Z',
			'2023-10-01T00:00:00+00:00',
			'2023-10-01T00:00:00.000+00:00',
			'2023-10-01 00:00:00',
			'2023-10-01 00:00:00.000',
			'2023-10-01 00:00:00+00',
			'2023-10-01 00:00:00-02',
			'2023-10-01 00:00:00-00',
		])(
			'should parse correctly valid date %s when calling insights by time',
			async (periodStart) => {
				// ARRANGE
				const insightsByPeriodRepository = Container.get(InsightsByPeriodRepository);

				// Mock the manager.queryBuilder.getRawMany to return a mocked value
				const mockResult = [{ periodStart, runTime: 0, succeeded: 0, failed: 0, timeSaved: 0 }];

				const queryBuilderMock = {
					addCommonTableExpression: jest.fn().mockReturnThis(),
					select: jest.fn().mockReturnThis(),
					innerJoin: jest.fn().mockReturnThis(),
					where: jest.fn().mockReturnThis(),
					groupBy: jest.fn().mockReturnThis(),
					orderBy: jest.fn().mockReturnThis(),
					getRawMany: jest.fn().mockResolvedValue(mockResult),
				};

				jest
					.spyOn(insightsByPeriodRepository.manager, 'createQueryBuilder')
					.mockReturnValueOnce(queryBuilderMock as any);

				const result = await insightsByPeriodRepository.getInsightsByTime({
					maxAgeInDays: 1,
					periodUnit: 'day',
					insightTypes: ['success', 'failure', 'time_saved_min'],
				});

				// ASSERT
				expect(result[0]?.periodStart).not.toBeNull();
				expect(new Date(result[0]?.periodStart).toString()).not.toBe('Invalid Date');
			},
		);
	});

	describe('Avoid deadlock error', () => {
		let defaultBatchSize: number;
		beforeAll(() => {
			// Store the original config value
			const insightsConfig = Container.get(InsightsConfig);
			defaultBatchSize = insightsConfig.compactionBatchSize;

			// Set a smaller batch size to trigger the deadlock error
			insightsConfig.compactionBatchSize = 3;
		});

		afterAll(() => {
			// Reset the config to its original state
			const insightsConfig = Container.get(InsightsConfig);
			insightsConfig.compactionBatchSize = defaultBatchSize;
		});

		test('should not throw deadlock error on concurrent compaction', async () => {
			// ARRANGE
			const insightsConfig = Container.get(InsightsConfig);
			const insightsByPeriodRepository = Container.get(InsightsByPeriodRepository);
			const transactionSpy = jest.spyOn(insightsByPeriodRepository.manager, 'transaction');
			const project = await createTeamProject();
			const workflow = await createWorkflow({}, project);
			await createMetadata(workflow);

			const batchQuery = insightsByPeriodRepository.getPeriodInsightsBatchQuery({
				periodUnitToCompactFrom: 'hour',
				compactionBatchSize: insightsConfig.compactionBatchSize,
				maxAgeInDays: insightsConfig.compactionHourlyToDailyThresholdDays,
			});

			// Create test data
			const promises = [];
			for (let i = 0; i < 100; i++) {
				await createCompactedInsightsEvent(workflow, {
					type: 'success',
					value: 1,
					periodUnit: 'hour',
					periodStart: DateTime.now().minus({ day: 91, hour: i + 1 }),
				});
			}

			// ACT
			for (let i = 0; i < 10; i++) {
				promises.push(
					insightsByPeriodRepository.compactSourceDataIntoInsightPeriod({
						sourceBatchQuery: batchQuery,
						sourceTableName: insightsByPeriodRepository.metadata.tableName,
						periodUnitToCompactInto: 'day',
					}),
				);
			}

			// ASSERT
			// await all promises concurrently
			await expect(Promise.all(promises)).resolves.toBeDefined();
			expect(transactionSpy).toHaveBeenCalledTimes(1);
		});
	});
});

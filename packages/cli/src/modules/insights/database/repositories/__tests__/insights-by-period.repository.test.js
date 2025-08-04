'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const di_1 = require('@n8n/di');
const luxon_1 = require('luxon');
const insights_config_1 = require('@/modules/insights/insights.config');
const db_utils_1 = require('../../entities/__tests__/db-utils');
const insights_by_period_repository_1 = require('../insights-by-period.repository');
describe('InsightsByPeriodRepository', () => {
	beforeAll(async () => {
		await backend_test_utils_1.testModules.loadModules(['insights']);
		await backend_test_utils_1.testDb.init();
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
				const insightsByPeriodRepository = di_1.Container.get(
					insights_by_period_repository_1.InsightsByPeriodRepository,
				);
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
					.mockReturnValueOnce(queryBuilderMock);
				const result = await insightsByPeriodRepository.getInsightsByTime({
					maxAgeInDays: 1,
					periodUnit: 'day',
					insightTypes: ['success', 'failure', 'time_saved_min'],
				});
				expect(result[0]?.periodStart).not.toBeNull();
				expect(new Date(result[0]?.periodStart).toString()).not.toBe('Invalid Date');
			},
		);
	});
	describe('Avoid deadlock error', () => {
		let defaultBatchSize;
		beforeAll(() => {
			const insightsConfig = di_1.Container.get(insights_config_1.InsightsConfig);
			defaultBatchSize = insightsConfig.compactionBatchSize;
			insightsConfig.compactionBatchSize = 3;
		});
		afterAll(() => {
			const insightsConfig = di_1.Container.get(insights_config_1.InsightsConfig);
			insightsConfig.compactionBatchSize = defaultBatchSize;
		});
		test('should not throw deadlock error on concurrent compaction', async () => {
			const insightsConfig = di_1.Container.get(insights_config_1.InsightsConfig);
			const insightsByPeriodRepository = di_1.Container.get(
				insights_by_period_repository_1.InsightsByPeriodRepository,
			);
			const transactionSpy = jest.spyOn(insightsByPeriodRepository.manager, 'transaction');
			const project = await (0, backend_test_utils_1.createTeamProject)();
			const workflow = await (0, backend_test_utils_1.createWorkflow)({}, project);
			await (0, db_utils_1.createMetadata)(workflow);
			const batchQuery = insightsByPeriodRepository.getPeriodInsightsBatchQuery({
				periodUnitToCompactFrom: 'hour',
				compactionBatchSize: insightsConfig.compactionBatchSize,
				maxAgeInDays: insightsConfig.compactionHourlyToDailyThresholdDays,
			});
			const promises = [];
			for (let i = 0; i < 100; i++) {
				await (0, db_utils_1.createCompactedInsightsEvent)(workflow, {
					type: 'success',
					value: 1,
					periodUnit: 'hour',
					periodStart: luxon_1.DateTime.now().minus({ day: 91, hour: i + 1 }),
				});
			}
			for (let i = 0; i < 10; i++) {
				promises.push(
					insightsByPeriodRepository.compactSourceDataIntoInsightPeriod({
						sourceBatchQuery: batchQuery,
						sourceTableName: insightsByPeriodRepository.metadata.tableName,
						periodUnitToCompactInto: 'day',
					}),
				);
			}
			await expect(Promise.all(promises)).resolves.toBeDefined();
			expect(transactionSpy).toHaveBeenCalledTimes(1);
		});
	});
});
//# sourceMappingURL=insights-by-period.repository.test.js.map

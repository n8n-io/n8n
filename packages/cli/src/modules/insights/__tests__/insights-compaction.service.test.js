'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const di_1 = require('@n8n/di');
const jest_mock_extended_1 = require('jest-mock-extended');
const luxon_1 = require('luxon');
const insights_raw_repository_1 = require('@/modules/insights/database/repositories/insights-raw.repository');
const db_utils_1 = require('../database/entities/__tests__/db-utils');
const insights_by_period_repository_1 = require('../database/repositories/insights-by-period.repository');
const insights_compaction_service_1 = require('../insights-compaction.service');
const insights_config_1 = require('../insights.config');
beforeAll(async () => {
	await backend_test_utils_1.testModules.loadModules(['insights']);
	await backend_test_utils_1.testDb.init();
});
beforeEach(async () => {
	await backend_test_utils_1.testDb.truncate([
		'InsightsRaw',
		'InsightsByPeriod',
		'InsightsMetadata',
		'WorkflowEntity',
		'Project',
	]);
});
afterAll(async () => {
	await backend_test_utils_1.testDb.terminate();
});
describe('compaction', () => {
	describe('compactRawToHour', () => {
		test.each([
			{
				name: 'compact into 2 rows',
				timestamps: [
					luxon_1.DateTime.utc(2000, 1, 1, 0, 0),
					luxon_1.DateTime.utc(2000, 1, 1, 0, 59),
					luxon_1.DateTime.utc(2000, 1, 1, 1, 0),
				],
				batches: [2, 1],
			},
			{
				name: 'compact into 3 rows',
				timestamps: [
					luxon_1.DateTime.utc(2000, 1, 1, 0, 0),
					luxon_1.DateTime.utc(2000, 1, 1, 1, 0),
					luxon_1.DateTime.utc(2000, 1, 1, 2, 0),
				],
				batches: [1, 1, 1],
			},
		])('$name', async ({ timestamps, batches }) => {
			const insightsCompactionService = di_1.Container.get(
				insights_compaction_service_1.InsightsCompactionService,
			);
			const insightsRawRepository = di_1.Container.get(
				insights_raw_repository_1.InsightsRawRepository,
			);
			const insightsByPeriodRepository = di_1.Container.get(
				insights_by_period_repository_1.InsightsByPeriodRepository,
			);
			const project = await (0, backend_test_utils_1.createTeamProject)();
			const workflow = await (0, backend_test_utils_1.createWorkflow)({}, project);
			await (0, db_utils_1.createMetadata)(workflow);
			for (const timestamp of timestamps) {
				await (0, db_utils_1.createRawInsightsEvent)(workflow, {
					type: 'success',
					value: 1,
					timestamp,
				});
			}
			const compactedRows = await insightsCompactionService.compactRawToHour();
			expect(compactedRows).toBe(timestamps.length);
			await expect(insightsRawRepository.count()).resolves.toBe(0);
			const allCompacted = await insightsByPeriodRepository.find({ order: { periodStart: 1 } });
			expect(allCompacted).toHaveLength(batches.length);
			for (const [index, compacted] of allCompacted.entries()) {
				expect(compacted.value).toBe(batches[index]);
			}
		});
		test('batch compaction split events in hourly insight periods', async () => {
			const insightsCompactionService = di_1.Container.get(
				insights_compaction_service_1.InsightsCompactionService,
			);
			const insightsRawRepository = di_1.Container.get(
				insights_raw_repository_1.InsightsRawRepository,
			);
			const insightsByPeriodRepository = di_1.Container.get(
				insights_by_period_repository_1.InsightsByPeriodRepository,
			);
			const project = await (0, backend_test_utils_1.createTeamProject)();
			const workflow = await (0, backend_test_utils_1.createWorkflow)({}, project);
			const batchSize = 100;
			let timestamp = luxon_1.DateTime.utc().startOf('hour');
			for (let i = 0; i < batchSize; i++) {
				await (0, db_utils_1.createRawInsightsEvent)(workflow, {
					type: 'success',
					value: 1,
					timestamp,
				});
				timestamp = timestamp.plus({ minute: 1 });
			}
			await insightsCompactionService.compactInsights();
			await expect(insightsRawRepository.count()).resolves.toBe(0);
			const allCompacted = await insightsByPeriodRepository.find({ order: { periodStart: 1 } });
			const accumulatedValues = allCompacted.reduce((acc, event) => acc + event.value, 0);
			expect(accumulatedValues).toBe(batchSize);
			expect(allCompacted[0].value).toBe(60);
			expect(allCompacted[1].value).toBe(40);
		});
		test('batch compaction split events in hourly insight periods by type and workflow', async () => {
			const insightsCompactionService = di_1.Container.get(
				insights_compaction_service_1.InsightsCompactionService,
			);
			const insightsRawRepository = di_1.Container.get(
				insights_raw_repository_1.InsightsRawRepository,
			);
			const insightsByPeriodRepository = di_1.Container.get(
				insights_by_period_repository_1.InsightsByPeriodRepository,
			);
			const project = await (0, backend_test_utils_1.createTeamProject)();
			const workflow1 = await (0, backend_test_utils_1.createWorkflow)({}, project);
			const workflow2 = await (0, backend_test_utils_1.createWorkflow)({}, project);
			const batchSize = 100;
			let timestamp = luxon_1.DateTime.utc().startOf('hour');
			for (let i = 0; i < batchSize / 4; i++) {
				await (0, db_utils_1.createRawInsightsEvent)(workflow1, {
					type: 'success',
					value: 1,
					timestamp,
				});
				timestamp = timestamp.plus({ minute: 1 });
			}
			for (let i = 0; i < batchSize / 4; i++) {
				await (0, db_utils_1.createRawInsightsEvent)(workflow1, {
					type: 'failure',
					value: 1,
					timestamp,
				});
				timestamp = timestamp.plus({ minute: 1 });
			}
			for (let i = 0; i < batchSize / 4; i++) {
				await (0, db_utils_1.createRawInsightsEvent)(workflow2, {
					type: 'runtime_ms',
					value: 1200,
					timestamp,
				});
				timestamp = timestamp.plus({ minute: 1 });
			}
			for (let i = 0; i < batchSize / 4; i++) {
				await (0, db_utils_1.createRawInsightsEvent)(workflow2, {
					type: 'time_saved_min',
					value: 3,
					timestamp,
				});
				timestamp = timestamp.plus({ minute: 1 });
			}
			await insightsCompactionService.compactInsights();
			await expect(insightsRawRepository.count()).resolves.toBe(0);
			const allCompacted = await insightsByPeriodRepository.find({
				order: { metaId: 'ASC', periodStart: 'ASC' },
			});
			expect(allCompacted).toHaveLength(5);
			const metaIds = allCompacted.map((event) => event.metaId);
			const uniqueMetaIds = [metaIds[0], metaIds[2]];
			const workflow1Insights = allCompacted.filter((event) => event.metaId === uniqueMetaIds[0]);
			const workflow2Insights = allCompacted.filter((event) => event.metaId === uniqueMetaIds[1]);
			expect(workflow1Insights).toHaveLength(2);
			expect(workflow2Insights).toHaveLength(3);
			const successInsights = workflow1Insights.find((event) => event.type === 'success');
			const failureInsights = workflow1Insights.find((event) => event.type === 'failure');
			expect(successInsights).toBeTruthy();
			expect(failureInsights).toBeTruthy();
			expect(successInsights.value).toBe(25);
			expect(failureInsights.value).toBe(25);
			const runtimeMsEvents = workflow2Insights.filter((event) => event.type === 'runtime_ms');
			const timeSavedMinEvents = workflow2Insights.find((event) => event.type === 'time_saved_min');
			expect(runtimeMsEvents).toHaveLength(2);
			expect(runtimeMsEvents[0].value).toBe(1200 * 10);
			expect(runtimeMsEvents[1].value).toBe(1200 * 15);
			expect(timeSavedMinEvents).toBeTruthy();
			expect(timeSavedMinEvents.value).toBe(3 * 25);
		});
		test('should return the number of compacted events', async () => {
			const insightsCompactionService = di_1.Container.get(
				insights_compaction_service_1.InsightsCompactionService,
			);
			const project = await (0, backend_test_utils_1.createTeamProject)();
			const workflow = await (0, backend_test_utils_1.createWorkflow)({}, project);
			const batchSize = 100;
			let timestamp = luxon_1.DateTime.utc(2000, 1, 1, 0, 0);
			for (let i = 0; i < batchSize; i++) {
				await (0, db_utils_1.createRawInsightsEvent)(workflow, {
					type: 'success',
					value: 1,
					timestamp,
				});
				timestamp = timestamp.plus({ minute: 1 });
			}
			const numberOfCompactedData = await insightsCompactionService.compactRawToHour();
			expect(numberOfCompactedData).toBe(100);
		});
		test('works with data in the compacted table', async () => {
			const insightsCompactionService = di_1.Container.get(
				insights_compaction_service_1.InsightsCompactionService,
			);
			const insightsRawRepository = di_1.Container.get(
				insights_raw_repository_1.InsightsRawRepository,
			);
			const insightsByPeriodRepository = di_1.Container.get(
				insights_by_period_repository_1.InsightsByPeriodRepository,
			);
			const project = await (0, backend_test_utils_1.createTeamProject)();
			const workflow = await (0, backend_test_utils_1.createWorkflow)({}, project);
			const batchSize = 100;
			let timestamp = luxon_1.DateTime.utc().startOf('hour');
			await (0, db_utils_1.createCompactedInsightsEvent)(workflow, {
				type: 'success',
				value: 10,
				periodUnit: 'hour',
				periodStart: timestamp,
			});
			const events = Array();
			for (let i = 0; i < batchSize; i++) {
				events.push({ type: 'success', value: 1, timestamp });
				timestamp = timestamp.plus({ minute: 1 });
			}
			await (0, db_utils_1.createRawInsightsEvents)(workflow, events);
			await insightsCompactionService.compactInsights();
			await expect(insightsRawRepository.count()).resolves.toBe(0);
			const allCompacted = await insightsByPeriodRepository.find({ order: { periodStart: 1 } });
			const accumulatedValues = allCompacted.reduce((acc, event) => acc + event.value, 0);
			expect(accumulatedValues).toBe(batchSize + 10);
			expect(allCompacted[0].value).toBe(70);
			expect(allCompacted[1].value).toBe(40);
		});
		test('works with data bigger than the batch size', async () => {
			const insightsCompactionService = di_1.Container.get(
				insights_compaction_service_1.InsightsCompactionService,
			);
			const insightsRawRepository = di_1.Container.get(
				insights_raw_repository_1.InsightsRawRepository,
			);
			const insightsByPeriodRepository = di_1.Container.get(
				insights_by_period_repository_1.InsightsByPeriodRepository,
			);
			const rawToHourSpy = jest.spyOn(insightsCompactionService, 'compactRawToHour');
			const project = await (0, backend_test_utils_1.createTeamProject)();
			const workflow = await (0, backend_test_utils_1.createWorkflow)({}, project);
			const numberOfEvents = 600;
			let timestamp = luxon_1.DateTime.utc().startOf('hour');
			const events = Array();
			for (let i = 0; i < numberOfEvents; i++) {
				events.push({ type: 'success', value: 1, timestamp });
				timestamp = timestamp.plus({ minute: 1 });
			}
			await (0, db_utils_1.createRawInsightsEvents)(workflow, events);
			await insightsCompactionService.compactInsights();
			expect(rawToHourSpy).toHaveBeenCalledTimes(2);
			await expect(insightsRawRepository.count()).resolves.toBe(0);
			const allCompacted = await insightsByPeriodRepository.find({ order: { periodStart: 1 } });
			const accumulatedValues = allCompacted.reduce((acc, event) => acc + event.value, 0);
			expect(accumulatedValues).toBe(numberOfEvents);
		});
	});
	describe('compactionSchedule', () => {
		test('compaction is running on schedule', async () => {
			jest.useFakeTimers();
			const insightsCompactionService = new insights_compaction_service_1.InsightsCompactionService(
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)({
					compactionIntervalMinutes: 60,
				}),
				(0, backend_test_utils_1.mockLogger)(),
			);
			const compactInsightsSpy = jest.spyOn(insightsCompactionService, 'compactInsights');
			try {
				insightsCompactionService.startCompactionTimer();
				jest.advanceTimersByTime(1000 * 60 * 61);
				expect(compactInsightsSpy).toHaveBeenCalledTimes(1);
			} finally {
				insightsCompactionService.stopCompactionTimer();
				jest.useRealTimers();
			}
		});
	});
	describe('compactHourToDay', () => {
		test.each([
			{
				name: 'compact into 2 rows',
				periodStarts: [
					luxon_1.DateTime.utc(2000, 1, 1, 0, 0),
					luxon_1.DateTime.utc(2000, 1, 1, 23, 59),
					luxon_1.DateTime.utc(2000, 1, 2, 1, 0),
				],
				batches: [2, 1],
			},
			{
				name: 'compact into 3 rows',
				periodStarts: [
					luxon_1.DateTime.utc(2000, 1, 1, 0, 0),
					luxon_1.DateTime.utc(2000, 1, 1, 23, 59),
					luxon_1.DateTime.utc(2000, 1, 2, 0, 0),
					luxon_1.DateTime.utc(2000, 1, 2, 23, 59),
					luxon_1.DateTime.utc(2000, 1, 3, 23, 59),
				],
				batches: [2, 2, 1],
			},
		])('$name', async ({ periodStarts, batches }) => {
			const insightsCompactionService = di_1.Container.get(
				insights_compaction_service_1.InsightsCompactionService,
			);
			const insightsByPeriodRepository = di_1.Container.get(
				insights_by_period_repository_1.InsightsByPeriodRepository,
			);
			const project = await (0, backend_test_utils_1.createTeamProject)();
			const workflow = await (0, backend_test_utils_1.createWorkflow)({}, project);
			await (0, db_utils_1.createMetadata)(workflow);
			for (const periodStart of periodStarts) {
				await (0, db_utils_1.createCompactedInsightsEvent)(workflow, {
					type: 'success',
					value: 1,
					periodUnit: 'hour',
					periodStart,
				});
			}
			const compactedRows = await insightsCompactionService.compactHourToDay();
			expect(compactedRows).toBe(periodStarts.length);
			const hourInsights = (await insightsByPeriodRepository.find()).filter(
				(insight) => insight.periodUnit !== 'day',
			);
			expect(hourInsights).toBeEmptyArray();
			const allCompacted = await insightsByPeriodRepository.find({ order: { periodStart: 1 } });
			expect(allCompacted).toHaveLength(batches.length);
			for (const [index, compacted] of allCompacted.entries()) {
				expect(compacted.value).toBe(batches[index]);
			}
		});
		test('recent insight periods should not be compacted', async () => {
			const insightsCompactionService = di_1.Container.get(
				insights_compaction_service_1.InsightsCompactionService,
			);
			const project = await (0, backend_test_utils_1.createTeamProject)();
			const workflow = await (0, backend_test_utils_1.createWorkflow)({}, project);
			await (0, db_utils_1.createMetadata)(workflow);
			await (0, db_utils_1.createCompactedInsightsEvent)(workflow, {
				type: 'success',
				value: 1,
				periodUnit: 'hour',
				periodStart: luxon_1.DateTime.utc().minus({ day: 79 }).startOf('hour'),
			});
			const compactedRows = await insightsCompactionService.compactHourToDay();
			expect(compactedRows).toBe(0);
		});
	});
	describe('compactDayToWeek', () => {
		test.each([
			{
				name: 'compact into 2 rows',
				periodStarts: [
					luxon_1.DateTime.utc(2000, 1, 3, 0, 0),
					luxon_1.DateTime.utc(2000, 1, 5, 23, 59),
					luxon_1.DateTime.utc(2000, 1, 10, 1, 0),
				],
				batches: [2, 1],
			},
			{
				name: 'compact into 3 rows',
				periodStarts: [
					luxon_1.DateTime.utc(2000, 1, 3, 0, 0),
					luxon_1.DateTime.utc(2000, 1, 4, 23, 59),
					luxon_1.DateTime.utc(2000, 1, 10, 0, 0),
					luxon_1.DateTime.utc(2000, 1, 11, 23, 59),
					luxon_1.DateTime.utc(2000, 1, 17, 23, 59),
				],
				batches: [2, 2, 1],
			},
		])('$name', async ({ periodStarts, batches }) => {
			const insightsCompactionService = di_1.Container.get(
				insights_compaction_service_1.InsightsCompactionService,
			);
			const insightsByPeriodRepository = di_1.Container.get(
				insights_by_period_repository_1.InsightsByPeriodRepository,
			);
			const project = await (0, backend_test_utils_1.createTeamProject)();
			const workflow = await (0, backend_test_utils_1.createWorkflow)({}, project);
			await (0, db_utils_1.createMetadata)(workflow);
			for (const periodStart of periodStarts) {
				await (0, db_utils_1.createCompactedInsightsEvent)(workflow, {
					type: 'success',
					value: 1,
					periodUnit: 'day',
					periodStart,
				});
			}
			const compactedRows = await insightsCompactionService.compactDayToWeek();
			expect(compactedRows).toBe(periodStarts.length);
			const hourAndDayInsights = (await insightsByPeriodRepository.find()).filter(
				(insight) => insight.periodUnit !== 'week',
			);
			expect(hourAndDayInsights).toBeEmptyArray();
			const allCompacted = await insightsByPeriodRepository.find({ order: { periodStart: 1 } });
			expect(allCompacted).toHaveLength(batches.length);
			for (const [index, compacted] of allCompacted.entries()) {
				expect(compacted.periodStart.getUTCDay()).toBe(1);
				expect(compacted.value).toBe(batches[index]);
			}
		});
		test('recent insight periods should not be compacted', async () => {
			const insightsCompactionService = di_1.Container.get(
				insights_compaction_service_1.InsightsCompactionService,
			);
			const project = await (0, backend_test_utils_1.createTeamProject)();
			const workflow = await (0, backend_test_utils_1.createWorkflow)({}, project);
			await (0, db_utils_1.createMetadata)(workflow);
			await (0, db_utils_1.createCompactedInsightsEvent)(workflow, {
				type: 'success',
				value: 1,
				periodUnit: 'day',
				periodStart: luxon_1.DateTime.utc().minus({ day: 179 }).startOf('day'),
			});
			const compactedRows = await insightsCompactionService.compactDayToWeek();
			expect(compactedRows).toBe(0);
		});
	});
	describe('compaction threshold configuration', () => {
		test('insights by period older than the hourly to daily threshold are not compacted', async () => {
			const insightsCompactionService = di_1.Container.get(
				insights_compaction_service_1.InsightsCompactionService,
			);
			const insightsByPeriodRepository = di_1.Container.get(
				insights_by_period_repository_1.InsightsByPeriodRepository,
			);
			const config = di_1.Container.get(insights_config_1.InsightsConfig);
			const project = await (0, backend_test_utils_1.createTeamProject)();
			const workflow = await (0, backend_test_utils_1.createWorkflow)({}, project);
			const thresholdDays = config.compactionHourlyToDailyThresholdDays;
			const withinThresholdTimestamp = luxon_1.DateTime.utc().minus({ days: thresholdDays - 1 });
			const beyondThresholdTimestamp = luxon_1.DateTime.utc().minus({ days: thresholdDays + 1 });
			await (0, db_utils_1.createCompactedInsightsEvent)(workflow, {
				type: 'success',
				value: 1,
				periodUnit: 'hour',
				periodStart: withinThresholdTimestamp,
			});
			await (0, db_utils_1.createCompactedInsightsEvent)(workflow, {
				type: 'success',
				value: 1,
				periodUnit: 'hour',
				periodStart: beyondThresholdTimestamp,
			});
			const compactedRows = await insightsCompactionService.compactHourToDay();
			expect(compactedRows).toBe(1);
			const insightsByPeriods = await insightsByPeriodRepository.find();
			const dailyInsights = insightsByPeriods.filter((insight) => insight.periodUnit === 'day');
			expect(dailyInsights).toHaveLength(1);
			expect(dailyInsights[0].periodStart.toISOString()).toEqual(
				beyondThresholdTimestamp.startOf('day').toISO(),
			);
		});
		test('insights by period older than the daily to weekly threshold are not compacted', async () => {
			const insightsCompactionService = di_1.Container.get(
				insights_compaction_service_1.InsightsCompactionService,
			);
			const insightsByPeriodRepository = di_1.Container.get(
				insights_by_period_repository_1.InsightsByPeriodRepository,
			);
			const config = di_1.Container.get(insights_config_1.InsightsConfig);
			const project = await (0, backend_test_utils_1.createTeamProject)();
			const workflow = await (0, backend_test_utils_1.createWorkflow)({}, project);
			const thresholdDays = config.compactionDailyToWeeklyThresholdDays;
			const withinThresholdTimestamp = luxon_1.DateTime.utc().minus({ days: thresholdDays - 1 });
			const beyondThresholdTimestamp = luxon_1.DateTime.utc().minus({ days: thresholdDays + 1 });
			await (0, db_utils_1.createCompactedInsightsEvent)(workflow, {
				type: 'success',
				value: 1,
				periodUnit: 'day',
				periodStart: withinThresholdTimestamp,
			});
			await (0, db_utils_1.createCompactedInsightsEvent)(workflow, {
				type: 'success',
				value: 1,
				periodUnit: 'day',
				periodStart: beyondThresholdTimestamp,
			});
			const compactedRows = await insightsCompactionService.compactDayToWeek();
			expect(compactedRows).toBe(1);
			const insightsByPeriods = await insightsByPeriodRepository.find();
			const weeklyInsights = insightsByPeriods.filter((insight) => insight.periodUnit === 'week');
			expect(weeklyInsights).toHaveLength(1);
			expect(weeklyInsights[0].periodStart.toISOString()).toEqual(
				beyondThresholdTimestamp.startOf('week').toISO(),
			);
		});
	});
});
//# sourceMappingURL=insights-compaction.service.test.js.map

import {
	mockLogger,
	createTeamProject,
	createWorkflow,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import type { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import { DateTime } from 'luxon';

import { InsightsRawRepository } from '@/modules/insights/database/repositories/insights-raw.repository';

import {
	createMetadata,
	createRawInsightsEvent,
	createCompactedInsightsEvent,
	createRawInsightsEvents,
} from '../database/entities/__tests__/db-utils';
import { InsightsByPeriodRepository } from '../database/repositories/insights-by-period.repository';
import { InsightsCompactionService } from '../insights-compaction.service';
import { InsightsConfig } from '../insights.config';

beforeAll(async () => {
	await testModules.loadModules(['insights']);
	await testDb.init();
});

beforeEach(async () => {
	await testDb.truncate([
		'InsightsRaw',
		'InsightsByPeriod',
		'InsightsMetadata',
		'WorkflowEntity',
		'Project',
	]);
});

// Terminate DB once after all tests complete
afterAll(async () => {
	await testDb.terminate();
});

describe('compaction', () => {
	describe('compactRawToHour', () => {
		type TestData = {
			name: string;
			timestamps: DateTime[];
			batches: number[];
		};

		test.each<TestData>([
			{
				name: 'compact into 2 rows',
				timestamps: [
					DateTime.utc(2000, 1, 1, 0, 0),
					DateTime.utc(2000, 1, 1, 0, 59),
					DateTime.utc(2000, 1, 1, 1, 0),
				],
				batches: [2, 1],
			},
			{
				name: 'compact into 3 rows',
				timestamps: [
					DateTime.utc(2000, 1, 1, 0, 0),
					DateTime.utc(2000, 1, 1, 1, 0),
					DateTime.utc(2000, 1, 1, 2, 0),
				],
				batches: [1, 1, 1],
			},
		])('$name', async ({ timestamps, batches }) => {
			// ARRANGE
			const insightsCompactionService = Container.get(InsightsCompactionService);
			const insightsRawRepository = Container.get(InsightsRawRepository);
			const insightsByPeriodRepository = Container.get(InsightsByPeriodRepository);

			const project = await createTeamProject();
			const workflow = await createWorkflow({}, project);
			// create before so we can create the raw events in parallel
			await createMetadata(workflow);
			for (const timestamp of timestamps) {
				await createRawInsightsEvent(workflow, {
					type: 'success',
					value: 1,
					timestamp,
				});
			}

			// ACT
			const compactedRows = await insightsCompactionService.compactRawToHour();

			// ASSERT
			expect(compactedRows).toBe(timestamps.length);
			await expect(insightsRawRepository.count()).resolves.toBe(0);
			const allCompacted = await insightsByPeriodRepository.find({ order: { periodStart: 1 } });
			expect(allCompacted).toHaveLength(batches.length);
			for (const [index, compacted] of allCompacted.entries()) {
				expect(compacted.value).toBe(batches[index]);
			}
		});

		test('batch compaction split events in hourly insight periods', async () => {
			// ARRANGE
			const insightsCompactionService = Container.get(InsightsCompactionService);
			const insightsRawRepository = Container.get(InsightsRawRepository);
			const insightsByPeriodRepository = Container.get(InsightsByPeriodRepository);

			const project = await createTeamProject();
			const workflow = await createWorkflow({}, project);

			const batchSize = 100;

			let timestamp = DateTime.utc().startOf('hour');
			for (let i = 0; i < batchSize; i++) {
				await createRawInsightsEvent(workflow, { type: 'success', value: 1, timestamp });
				// create 60 events per hour
				timestamp = timestamp.plus({ minute: 1 });
			}

			// ACT
			await insightsCompactionService.compactInsights();

			// ASSERT
			await expect(insightsRawRepository.count()).resolves.toBe(0);

			const allCompacted = await insightsByPeriodRepository.find({ order: { periodStart: 1 } });
			const accumulatedValues = allCompacted.reduce((acc, event) => acc + event.value, 0);
			expect(accumulatedValues).toBe(batchSize);
			expect(allCompacted[0].value).toBe(60);
			expect(allCompacted[1].value).toBe(40);
		});

		test('batch compaction split events in hourly insight periods by type and workflow', async () => {
			// ARRANGE
			const insightsCompactionService = Container.get(InsightsCompactionService);
			const insightsRawRepository = Container.get(InsightsRawRepository);
			const insightsByPeriodRepository = Container.get(InsightsByPeriodRepository);

			const project = await createTeamProject();
			const workflow1 = await createWorkflow({}, project);
			const workflow2 = await createWorkflow({}, project);

			const batchSize = 100;

			let timestamp = DateTime.utc().startOf('hour');
			for (let i = 0; i < batchSize / 4; i++) {
				await createRawInsightsEvent(workflow1, { type: 'success', value: 1, timestamp });
				timestamp = timestamp.plus({ minute: 1 });
			}

			for (let i = 0; i < batchSize / 4; i++) {
				await createRawInsightsEvent(workflow1, { type: 'failure', value: 1, timestamp });
				timestamp = timestamp.plus({ minute: 1 });
			}

			for (let i = 0; i < batchSize / 4; i++) {
				await createRawInsightsEvent(workflow2, { type: 'runtime_ms', value: 1200, timestamp });
				timestamp = timestamp.plus({ minute: 1 });
			}

			for (let i = 0; i < batchSize / 4; i++) {
				await createRawInsightsEvent(workflow2, { type: 'time_saved_min', value: 3, timestamp });
				timestamp = timestamp.plus({ minute: 1 });
			}

			// ACT
			await insightsCompactionService.compactInsights();

			// ASSERT
			await expect(insightsRawRepository.count()).resolves.toBe(0);

			const allCompacted = await insightsByPeriodRepository.find({
				order: { metaId: 'ASC', periodStart: 'ASC' },
			});

			// Expect 2 insights for workflow 1 (for success and failure)
			// and 3 for workflow 2 (2 period starts for runtime_ms and 1 for time_saved_min)
			expect(allCompacted).toHaveLength(5);
			const metaIds = allCompacted.map((event) => event.metaId);

			// meta id are ordered. first 2 are for workflow 1, last 3 are for workflow 2
			const uniqueMetaIds = [metaIds[0], metaIds[2]];
			const workflow1Insights = allCompacted.filter((event) => event.metaId === uniqueMetaIds[0]);
			const workflow2Insights = allCompacted.filter((event) => event.metaId === uniqueMetaIds[1]);

			expect(workflow1Insights).toHaveLength(2);
			expect(workflow2Insights).toHaveLength(3);

			const successInsights = workflow1Insights.find((event) => event.type === 'success');
			const failureInsights = workflow1Insights.find((event) => event.type === 'failure');

			expect(successInsights).toBeTruthy();
			expect(failureInsights).toBeTruthy();
			// success and failure insights should have the value matching the number or raw events (because value = 1)
			expect(successInsights!.value).toBe(25);
			expect(failureInsights!.value).toBe(25);

			const runtimeMsEvents = workflow2Insights.filter((event) => event.type === 'runtime_ms');
			const timeSavedMinEvents = workflow2Insights.find((event) => event.type === 'time_saved_min');
			expect(runtimeMsEvents).toHaveLength(2);

			// The last 10 minutes of the first hour
			expect(runtimeMsEvents[0].value).toBe(1200 * 10);

			// The first 15 minutes of the second hour
			expect(runtimeMsEvents[1].value).toBe(1200 * 15);
			expect(timeSavedMinEvents).toBeTruthy();
			expect(timeSavedMinEvents!.value).toBe(3 * 25);
		});

		test('should return the number of compacted events', async () => {
			// ARRANGE
			const insightsCompactionService = Container.get(InsightsCompactionService);

			const project = await createTeamProject();
			const workflow = await createWorkflow({}, project);

			const batchSize = 100;

			let timestamp = DateTime.utc(2000, 1, 1, 0, 0);
			for (let i = 0; i < batchSize; i++) {
				await createRawInsightsEvent(workflow, { type: 'success', value: 1, timestamp });
				// create 60 events per hour
				timestamp = timestamp.plus({ minute: 1 });
			}

			// ACT
			const numberOfCompactedData = await insightsCompactionService.compactRawToHour();

			// ASSERT
			expect(numberOfCompactedData).toBe(100);
		});

		test('works with data in the compacted table', async () => {
			// ARRANGE
			const insightsCompactionService = Container.get(InsightsCompactionService);
			const insightsRawRepository = Container.get(InsightsRawRepository);
			const insightsByPeriodRepository = Container.get(InsightsByPeriodRepository);

			const project = await createTeamProject();
			const workflow = await createWorkflow({}, project);

			const batchSize = 100;

			let timestamp = DateTime.utc().startOf('hour');

			// Create an existing compacted event for the first hour
			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: 10,
				periodUnit: 'hour',
				periodStart: timestamp,
			});

			const events = Array<{ type: 'success'; value: number; timestamp: DateTime }>();
			for (let i = 0; i < batchSize; i++) {
				events.push({ type: 'success', value: 1, timestamp });
				timestamp = timestamp.plus({ minute: 1 });
			}
			await createRawInsightsEvents(workflow, events);

			// ACT
			await insightsCompactionService.compactInsights();

			// ASSERT
			await expect(insightsRawRepository.count()).resolves.toBe(0);

			const allCompacted = await insightsByPeriodRepository.find({ order: { periodStart: 1 } });
			const accumulatedValues = allCompacted.reduce((acc, event) => acc + event.value, 0);
			expect(accumulatedValues).toBe(batchSize + 10);
			expect(allCompacted[0].value).toBe(70);
			expect(allCompacted[1].value).toBe(40);
		});

		test('works with data bigger than the batch size', async () => {
			// ARRANGE
			const insightsCompactionService = Container.get(InsightsCompactionService);
			const insightsRawRepository = Container.get(InsightsRawRepository);
			const insightsByPeriodRepository = Container.get(InsightsByPeriodRepository);

			// spy on the compactRawToHour method to check if it's called multiple times
			const rawToHourSpy = jest.spyOn(insightsCompactionService, 'compactRawToHour');

			const project = await createTeamProject();
			const workflow = await createWorkflow({}, project);

			// create 100 more events than the batch size (500)
			const numberOfEvents = 600;

			let timestamp = DateTime.utc().startOf('hour');
			const events = Array<{ type: 'success'; value: number; timestamp: DateTime }>();
			for (let i = 0; i < numberOfEvents; i++) {
				events.push({ type: 'success', value: 1, timestamp });
				timestamp = timestamp.plus({ minute: 1 });
			}
			await createRawInsightsEvents(workflow, events);

			// ACT
			await insightsCompactionService.compactInsights();

			// ASSERT
			// compaction batch size is 500, so rawToHour should be called 2 times:
			// 1st call: 500 events, 2nd call: 100 events
			expect(rawToHourSpy).toHaveBeenCalledTimes(2);
			await expect(insightsRawRepository.count()).resolves.toBe(0);
			const allCompacted = await insightsByPeriodRepository.find({ order: { periodStart: 1 } });
			const accumulatedValues = allCompacted.reduce((acc, event) => acc + event.value, 0);
			expect(accumulatedValues).toBe(numberOfEvents);
		});
	});

	describe('compactionSchedule', () => {
		test('compaction is running on schedule', async () => {
			// ARRANGE
			jest.useFakeTimers();
			const insightsCompactionService = new InsightsCompactionService(
				mock<InsightsByPeriodRepository>(),
				mock<InsightsRawRepository>(),
				mock<InsightsConfig>({
					compactionIntervalMinutes: 60,
				}),
				mockLogger(),
			);
			// spy on the compactInsights method to check if it's called
			const compactInsightsSpy = jest.spyOn(insightsCompactionService, 'compactInsights');

			try {
				insightsCompactionService.startCompactionTimer();

				// ACT
				// advance by 1 hour and 1 minute
				jest.advanceTimersByTime(1000 * 60 * 61);

				// ASSERT
				expect(compactInsightsSpy).toHaveBeenCalledTimes(1);
			} finally {
				insightsCompactionService.stopCompactionTimer();
				jest.useRealTimers();
			}
		});
	});

	describe('compactInsights overlap guard', () => {
		test('skips overlapping compaction and allows a later run after the active run completes', async () => {
			// ARRANGE
			const logger = mock<Logger>({ scoped: jest.fn().mockReturnThis() });
			const insightsCompactionService = new InsightsCompactionService(
				mock<InsightsByPeriodRepository>(),
				mock<InsightsRawRepository>(),
				mock<InsightsConfig>({
					compactionBatchSize: 2,
					compactionBatchDelayMilliseconds: 0,
				}),
				logger,
			);

			let resolveRawToHour!: (numberOfCompactedRawData: number) => void;
			const firstRawToHourPromise = new Promise<number>((resolve) => {
				resolveRawToHour = resolve;
			});
			const rawToHourSpy = jest
				.spyOn(insightsCompactionService, 'compactRawToHour')
				.mockReturnValueOnce(firstRawToHourPromise)
				.mockResolvedValue(0);
			const hourToDaySpy = jest
				.spyOn(insightsCompactionService, 'compactHourToDay')
				.mockResolvedValue(0);
			const dayToWeekSpy = jest
				.spyOn(insightsCompactionService, 'compactDayToWeek')
				.mockResolvedValue(0);

			const firstCompactionPromise = insightsCompactionService.compactInsights();
			await Promise.resolve();

			const batchMethodCallsBeforeSkippedRun =
				rawToHourSpy.mock.calls.length +
				hourToDaySpy.mock.calls.length +
				dayToWeekSpy.mock.calls.length;

			// ACT
			await insightsCompactionService.compactInsights();

			// ASSERT
			expect(logger.debug).toHaveBeenCalledWith(
				'Skipping insights compaction because another compaction run is active',
			);
			expect(
				rawToHourSpy.mock.calls.length +
					hourToDaySpy.mock.calls.length +
					dayToWeekSpy.mock.calls.length,
			).toBe(batchMethodCallsBeforeSkippedRun);

			resolveRawToHour(0);
			await firstCompactionPromise;

			await insightsCompactionService.compactInsights();

			expect(rawToHourSpy).toHaveBeenCalledTimes(2);
			expect(hourToDaySpy).toHaveBeenCalledTimes(2);
			expect(dayToWeekSpy).toHaveBeenCalledTimes(2);
		});
	});

	describe('compactInsights run limits', () => {
		const createCompactionService = (config: Partial<InsightsConfig> = {}) => {
			const logger = mock<Logger>({ scoped: jest.fn().mockReturnThis() });
			const insightsCompactionService = new InsightsCompactionService(
				mock<InsightsByPeriodRepository>(),
				mock<InsightsRawRepository>(),
				mock<InsightsConfig>({
					compactionBatchSize: 2,
					compactionBatchDelayMilliseconds: 0,
					compactionMaxBatchesPerRun: 1000,
					compactionMaxRuntimeSeconds: 300,
					...config,
				}),
				logger,
			);

			return { insightsCompactionService, logger };
		};

		afterEach(() => {
			jest.useRealTimers();
			jest.restoreAllMocks();
		});

		test('stops after compactionMaxBatchesPerRun', async () => {
			// ARRANGE
			const { insightsCompactionService, logger } = createCompactionService({
				compactionMaxBatchesPerRun: 2,
				compactionMaxRuntimeSeconds: 0,
			});
			const rawToHourSpy = jest
				.spyOn(insightsCompactionService, 'compactRawToHour')
				.mockResolvedValue(2);
			const hourToDaySpy = jest
				.spyOn(insightsCompactionService, 'compactHourToDay')
				.mockResolvedValue(0);
			const dayToWeekSpy = jest
				.spyOn(insightsCompactionService, 'compactDayToWeek')
				.mockResolvedValue(0);

			// ACT
			await insightsCompactionService.compactInsights();

			// ASSERT
			expect(rawToHourSpy).toHaveBeenCalledTimes(2);
			expect(hourToDaySpy).not.toHaveBeenCalled();
			expect(dayToWeekSpy).not.toHaveBeenCalled();
			expect(logger.warn).toHaveBeenCalledWith(
				'Stopping insights compaction because a per-run limit was reached',
				{
					reason: 'max-batches',
					stageName: 'raw-to-hour',
					batchesProcessed: 2,
					rowsCompacted: 4,
					compactionMaxBatchesPerRun: 2,
					compactionMaxRuntimeSeconds: 0,
				},
			);
		});

		test('stops after compactionMaxRuntimeSeconds', async () => {
			// ARRANGE
			jest.useFakeTimers();
			jest.setSystemTime(new Date(0));
			const { insightsCompactionService, logger } = createCompactionService({
				compactionMaxBatchesPerRun: 0,
				compactionMaxRuntimeSeconds: 1,
			});
			const rawToHourSpy = jest
				.spyOn(insightsCompactionService, 'compactRawToHour')
				.mockImplementation(async () => {
					jest.setSystemTime(new Date(1000));
					return 2;
				});
			const hourToDaySpy = jest
				.spyOn(insightsCompactionService, 'compactHourToDay')
				.mockResolvedValue(0);
			const dayToWeekSpy = jest
				.spyOn(insightsCompactionService, 'compactDayToWeek')
				.mockResolvedValue(0);

			// ACT
			await insightsCompactionService.compactInsights();

			// ASSERT
			expect(rawToHourSpy).toHaveBeenCalledTimes(1);
			expect(hourToDaySpy).not.toHaveBeenCalled();
			expect(dayToWeekSpy).not.toHaveBeenCalled();
			expect(logger.warn).toHaveBeenCalledWith(
				'Stopping insights compaction because a per-run limit was reached',
				{
					reason: 'max-runtime',
					stageName: 'raw-to-hour',
					batchesProcessed: 1,
					rowsCompacted: 2,
					compactionMaxBatchesPerRun: 0,
					compactionMaxRuntimeSeconds: 1,
				},
			);
		});

		test('does not continue to later stages after a limit is reached', async () => {
			// ARRANGE
			const { insightsCompactionService } = createCompactionService({
				compactionMaxBatchesPerRun: 1,
				compactionMaxRuntimeSeconds: 0,
			});
			const rawToHourSpy = jest
				.spyOn(insightsCompactionService, 'compactRawToHour')
				.mockResolvedValue(1);
			const hourToDaySpy = jest
				.spyOn(insightsCompactionService, 'compactHourToDay')
				.mockResolvedValue(0);
			const dayToWeekSpy = jest
				.spyOn(insightsCompactionService, 'compactDayToWeek')
				.mockResolvedValue(0);

			// ACT
			await insightsCompactionService.compactInsights();

			// ASSERT
			expect(rawToHourSpy).toHaveBeenCalledTimes(1);
			expect(hourToDaySpy).not.toHaveBeenCalled();
			expect(dayToWeekSpy).not.toHaveBeenCalled();
		});

		test('allows additional batches when compactionMaxBatchesPerRun is disabled', async () => {
			// ARRANGE
			const { insightsCompactionService, logger } = createCompactionService({
				compactionMaxBatchesPerRun: 0,
				compactionMaxRuntimeSeconds: 300,
			});
			const rawToHourSpy = jest
				.spyOn(insightsCompactionService, 'compactRawToHour')
				.mockResolvedValueOnce(2)
				.mockResolvedValueOnce(1);
			const hourToDaySpy = jest
				.spyOn(insightsCompactionService, 'compactHourToDay')
				.mockResolvedValue(0);
			const dayToWeekSpy = jest
				.spyOn(insightsCompactionService, 'compactDayToWeek')
				.mockResolvedValue(0);

			// ACT
			await insightsCompactionService.compactInsights();

			// ASSERT
			expect(rawToHourSpy).toHaveBeenCalledTimes(2);
			expect(hourToDaySpy).toHaveBeenCalledTimes(1);
			expect(dayToWeekSpy).toHaveBeenCalledTimes(1);
			expect(logger.warn).not.toHaveBeenCalled();
		});

		test('allows additional runtime when compactionMaxRuntimeSeconds is disabled', async () => {
			// ARRANGE
			jest.useFakeTimers();
			jest.setSystemTime(new Date(0));
			const { insightsCompactionService, logger } = createCompactionService({
				compactionMaxBatchesPerRun: 0,
				compactionMaxRuntimeSeconds: 0,
			});
			const rawToHourSpy = jest
				.spyOn(insightsCompactionService, 'compactRawToHour')
				.mockImplementationOnce(async () => {
					jest.setSystemTime(new Date(60_000));
					return 2;
				})
				.mockResolvedValueOnce(1);
			const hourToDaySpy = jest
				.spyOn(insightsCompactionService, 'compactHourToDay')
				.mockResolvedValue(0);
			const dayToWeekSpy = jest
				.spyOn(insightsCompactionService, 'compactDayToWeek')
				.mockResolvedValue(0);

			// ACT
			await insightsCompactionService.compactInsights();

			// ASSERT
			expect(rawToHourSpy).toHaveBeenCalledTimes(2);
			expect(hourToDaySpy).toHaveBeenCalledTimes(1);
			expect(dayToWeekSpy).toHaveBeenCalledTimes(1);
			expect(logger.warn).not.toHaveBeenCalled();
		});

		test('preserves existing stage behavior when limits are not reached', async () => {
			// ARRANGE
			const { insightsCompactionService, logger } = createCompactionService({
				compactionMaxBatchesPerRun: 10,
				compactionMaxRuntimeSeconds: 300,
			});
			const rawToHourSpy = jest
				.spyOn(insightsCompactionService, 'compactRawToHour')
				.mockResolvedValueOnce(2)
				.mockResolvedValueOnce(1);
			const hourToDaySpy = jest
				.spyOn(insightsCompactionService, 'compactHourToDay')
				.mockResolvedValueOnce(2)
				.mockResolvedValueOnce(1);
			const dayToWeekSpy = jest
				.spyOn(insightsCompactionService, 'compactDayToWeek')
				.mockResolvedValue(0);

			// ACT
			await insightsCompactionService.compactInsights();

			// ASSERT
			expect(rawToHourSpy).toHaveBeenCalledTimes(2);
			expect(hourToDaySpy).toHaveBeenCalledTimes(2);
			expect(dayToWeekSpy).toHaveBeenCalledTimes(1);
			expect(logger.warn).not.toHaveBeenCalled();
		});
	});

	describe('compactInsights batch delay', () => {
		const createCompactionService = (config: Partial<InsightsConfig> = {}) =>
			new InsightsCompactionService(
				mock<InsightsByPeriodRepository>(),
				mock<InsightsRawRepository>(),
				mock<InsightsConfig>({
					compactionBatchSize: 2,
					compactionBatchDelayMilliseconds: 100,
					compactionMaxBatchesPerRun: 1000,
					compactionMaxRuntimeSeconds: 300,
					...config,
				}),
				mockLogger(),
			);

		beforeEach(() => {
			jest.useFakeTimers();
		});

		afterEach(() => {
			jest.useRealTimers();
			jest.restoreAllMocks();
		});

		test('waits before processing the next batch after a full batch', async () => {
			// ARRANGE
			const delayMilliseconds = 100;
			const insightsCompactionService = createCompactionService({
				compactionBatchDelayMilliseconds: delayMilliseconds,
			});
			const rawToHourSpy = jest
				.spyOn(insightsCompactionService, 'compactRawToHour')
				.mockResolvedValueOnce(2)
				.mockResolvedValueOnce(1);
			jest.spyOn(insightsCompactionService, 'compactHourToDay').mockResolvedValue(0);
			jest.spyOn(insightsCompactionService, 'compactDayToWeek').mockResolvedValue(0);

			// ACT
			const compactInsightsPromise = insightsCompactionService.compactInsights();
			await Promise.resolve();

			// ASSERT
			expect(rawToHourSpy).toHaveBeenCalledTimes(1);
			expect(jest.getTimerCount()).toBe(1);

			await jest.advanceTimersByTimeAsync(delayMilliseconds - 1);
			expect(rawToHourSpy).toHaveBeenCalledTimes(1);

			await jest.advanceTimersByTimeAsync(1);
			await compactInsightsPromise;

			expect(rawToHourSpy).toHaveBeenCalledTimes(2);
		});

		test('does not wait after a partial batch', async () => {
			// ARRANGE
			const insightsCompactionService = createCompactionService();
			const rawToHourSpy = jest
				.spyOn(insightsCompactionService, 'compactRawToHour')
				.mockResolvedValue(1);
			jest.spyOn(insightsCompactionService, 'compactHourToDay').mockResolvedValue(0);
			jest.spyOn(insightsCompactionService, 'compactDayToWeek').mockResolvedValue(0);

			// ACT
			const compactInsightsPromise = insightsCompactionService.compactInsights();
			await Promise.resolve();

			// ASSERT
			expect(jest.getTimerCount()).toBe(0);
			await compactInsightsPromise;
			expect(rawToHourSpy).toHaveBeenCalledTimes(1);
		});

		test('skips the wait when the configured delay is zero', async () => {
			// ARRANGE
			const insightsCompactionService = createCompactionService({
				compactionBatchDelayMilliseconds: 0,
			});
			const rawToHourSpy = jest
				.spyOn(insightsCompactionService, 'compactRawToHour')
				.mockResolvedValueOnce(2)
				.mockResolvedValueOnce(1);
			jest.spyOn(insightsCompactionService, 'compactHourToDay').mockResolvedValue(0);
			jest.spyOn(insightsCompactionService, 'compactDayToWeek').mockResolvedValue(0);

			// ACT
			const compactInsightsPromise = insightsCompactionService.compactInsights();
			await Promise.resolve();

			// ASSERT
			expect(jest.getTimerCount()).toBe(0);
			await compactInsightsPromise;
			expect(rawToHourSpy).toHaveBeenCalledTimes(2);
		});
	});

	describe('compactHourToDay', () => {
		type TestData = {
			name: string;
			periodStarts: DateTime[];
			batches: number[];
		};

		test.each<TestData>([
			{
				name: 'compact into 2 rows',
				periodStarts: [
					DateTime.utc(2000, 1, 1, 0, 0),
					DateTime.utc(2000, 1, 1, 23, 59),
					DateTime.utc(2000, 1, 2, 1, 0),
				],
				batches: [2, 1],
			},
			{
				name: 'compact into 3 rows',
				periodStarts: [
					DateTime.utc(2000, 1, 1, 0, 0),
					DateTime.utc(2000, 1, 1, 23, 59),
					DateTime.utc(2000, 1, 2, 0, 0),
					DateTime.utc(2000, 1, 2, 23, 59),
					DateTime.utc(2000, 1, 3, 23, 59),
				],
				batches: [2, 2, 1],
			},
		])('$name', async ({ periodStarts, batches }) => {
			// ARRANGE
			const insightsCompactionService = Container.get(InsightsCompactionService);
			const insightsByPeriodRepository = Container.get(InsightsByPeriodRepository);

			const project = await createTeamProject();
			const workflow = await createWorkflow({}, project);
			// create before so we can create the raw events in parallel
			await createMetadata(workflow);
			for (const periodStart of periodStarts) {
				await createCompactedInsightsEvent(workflow, {
					type: 'success',
					value: 1,
					periodUnit: 'hour',
					periodStart,
				});
			}

			// ACT
			const compactedRows = await insightsCompactionService.compactHourToDay();

			// ASSERT
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
			// ARRANGE
			const insightsCompactionService = Container.get(InsightsCompactionService);

			const project = await createTeamProject();
			const workflow = await createWorkflow({}, project);
			// create before so we can create the raw events in parallel
			await createMetadata(workflow);
			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: 1,
				periodUnit: 'hour',
				periodStart: DateTime.utc().minus({ day: 79 }).startOf('hour'),
			});

			// ACT
			const compactedRows = await insightsCompactionService.compactHourToDay();

			// ASSERT
			expect(compactedRows).toBe(0);
		});
	});

	describe('compactDayToWeek', () => {
		type TestData = {
			name: string;
			periodStarts: DateTime[];
			batches: number[];
		};

		test.each<TestData>([
			{
				name: 'compact into 2 rows',
				periodStarts: [
					// 2000-01-03 is a Monday
					DateTime.utc(2000, 1, 3, 0, 0),
					DateTime.utc(2000, 1, 5, 23, 59),
					DateTime.utc(2000, 1, 10, 1, 0),
				],
				batches: [2, 1],
			},
			{
				name: 'compact into 3 rows',
				periodStarts: [
					// 2000-01-03 is a Monday
					DateTime.utc(2000, 1, 3, 0, 0),
					DateTime.utc(2000, 1, 4, 23, 59),
					DateTime.utc(2000, 1, 10, 0, 0),
					DateTime.utc(2000, 1, 11, 23, 59),
					DateTime.utc(2000, 1, 17, 23, 59),
				],
				batches: [2, 2, 1],
			},
		])('$name', async ({ periodStarts, batches }) => {
			// ARRANGE
			const insightsCompactionService = Container.get(InsightsCompactionService);
			const insightsByPeriodRepository = Container.get(InsightsByPeriodRepository);

			const project = await createTeamProject();
			const workflow = await createWorkflow({}, project);

			await createMetadata(workflow);
			for (const periodStart of periodStarts) {
				await createCompactedInsightsEvent(workflow, {
					type: 'success',
					value: 1,
					periodUnit: 'day',
					periodStart,
				});
			}

			// ACT
			const compactedRows = await insightsCompactionService.compactDayToWeek();

			// ASSERT
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
			// ARRANGE
			const insightsCompactionService = Container.get(InsightsCompactionService);

			const project = await createTeamProject();
			const workflow = await createWorkflow({}, project);
			await createMetadata(workflow);
			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: 1,
				periodUnit: 'day',
				periodStart: DateTime.utc().minus({ day: 179 }).startOf('day'),
			});

			// ACT
			const compactedRows = await insightsCompactionService.compactDayToWeek();

			// ASSERT
			expect(compactedRows).toBe(0);
		});
	});

	describe('compaction threshold configuration', () => {
		test('insights by period older than the hourly to daily threshold are not compacted', async () => {
			// ARRANGE
			const insightsCompactionService = Container.get(InsightsCompactionService);
			const insightsByPeriodRepository = Container.get(InsightsByPeriodRepository);
			const config = Container.get(InsightsConfig);

			const project = await createTeamProject();
			const workflow = await createWorkflow({}, project);

			const thresholdDays = config.compactionHourlyToDailyThresholdDays;

			// Create insights by period within and beyond the threshold
			const withinThresholdTimestamp = DateTime.utc().minus({ days: thresholdDays - 1 });
			const beyondThresholdTimestamp = DateTime.utc().minus({ days: thresholdDays + 1 });

			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: 1,
				periodUnit: 'hour',
				periodStart: withinThresholdTimestamp,
			});

			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: 1,
				periodUnit: 'hour',
				periodStart: beyondThresholdTimestamp,
			});

			// ACT
			const compactedRows = await insightsCompactionService.compactHourToDay();

			// ASSERT
			expect(compactedRows).toBe(1); // Only the event within the threshold should be compacted
			const insightsByPeriods = await insightsByPeriodRepository.find();
			const dailyInsights = insightsByPeriods.filter((insight) => insight.periodUnit === 'day');
			expect(dailyInsights).toHaveLength(1); // The event beyond the threshold should remain
			expect(dailyInsights[0].periodStart.toISOString()).toEqual(
				beyondThresholdTimestamp.startOf('day').toISO(),
			);
		});

		test('insights by period older than the daily to weekly threshold are not compacted', async () => {
			// ARRANGE
			const insightsCompactionService = Container.get(InsightsCompactionService);
			const insightsByPeriodRepository = Container.get(InsightsByPeriodRepository);
			const config = Container.get(InsightsConfig);

			const project = await createTeamProject();
			const workflow = await createWorkflow({}, project);

			const thresholdDays = config.compactionDailyToWeeklyThresholdDays;

			// Create insights by period within and beyond the threshold
			const withinThresholdTimestamp = DateTime.utc().minus({ days: thresholdDays - 1 });
			const beyondThresholdTimestamp = DateTime.utc().minus({ days: thresholdDays + 1 });

			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: 1,
				periodUnit: 'day',
				periodStart: withinThresholdTimestamp,
			});
			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: 1,
				periodUnit: 'day',
				periodStart: beyondThresholdTimestamp,
			});

			// ACT
			const compactedRows = await insightsCompactionService.compactDayToWeek();

			// ASSERT
			expect(compactedRows).toBe(1); // Only the event within the threshold should be compacted
			const insightsByPeriods = await insightsByPeriodRepository.find();
			const weeklyInsights = insightsByPeriods.filter((insight) => insight.periodUnit === 'week');
			expect(weeklyInsights).toHaveLength(1); // The event beyond the threshold should remain
			expect(weeklyInsights[0].periodStart.toISOString()).toEqual(
				beyondThresholdTimestamp.startOf('week').toISO(),
			);
		});
	});
});

import { createTeamProject, createWorkflow, testDb, testModules } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { DateTime } from 'luxon';

import { InsightsConfig } from '@/modules/insights/insights.config';

import { createCompactedInsightsEvent, createMetadata } from '../../entities/__tests__/db-utils';
import { InsightsByPeriodRepository } from '../insights-by-period.repository';

const isPostgres = Container.get(GlobalConfig).database.type === 'postgresdb';

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
					addCommonTableExpression: vi.fn().mockReturnThis(),
					select: vi.fn().mockReturnThis(),
					innerJoin: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					andWhere: vi.fn().mockReturnThis(),
					groupBy: vi.fn().mockReturnThis(),
					orderBy: vi.fn().mockReturnThis(),
					getRawMany: vi.fn().mockResolvedValue(mockResult),
				};

				vi.spyOn(insightsByPeriodRepository.manager, 'createQueryBuilder').mockReturnValueOnce(
					queryBuilderMock as any,
				);

				const result = await insightsByPeriodRepository.getInsightsByTime({
					startDate: new Date('2023-10-01T00:00:00Z'),
					endDate: new Date('2023-10-02T00:00:00Z'),
					periodUnit: 'day',
					insightTypes: ['success', 'failure', 'time_saved_min'],
				});

				// ASSERT
				expect(result[0]?.periodStart).not.toBeNull();
				expect(new Date(result[0]?.periodStart).toString()).not.toBe('Invalid Date');
			},
		);
	});

	describe('getInsightsByTime timezone-aware bucketing (LIGO-808)', () => {
		test('groups a caller-local day into a single bucket instead of splitting it across the UTC day boundary', async () => {
			// ARRANGE
			const insightsByPeriodRepository = Container.get(InsightsByPeriodRepository);
			const project = await createTeamProject();
			const workflow = await createWorkflow({ nodes: [] }, project);
			await createMetadata(workflow);

			// Far enough in the past to land unambiguously in the "past range" branch of the date
			// range CTE, and within Berlin summer time (UTC+2) so local midnight is 22:00 UTC the
			// previous day - the case that previously produced an extra prior-day chart bar.
			const localDayStart = DateTime.now()
				.setZone('Europe/Berlin')
				.minus({ days: 400 })
				.startOf('day');
			const localDayEnd = localDayStart.endOf('day');

			// Hourly-compacted rows spread across the Berlin-local day, straddling the UTC day
			// boundary: the first row is UTC-previous-day, the rest are UTC-same-day.
			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: 1,
				periodUnit: 'hour',
				periodStart: localDayStart.plus({ hours: 1 }),
			});
			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: 1,
				periodUnit: 'hour',
				periodStart: localDayStart.plus({ hours: 12 }),
			});
			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: 1,
				periodUnit: 'hour',
				periodStart: localDayStart.plus({ hours: 23 }),
			});

			// ACT
			const result = await insightsByPeriodRepository.getInsightsByTime({
				periodUnit: 'day',
				insightTypes: ['success'],
				startDate: localDayStart.toJSDate(),
				endDate: localDayEnd.toJSDate(),
				timeZone: 'Europe/Berlin',
			});

			// ASSERT
			expect(result).toHaveLength(1);
			expect(result[0]?.succeeded).toBe(3);
			expect(DateTime.fromISO(result[0].periodStart).toUTC().toISO()).toBe(
				localDayStart.toUTC().toISO(),
			);
		});

		test('keeps UTC-day bucketing when no timeZone is passed', async () => {
			// ARRANGE
			const insightsByPeriodRepository = Container.get(InsightsByPeriodRepository);
			const project = await createTeamProject();
			const workflow = await createWorkflow({ nodes: [] }, project);
			await createMetadata(workflow);

			const utcDayStart = DateTime.utc().minus({ days: 420 }).startOf('day');

			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: 1,
				periodUnit: 'hour',
				periodStart: utcDayStart.plus({ hours: 1 }),
			});
			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: 1,
				periodUnit: 'hour',
				periodStart: utcDayStart.plus({ hours: 23 }),
			});

			// ACT
			const result = await insightsByPeriodRepository.getInsightsByTime({
				periodUnit: 'day',
				insightTypes: ['success'],
				startDate: utcDayStart.toJSDate(),
				endDate: utcDayStart.endOf('day').toJSDate(),
			});

			// ASSERT
			expect(result).toHaveLength(1);
			expect(result[0]?.succeeded).toBe(2);
			expect(DateTime.fromISO(result[0].periodStart).toUTC().toISO()).toBe(
				utcDayStart.toUTC().toISO(),
			);
		});

		// Postgres ships the IANA timezone database, so it can truncate each row using the offset
		// that actually applied on that row's date. SQLite has no such database and falls back to a
		// single offset anchored on the range start, so this DST-straddle exactness is Postgres-only.
		test.runIf(isPostgres)(
			'buckets a caller-local day into a single bucket when the range crosses a DST transition',
			async () => {
				// ARRANGE
				const insightsByPeriodRepository = Container.get(InsightsByPeriodRepository);
				const project = await createTeamProject();
				const workflow = await createWorkflow({ nodes: [] }, project);
				await createMetadata(workflow);

				// Europe/Berlin ended summer time on 2023-10-29 (CEST/UTC+2 -> CET/UTC+1). A range
				// starting before and ending after the transition spans two different offsets. The
				// three rows below all fall on the same local day 2023-10-30 (CET), whose local
				// midnight is 2023-10-29 23:00 UTC. The first and last sit either side of the
				// +120min boundary the range start would imply, so an anchored-offset bucketing
				// wrongly splits this single local day into two chart bars.
				const startDate = DateTime.fromISO('2023-10-25T00:00:00', { zone: 'Europe/Berlin' });
				const endDate = DateTime.fromISO('2023-10-31T23:59:59', { zone: 'Europe/Berlin' });
				const localDay = DateTime.fromISO('2023-10-30T00:00:00', { zone: 'Europe/Berlin' });

				for (const localMinutes of [30, 12 * 60, 23 * 60 + 30]) {
					await createCompactedInsightsEvent(workflow, {
						type: 'success',
						value: 1,
						periodUnit: 'hour',
						periodStart: localDay.plus({ minutes: localMinutes }),
					});
				}

				// ACT
				const result = await insightsByPeriodRepository.getInsightsByTime({
					periodUnit: 'day',
					insightTypes: ['success'],
					startDate: startDate.toJSDate(),
					endDate: endDate.toJSDate(),
					timeZone: 'Europe/Berlin',
				});

				// ASSERT
				expect(result).toHaveLength(1);
				expect(result[0]?.succeeded).toBe(3);
				expect(DateTime.fromISO(result[0].periodStart).toUTC().toISO()).toBe(
					localDay.toUTC().toISO(),
				);
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
			const transactionSpy = vi.spyOn(insightsByPeriodRepository.manager, 'transaction');
			const project = await createTeamProject();
			const workflow = await createWorkflow({ nodes: [] }, project);
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

import { GlobalConfig } from '@n8n/config';
import {
	createTeamProject,
	createWorkflow,
	linkUserToProject,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import type { Project, User, WorkflowEntity } from '@n8n/db';
import { Container } from '@n8n/di';
import { DateTime } from 'luxon';

import { InsightsConfig } from '@/modules/insights/insights.config';
import { createMember } from '@test-integration/db/users';

import { createCompactedInsightsEvent, createMetadata } from '../../entities/__tests__/db-utils';
import type { InsightsByPeriod } from '../../entities/insights-by-period';
import { TypeToNumber } from '../../entities/insights-shared';
import type { InsightsAccessFilter } from '../insights-by-period.repository';
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

	describe('getTrailingHourlyRows', () => {
		// Regression coverage for a real bug: getRawMany() returns driver-native
		// values, not entity-mapped ones. On SQLite (n8n's default DB), a
		// datetime column comes back as a plain string, not a `Date` instance,
		// even though the method's return type promises `Date`. A caller doing
		// `DateTime.fromJSDate(row.periodStart)` on that string produces an
		// Invalid DateTime silently (no exception), which is exactly what
		// happened in ProjectExecutionQuotaService.getSpikes before this fix.
		//
		// These tests intentionally write data within the last 7 days (the
		// spike-guard's own trailing window), unlike the rest of this file
		// which anchors fixture data hundreds of days in the past specifically
		// to stay out of that window. Truncate afterwards so the "access
		// filter" describe block below (which aggregates over an unfiltered
		// `now - 7 days` to `now` range) doesn't pick up this data too.
		afterAll(async () => {
			await testDb.truncate(['InsightsByPeriod', 'InsightsMetadata', 'WorkflowEntity', 'Project']);
		});

		test('returns periodStart as a genuine Date and value as a number', async () => {
			// ARRANGE
			const insightsByPeriodRepository = Container.get(InsightsByPeriodRepository);
			const project = await createTeamProject();
			const workflow = await createWorkflow({ nodes: [] }, project);
			await createMetadata(workflow);

			const periodStart = DateTime.utc().minus({ days: 2 }).startOf('hour');
			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: 5,
				periodUnit: 'hour',
				periodStart,
			});

			// ACT
			const since = DateTime.utc().minus({ days: 7 }).startOf('day').toJSDate();
			const rows = await insightsByPeriodRepository.getTrailingHourlyRows(workflow.id, since);

			// ASSERT
			expect(rows).toHaveLength(1);
			expect(rows[0].periodStart).toBeInstanceOf(Date);
			expect(DateTime.fromJSDate(rows[0].periodStart).isValid).toBe(true);
			expect(DateTime.fromJSDate(rows[0].periodStart).toUTC().toISO()).toBe(
				periodStart.toUTC().toISO(),
			);
			expect(rows[0].value).toBe(5);
			expect(typeof rows[0].value).toBe('number');
		});

		test('sums success and failure rows but excludes other types, other workflows, and rows before `since`', async () => {
			// ARRANGE
			const insightsByPeriodRepository = Container.get(InsightsByPeriodRepository);
			const project = await createTeamProject();
			const workflow = await createWorkflow({ nodes: [] }, project);
			const otherWorkflow = await createWorkflow({ nodes: [] }, project);
			await createMetadata(workflow);
			await createMetadata(otherWorkflow);

			const recentHour = DateTime.utc().minus({ hours: 3 }).startOf('hour');
			const tooOldHour = DateTime.utc().minus({ days: 30 }).startOf('hour');

			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: 2,
				periodUnit: 'hour',
				periodStart: recentHour,
			});
			await createCompactedInsightsEvent(workflow, {
				type: 'failure',
				value: 1,
				periodUnit: 'hour',
				periodStart: recentHour,
			});
			// Excluded: not success/failure
			await createCompactedInsightsEvent(workflow, {
				type: 'time_saved_min',
				value: 100,
				periodUnit: 'hour',
				periodStart: recentHour,
			});
			// Excluded: different workflow
			await createCompactedInsightsEvent(otherWorkflow, {
				type: 'success',
				value: 99,
				periodUnit: 'hour',
				periodStart: recentHour,
			});
			// Excluded: before `since`
			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: 50,
				periodUnit: 'hour',
				periodStart: tooOldHour,
			});

			// ACT
			const since = DateTime.utc().minus({ days: 7 }).startOf('day').toJSDate();
			const rows = await insightsByPeriodRepository.getTrailingHourlyRows(workflow.id, since);

			// ASSERT
			expect(rows).toHaveLength(2);
			const total = rows.reduce((sum, row) => sum + row.value, 0);
			expect(total).toBe(3);
			for (const row of rows) {
				expect(row.periodStart).toBeInstanceOf(Date);
			}
		});
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

	describe('access filter', () => {
		let member: User;
		let accessibleProject: Project;
		let accessibleWorkflow: WorkflowEntity;
		let accessibleInsight: InsightsByPeriod;
		let inaccessibleProject: Project;
		let inaccessibleWorkflow: WorkflowEntity;
		let inaccessibleInsight: InsightsByPeriod;
		let accessFilter: InsightsAccessFilter;
		let startDate: Date;
		let endDate: Date;

		beforeAll(async () => {
			member = await createMember();

			accessibleProject = await createTeamProject();
			await linkUserToProject(member, accessibleProject, 'project:viewer');
			accessibleWorkflow = await createWorkflow({}, accessibleProject);

			inaccessibleProject = await createTeamProject();
			inaccessibleWorkflow = await createWorkflow({}, inaccessibleProject);

			const now = DateTime.utc();
			startDate = now.minus({ days: 7 }).toJSDate();
			endDate = now.toJSDate();

			[accessibleInsight, inaccessibleInsight] = await Promise.all([
				createCompactedInsightsEvent(accessibleWorkflow, {
					type: 'success',
					value: 4,
					periodUnit: 'day',
					periodStart: now.minus({ days: 1 }),
				}),
				createCompactedInsightsEvent(inaccessibleWorkflow, {
					type: 'success',
					value: 10,
					periodUnit: 'day',
					periodStart: now.minus({ days: 1 }),
				}),
			]);

			accessFilter = {
				user: member,
				projectRoles: ['project:viewer'],
				workflowRoles: ['workflow:owner'],
			};
		});

		describe('getPreviousAndCurrentPeriodTypeAggregates', () => {
			test('should aggregate both workflows when no access filter is applied', async () => {
				const insightsByPeriodRepository = Container.get(InsightsByPeriodRepository);

				const rows = await insightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates({
					startDate,
					endDate,
				});

				const currentSuccessTotal = rows.find(
					(row) => row.period === 'current' && row.type === TypeToNumber.success,
				)?.total_value;

				expect(Number(currentSuccessTotal)).toBe(
					accessibleInsight.value + inaccessibleInsight.value,
				);
			});

			test('should exclude workflows outside the access filter', async () => {
				const insightsByPeriodRepository = Container.get(InsightsByPeriodRepository);

				const rows = await insightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates({
					startDate,
					endDate,
					accessFilter,
				});

				const currentSuccessTotal = rows.find(
					(row) => row.period === 'current' && row.type === TypeToNumber.success,
				)?.total_value;

				expect(Number(currentSuccessTotal)).toBe(accessibleInsight.value);
			});
		});

		describe('getInsightsByWorkflow', () => {
			test('should return both workflows when no access filter is applied', async () => {
				const insightsByPeriodRepository = Container.get(InsightsByPeriodRepository);

				const { count, rows } = await insightsByPeriodRepository.getInsightsByWorkflow({
					startDate,
					endDate,
				});

				expect(count).toBe(2);
				expect(rows.map((row) => row.workflowId).sort()).toEqual(
					[accessibleWorkflow.id, inaccessibleWorkflow.id].sort(),
				);
			});

			test('should exclude workflows outside the access filter', async () => {
				const insightsByPeriodRepository = Container.get(InsightsByPeriodRepository);

				const { count, rows } = await insightsByPeriodRepository.getInsightsByWorkflow({
					startDate,
					endDate,
					accessFilter,
				});

				expect(count).toBe(1);
				expect(rows).toHaveLength(1);
				expect(rows[0].workflowId).toBe(accessibleWorkflow.id);
				expect(rows[0].succeeded).toBe(accessibleInsight.value);
			});
		});

		describe('getInsightsByTime', () => {
			test('should aggregate both workflows when no access filter is applied', async () => {
				const insightsByPeriodRepository = Container.get(InsightsByPeriodRepository);

				const rows = await insightsByPeriodRepository.getInsightsByTime({
					startDate,
					endDate,
					periodUnit: 'day',
					insightTypes: ['success'],
				});

				const totalSucceeded = rows.reduce((sum, row) => sum + (row.succeeded ?? 0), 0);

				expect(totalSucceeded).toBe(accessibleInsight.value + inaccessibleInsight.value);
			});

			test('should exclude workflows outside the access filter', async () => {
				const insightsByPeriodRepository = Container.get(InsightsByPeriodRepository);

				const rows = await insightsByPeriodRepository.getInsightsByTime({
					startDate,
					endDate,
					periodUnit: 'day',
					insightTypes: ['success'],
					accessFilter,
				});

				const totalSucceeded = rows.reduce((sum, row) => sum + (row.succeeded ?? 0), 0);

				expect(totalSucceeded).toBe(accessibleInsight.value);
			});
		});
	});
});

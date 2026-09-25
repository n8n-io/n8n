import { createFakeOutboundHttp, type Route } from '@n8n/backend-network/testing';
import {
	createTeamProject,
	createWorkflow,
	mockLogger,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import { Time } from '@n8n/constants';
import { LicenseMetricsRepository, SettingsRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { DateTime } from 'luxon';
import { InstanceSettings } from 'n8n-core';
import type { MockInstance } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { EventService } from '@/events/event.service';
import type { License } from '@/license';
import { createCompactedInsightsEvent } from '@/modules/insights/database/entities/__tests__/db-utils';
import { InsightsService } from '@/modules/insights/insights.service';

import type { InstanceReportDataPoint } from '../database/entities/instance-monitoring-report';
import { InstanceMonitoringReportRepository } from '../database/repositories/instance-monitoring-report.repository';
import { InstanceReportingScheduler } from '../instance-reporting-scheduler.service';
import { InstanceReportingSettingsService } from '../instance-reporting-settings.service';
import { InstanceReportingConfig } from '../instance-reporting.config';
import {
	CENTRAL_INSTANCE_MONITORING_SETTINGS_KEY,
	INSTANCE_REPORTS_PATH,
} from '../instance-reporting.constants';
import { InstanceReportingService } from '../instance-reporting.service';

const RECEIVER_URL = 'https://receiver.test';

const REPORT_TIME = '07:42';

/** One minute after the slot, so the first pass reports at once. */
const AFTER_SLOT = '2026-03-26T07:43:00.000Z';

const NEXT_SLOT = '2026-03-27T07:42:00.000Z';

// The retry contract, spelled out rather than imported, so a change to either
// constant in the service fails here instead of moving the test along with it.
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 5 * Time.minutes.toMilliseconds;

/** Room for the fake clock's drift while `vi.waitFor` polls. */
const CLOCK_TOLERANCE_MS = 10 * Time.seconds.toMilliseconds;

interface ReportPayload {
	batchId: string;
	dataPoints: InstanceReportDataPoint[];
}

const unreachable = (): Route => ({
	method: 'POST',
	pathname: INSTANCE_REPORTS_PATH,
	networkError: 'ECONNREFUSED',
});

const accepted = (): Route => ({ method: 'POST', pathname: INSTANCE_REPORTS_PATH, status: 201 });

const tooLarge = (): Route => ({ method: 'POST', pathname: INSTANCE_REPORTS_PATH, status: 413 });

/** The private arming hook, spied on so a test can tell when a pass has finished. */
type SchedulerInternals = { scheduleNext(delayMs: number): void };

interface Harness {
	scheduler: InstanceReportingScheduler;
	/** Every resolved request the fake receiver saw. */
	httpRequest: ReturnType<typeof createFakeOutboundHttp>['httpRequest'];
	/**
	 * Called once a pass has finished its last database write, so its call count
	 * marks "pass over, next timer armed". Pending fake timers cannot serve as
	 * that signal: the SQLite pool arms a transient timeout for every query.
	 */
	scheduleNext: MockInstance<SchedulerInternals['scheduleNext']>;
}

describe('instance reporting retries', () => {
	let repository: InstanceMonitoringReportRepository;
	let schedulers: InstanceReportingScheduler[] = [];

	beforeAll(async () => {
		await testModules.loadModules(['insights', 'instance-reporting']);
		await testDb.init();

		repository = Container.get(InstanceMonitoringReportRepository);
		Container.get(InstanceReportingConfig).instanceReportingBaseUrl = RECEIVER_URL;

		const instanceSettings = Container.get(InstanceSettings);
		expect(instanceSettings.instanceType).toBe('main');
		instanceSettings.markAsLeader();
	});

	beforeEach(async () => {
		await testDb.truncate([
			'InstanceMonitoringReport',
			'Settings',
			'InsightsByPeriod',
			'InsightsMetadata',
			'WorkflowEntity',
			'Project',
		]);
		await Container.get(SettingsRepository).upsertByKey(
			CENTRAL_INSTANCE_MONITORING_SETTINGS_KEY,
			JSON.stringify({ reportTime: REPORT_TIME }),
			false,
			{},
		);

		// Only what the scheduler uses. `setImmediate` and `nextTick` stay real so
		// the database driver's I/O still completes under the fake clock.
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
		vi.setSystemTime(new Date(AFTER_SLOT));
	});

	afterEach(() => {
		for (const scheduler of schedulers) scheduler.shutdown();
		schedulers = [];
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	function makeHarness(routes: Route[]): Harness {
		const { outboundHttp, httpRequest } = createFakeOutboundHttp(
			routes,
			vi.fn as unknown as Parameters<typeof createFakeOutboundHttp>[1],
		);
		const instanceSettings = Container.get(InstanceSettings);
		const eventService = Container.get(EventService);

		const service = new InstanceReportingService(
			Container.get(InstanceReportingConfig),
			repository,
			Container.get(InsightsService),
			instanceSettings,
			Container.get(LicenseMetricsRepository),
			mock<License>({ loadCertStr: async () => 'license-cert' }),
			mockLogger(),
			eventService,
			outboundHttp,
		);
		const scheduler = new InstanceReportingScheduler(
			service,
			repository,
			Container.get(InstanceReportingSettingsService),
			instanceSettings,
			eventService,
			mockLogger(),
		);
		schedulers.push(scheduler);

		const scheduleNext = vi.spyOn(scheduler as unknown as SchedulerInternals, 'scheduleNext');

		return { scheduler, httpRequest, scheduleNext };
	}

	/** Wait until the scheduler has completed `passes` passes and armed the next one. */
	async function armed({ scheduleNext }: Harness, passes: number) {
		await vi.waitFor(() => expect(scheduleNext).toHaveBeenCalledTimes(passes), {
			timeout: 5_000,
		});
	}

	/** Assert the delay the scheduler last armed lands on `slot`. */
	function expectArmedFor({ scheduleNext }: Harness, slot: string) {
		const delay = scheduleNext.mock.lastCall?.[0] ?? Number.NaN;
		const target = new Date(slot).getTime();
		expect(Date.now() + delay).toBeGreaterThanOrEqual(target - CLOCK_TOLERANCE_MS);
		expect(Date.now() + delay).toBeLessThanOrEqual(target + CLOCK_TOLERANCE_MS);
	}

	function sentPayload({ httpRequest }: Harness, index: number): ReportPayload {
		return httpRequest.mock.calls[index][0].body as unknown as ReportPayload;
	}

	function dailyPoints(payload: ReportPayload) {
		return payload.dataPoints.flatMap((point) =>
			point.kind === 'daily' ? [{ date: point.date, value: point.value }] : [],
		);
	}

	/**
	 * The database stamps `createdAt` with the real clock, not the fake one, so
	 * a row from a fake "yesterday" reads as today's. Pin it to the day meant.
	 */
	async function stampCreatedAt(id: string, createdAt: Date) {
		await repository.update({ id }, { createdAt });
	}

	/** A delivered report that covers `day`, generated the morning after it. */
	async function seedDeliveredReport(day: string) {
		const report = await repository.createPending([
			{ kind: 'cumulative', name: 'billableExecutions', value: 0 },
			{ kind: 'daily', name: 'billableExecutions', value: 3, date: day },
		]);
		await repository.markDelivered(report.id, new Date());
		await stampCreatedAt(
			report.id,
			new Date(new Date(`${day}T07:43:00.000Z`).getTime() + Time.days.toMilliseconds),
		);
		return report;
	}

	async function seedDailyExecutions(totalsByDay: Record<string, number>) {
		await seedCompactedExecutions('day', totalsByDay);
	}

	/** Executions as insights holds them after compaction, keyed by period start. */
	async function seedCompactedExecutions(
		periodUnit: 'hour' | 'day' | 'week',
		totalsByPeriodStart: Record<string, number>,
	) {
		const workflow = await createWorkflow({}, await createTeamProject());
		for (const [periodStart, value] of Object.entries(totalsByPeriodStart)) {
			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value,
				periodUnit,
				periodStart: DateTime.fromISO(periodStart, { zone: 'utc' }),
			});
		}
	}

	async function seedPendingReport(
		day: string,
		{
			attempts,
			lastAttemptAt,
			createdAt,
		}: { attempts: number; lastAttemptAt: Date; createdAt: Date },
	) {
		const report = await repository.createPending([
			{ kind: 'cumulative', name: 'billableExecutions', value: 0 },
			{ kind: 'daily', name: 'billableExecutions', value: 5, date: day },
		]);
		await repository.update(
			{ id: report.id },
			{ attempts, lastError: 'ECONNREFUSED', lastAttemptAt },
		);
		await stampCreatedAt(report.id, createdAt);
		return report;
	}

	async function deliveredDailyDates(): Promise<string[]> {
		const delivered = await repository.find({ where: { status: 'delivered' } });
		return delivered.flatMap((report) =>
			report.dataPoints.flatMap((point) => (point.kind === 'daily' ? [point.date] : [])),
		);
	}

	async function setReportTime(reportTime: string) {
		await Container.get(SettingsRepository).upsertByKey(
			CENTRAL_INSTANCE_MONITORING_SETTINGS_KEY,
			JSON.stringify({ reportTime }),
			false,
			{},
		);
	}

	test('delivers on the third attempt once the receiver is reachable again', async () => {
		const harness = makeHarness([unreachable(), unreachable(), accepted()]);

		harness.scheduler.start();
		await armed(harness, 1);

		expect(harness.httpRequest).toHaveBeenCalledTimes(1);
		await expect(repository.count()).resolves.toBe(1);
		const [report] = await repository.find();
		expect(report).toMatchObject({ status: 'pending', attempts: 1 });
		expect(report.lastError).toEqual(expect.any(String));
		expect(report.lastAttemptAt).toEqual(expect.any(Date));
		expect(harness.scheduleNext).toHaveBeenLastCalledWith(RETRY_DELAY_MS);

		await vi.advanceTimersByTimeAsync(RETRY_DELAY_MS);
		await armed(harness, 2);

		expect(harness.httpRequest).toHaveBeenCalledTimes(2);
		await expect(repository.findOneByOrFail({ id: report.id })).resolves.toMatchObject({
			status: 'pending',
			attempts: 2,
		});
		expect(harness.scheduleNext).toHaveBeenLastCalledWith(RETRY_DELAY_MS);

		await vi.advanceTimersByTimeAsync(RETRY_DELAY_MS);
		await armed(harness, 3);

		expect(harness.httpRequest).toHaveBeenCalledTimes(3);
		await expect(repository.findOneByOrFail({ id: report.id })).resolves.toMatchObject({
			status: 'delivered',
			attempts: 3,
			deliveredAt: expect.any(Date),
			lastError: null,
		});

		// Every attempt resent the row as measured, under the same batchId.
		const payloads = [0, 1, 2].map((index) => sentPayload(harness, index));
		for (const payload of payloads) {
			expect(payload.batchId).toBe(report.id);
			expect(payload.dataPoints).toEqual(payloads[0].dataPoints);
		}

		// The day is settled, so the scheduler now waits for tomorrow's slot.
		expectArmedFor(harness, NEXT_SLOT);
		await vi.advanceTimersByTimeAsync(Time.hours.toMilliseconds);
		expect(harness.httpRequest).toHaveBeenCalledTimes(3);
		expect(harness.scheduleNext).toHaveBeenCalledTimes(3);
		await expect(repository.count()).resolves.toBe(1);
	});

	test('gives up after three failures and covers the day again in the next report', async () => {
		// A delivered report for the day before last, so the gap has a start.
		await seedDeliveredReport('2026-03-24');
		await seedDailyExecutions({ '2026-03-25': 5, '2026-03-26': 7 });

		const harness = makeHarness([unreachable(), unreachable(), unreachable(), accepted()]);

		harness.scheduler.start();
		await armed(harness, 1);
		await vi.advanceTimersByTimeAsync(RETRY_DELAY_MS);
		await armed(harness, 2);
		await vi.advanceTimersByTimeAsync(RETRY_DELAY_MS);
		await armed(harness, 3);

		expect(harness.httpRequest).toHaveBeenCalledTimes(MAX_ATTEMPTS);
		const [abandoned] = await repository.find({ where: { status: 'skipped_after_max_retries' } });
		expect(abandoned).toMatchObject({ attempts: MAX_ATTEMPTS });
		expect(dailyPoints(sentPayload(harness, 0))).toEqual([{ date: '2026-03-25', value: 5 }]);
		// Keep the abandoned row on the day it was made, or tomorrow reads as settled too.
		await stampCreatedAt(abandoned.id, new Date(AFTER_SLOT));

		// The next pass finds the day settled and moves on to tomorrow's slot.
		await vi.advanceTimersByTimeAsync(RETRY_DELAY_MS);
		await armed(harness, 4);
		expect(harness.httpRequest).toHaveBeenCalledTimes(MAX_ATTEMPTS);
		expectArmedFor(harness, NEXT_SLOT);

		await vi.advanceTimersByTimeAsync(new Date(NEXT_SLOT).getTime() - Date.now());
		await armed(harness, 5);

		expect(harness.httpRequest).toHaveBeenCalledTimes(MAX_ATTEMPTS + 1);
		const backfill = sentPayload(harness, MAX_ATTEMPTS);
		expect(backfill.batchId).not.toBe(abandoned.id);
		expect(dailyPoints(backfill)).toEqual([
			{ date: '2026-03-25', value: 5 },
			{ date: '2026-03-26', value: 7 },
		]);
		expect(backfill.dataPoints.filter((point) => point.kind === 'cumulative')).toHaveLength(1);

		await expect(repository.findOneByOrFail({ id: backfill.batchId })).resolves.toMatchObject({
			status: 'delivered',
			attempts: 1,
		});
		await expect(repository.findLastCoveredDay()).resolves.toBe('2026-03-26');
	});

	test('gives up on a rejected report after one attempt and covers the day again in the next report', async () => {
		await seedDeliveredReport('2026-03-24');
		await seedDailyExecutions({ '2026-03-25': 5, '2026-03-26': 7 });

		const harness = makeHarness([tooLarge(), accepted()]);

		harness.scheduler.start();
		await armed(harness, 1);

		expect(harness.httpRequest).toHaveBeenCalledTimes(1);
		const [rejected] = await repository.find({ where: { status: 'skipped_after_max_retries' } });
		expect(rejected).toMatchObject({ attempts: 1 });
		expectArmedFor(harness, NEXT_SLOT);
		// Keep the rejected row on the day it was made, or tomorrow reads as settled too.
		await stampCreatedAt(rejected.id, new Date(AFTER_SLOT));

		await vi.advanceTimersByTimeAsync(RETRY_DELAY_MS);
		expect(harness.httpRequest).toHaveBeenCalledTimes(1);

		await vi.advanceTimersByTimeAsync(new Date(NEXT_SLOT).getTime() - Date.now());
		await armed(harness, 2);

		expect(harness.httpRequest).toHaveBeenCalledTimes(2);
		const backfill = sentPayload(harness, 1);
		expect(backfill.batchId).not.toBe(rejected.id);
		expect(dailyPoints(backfill)).toEqual([
			{ date: '2026-03-25', value: 5 },
			{ date: '2026-03-26', value: 7 },
		]);
		await expect(repository.findLastCoveredDay()).resolves.toBe('2026-03-26');
	});

	test('carries a daily point for every day of a downtime gap in one report', async () => {
		await seedDeliveredReport('2026-03-22');
		// Nothing for 03-24: a day with no executions has no insights row at all.
		await seedDailyExecutions({ '2026-03-23': 4, '2026-03-25': 9 });

		const harness = makeHarness([accepted()]);
		harness.scheduler.start();
		await armed(harness, 1);

		expect(harness.httpRequest).toHaveBeenCalledTimes(1);
		const payload = sentPayload(harness, 0);
		expect(dailyPoints(payload)).toEqual([
			{ date: '2026-03-23', value: 4 },
			{ date: '2026-03-24', value: 0 },
			{ date: '2026-03-25', value: 9 },
		]);
		expect(payload.dataPoints.filter((point) => point.kind === 'cumulative')).toHaveLength(1);

		await expect(repository.findOneByOrFail({ id: payload.batchId })).resolves.toMatchObject({
			status: 'delivered',
			attempts: 1,
		});
		await expect(repository.findLastCoveredDay()).resolves.toBe('2026-03-25');
	});

	test('backfills a gap longer than 30 days and still reads every day on its own', async () => {
		await seedDeliveredReport('2026-01-01');
		await seedDailyExecutions({ '2026-02-24': 6, '2026-03-25': 8 });

		const harness = makeHarness([accepted()]);
		harness.scheduler.start();
		await armed(harness, 1);

		expect(harness.httpRequest).toHaveBeenCalledTimes(1);
		const points = dailyPoints(sentPayload(harness, 0));
		// Every day from 01-02 to 03-25. A delivered report proves insights was
		// collecting, so a day without data is a real 0.
		expect(points).toHaveLength(83);
		expect(points.at(0)).toEqual({ date: '2026-01-02', value: 0 });
		// Exact days, not weekly buckets, although the gap is longer than 30 days.
		expect(points.find((point) => point.date === '2026-02-24')).toEqual({
			date: '2026-02-24',
			value: 6,
		});
		expect(points.at(-1)).toEqual({ date: '2026-03-25', value: 8 });
		expect(points.filter((point) => point.value !== 0)).toHaveLength(2);
	});

	test('carries the exact insights history on the first report, but no day held in a weekly row', async () => {
		// Compaction folded the week of 01-19 up to Thursday into one weekly row,
		// and left Friday and Saturday as daily rows.
		await seedCompactedExecutions('week', { '2026-01-19': 700 });
		await seedCompactedExecutions('day', {
			'2026-01-23': 5,
			'2026-01-24': 6,
			'2026-01-26': 7,
			'2026-02-24': 8,
			'2026-02-25': 9,
		});
		await seedCompactedExecutions('hour', {
			'2026-03-10T08:00:00': 2,
			'2026-03-10T15:00:00': 3,
			'2026-03-25T23:00:00': 4,
		});

		const harness = makeHarness([accepted()]);
		harness.scheduler.start();
		await armed(harness, 1);

		const points = dailyPoints(sentPayload(harness, 0));
		// From the Monday after the weekly row to yesterday.
		expect(points).toHaveLength(59);
		expect(points.at(0)).toEqual({ date: '2026-01-26', value: 7 });
		expect(points.filter((point) => point.value !== 0)).toEqual([
			{ date: '2026-01-26', value: 7 },
			{ date: '2026-02-24', value: 8 },
			{ date: '2026-02-25', value: 9 },
			{ date: '2026-03-10', value: 5 },
			{ date: '2026-03-25', value: 4 },
		]);
	});

	test('carries every day since the first data once the receiver is reachable after skipped first reports', async () => {
		await seedDailyExecutions({
			'2026-03-20': 1,
			'2026-03-21': 2,
			'2026-03-22': 3,
			'2026-03-23': 4,
			'2026-03-24': 5,
			'2026-03-25': 6,
			'2026-03-26': 7,
			'2026-03-27': 8,
			'2026-03-28': 9,
		});

		// The receiver is unreachable for three days, then accepts.
		const harness = makeHarness([
			...Array.from({ length: 3 * MAX_ATTEMPTS }, unreachable),
			accepted(),
		]);
		harness.scheduler.start();

		let passes = 0;
		for (const [day, nextSlot] of [
			['2026-03-26', '2026-03-27T07:42:00.000Z'],
			['2026-03-27', '2026-03-28T07:42:00.000Z'],
			['2026-03-28', '2026-03-29T07:42:00.000Z'],
		]) {
			await armed(harness, ++passes);
			for (let attempt = 1; attempt < MAX_ATTEMPTS; attempt++) {
				await vi.advanceTimersByTimeAsync(RETRY_DELAY_MS);
				await armed(harness, ++passes);
			}

			const [skipped] = await repository.find({
				where: { status: 'skipped_after_max_retries' },
				order: { createdAt: 'DESC' },
				take: 1,
			});
			expect(skipped.attempts).toBe(MAX_ATTEMPTS);
			// Keep the skipped row on the day it was made, or the next day reads as settled too.
			await stampCreatedAt(skipped.id, new Date(`${day}T07:43:00.000Z`));

			await vi.advanceTimersByTimeAsync(RETRY_DELAY_MS);
			await armed(harness, ++passes);
			expectArmedFor(harness, nextSlot);
			await vi.advanceTimersByTimeAsync(new Date(nextSlot).getTime() - Date.now());
		}
		await armed(harness, ++passes);

		expect(harness.httpRequest).toHaveBeenCalledTimes(3 * MAX_ATTEMPTS + 1);
		// Every report started at the first day with data, not at its own yesterday.
		for (const index of [0, MAX_ATTEMPTS, 2 * MAX_ATTEMPTS]) {
			expect(dailyPoints(sentPayload(harness, index)).at(0)?.date).toBe('2026-03-20');
		}

		const delivered = sentPayload(harness, 3 * MAX_ATTEMPTS);
		expect(dailyPoints(delivered)).toEqual([
			{ date: '2026-03-20', value: 1 },
			{ date: '2026-03-21', value: 2 },
			{ date: '2026-03-22', value: 3 },
			{ date: '2026-03-23', value: 4 },
			{ date: '2026-03-24', value: 5 },
			{ date: '2026-03-25', value: 6 },
			{ date: '2026-03-26', value: 7 },
			{ date: '2026-03-27', value: 8 },
			{ date: '2026-03-28', value: 9 },
		]);
		await expect(repository.findOneByOrFail({ id: delivered.batchId })).resolves.toMatchObject({
			status: 'delivered',
		});
		await expect(repository.findLastCoveredDay()).resolves.toBe('2026-03-28');
	});

	test('resumes the retry budget and the remaining wait after a restart', async () => {
		const before = makeHarness([unreachable()]);

		before.scheduler.start();
		await armed(before, 1);

		expect(before.httpRequest).toHaveBeenCalledTimes(1);
		await expect(repository.count()).resolves.toBe(1);
		const [report] = await repository.find();
		expect(report).toMatchObject({ status: 'pending', attempts: 1 });

		// The process dies two minutes into the five-minute wait.
		before.scheduler.shutdown();
		await vi.advanceTimersByTimeAsync(2 * Time.minutes.toMilliseconds);

		const after = makeHarness([accepted()]);
		after.scheduler.start();
		await armed(after, 1);

		// Held back by the row's `lastAttemptAt` rather than attempting at once.
		expect(after.httpRequest).not.toHaveBeenCalled();
		// Three of the five minutes remain, less the fake clock's drift.
		const [remainingWait] = after.scheduleNext.mock.calls[0];
		const expectedWait = RETRY_DELAY_MS - 2 * Time.minutes.toMilliseconds;
		expect(remainingWait).toBeGreaterThanOrEqual(expectedWait - CLOCK_TOLERANCE_MS);
		expect(remainingWait).toBeLessThanOrEqual(expectedWait);

		await vi.advanceTimersByTimeAsync(remainingWait);
		await armed(after, 2);

		expect(after.httpRequest).toHaveBeenCalledTimes(1);
		expect(sentPayload(after, 0).batchId).toBe(report.id);
		await expect(repository.findOneByOrFail({ id: report.id })).resolves.toMatchObject({
			status: 'delivered',
			attempts: 2,
		});
	});

	test('resumes a pending report across the UTC midnight boundary', async () => {
		await setReportTime('23:56');
		vi.setSystemTime(new Date('2026-03-27T00:01:00.000Z'));

		// The 23:56 slot on 03-26 made this row. Its first attempt failed.
		const seeded = await seedPendingReport('2026-03-25', {
			attempts: 1,
			lastAttemptAt: new Date('2026-03-26T23:56:00.000Z'),
			createdAt: new Date('2026-03-26T23:56:00.000Z'),
		});

		const harness = makeHarness([accepted()]);
		harness.scheduler.start();
		await armed(harness, 1);

		// The retry after midnight resends the same row. It does not make a new row.
		expect(harness.httpRequest).toHaveBeenCalledTimes(1);
		const payload = sentPayload(harness, 0);
		expect(payload.batchId).toBe(seeded.id);
		expect(dailyPoints(payload)).toEqual([{ date: '2026-03-25', value: 5 }]);

		await expect(repository.findOneByOrFail({ id: seeded.id })).resolves.toMatchObject({
			status: 'delivered',
			attempts: 2,
		});
		await expect(repository.count()).resolves.toBe(1);
		expectArmedFor(harness, '2026-03-27T23:56:00.000Z');
	});

	test('keeps retrying across the boundary, then backfills the day after it is skipped', async () => {
		await setReportTime('23:56');
		vi.setSystemTime(new Date('2026-03-27T00:01:00.000Z'));

		await seedDeliveredReport('2026-03-24');
		await seedDailyExecutions({ '2026-03-25': 5, '2026-03-26': 7 });
		const seeded = await seedPendingReport('2026-03-25', {
			attempts: 1,
			lastAttemptAt: new Date('2026-03-26T23:56:00.000Z'),
			createdAt: new Date('2026-03-26T23:56:00.000Z'),
		});

		const harness = makeHarness([unreachable(), unreachable(), accepted()]);
		harness.scheduler.start();
		await armed(harness, 1);
		await vi.advanceTimersByTimeAsync(RETRY_DELAY_MS);
		await armed(harness, 2);

		// Two more attempts run after midnight. Then the row stops.
		expect(harness.httpRequest).toHaveBeenCalledTimes(2);
		await expect(repository.findOneByOrFail({ id: seeded.id })).resolves.toMatchObject({
			status: 'skipped_after_max_retries',
			attempts: MAX_ATTEMPTS,
		});

		// The next pass finds the day settled. It waits for the next slot.
		await vi.advanceTimersByTimeAsync(RETRY_DELAY_MS);
		await armed(harness, 3);
		expectArmedFor(harness, '2026-03-27T23:56:00.000Z');

		await vi.advanceTimersByTimeAsync(new Date('2026-03-27T23:56:00.000Z').getTime() - Date.now());
		await armed(harness, 4);

		expect(harness.httpRequest).toHaveBeenCalledTimes(3);
		const backfill = sentPayload(harness, 2);
		expect(backfill.batchId).not.toBe(seeded.id);
		expect(dailyPoints(backfill)).toEqual([
			{ date: '2026-03-25', value: 5 },
			{ date: '2026-03-26', value: 7 },
		]);
		await expect(repository.findLastCoveredDay()).resolves.toBe('2026-03-26');

		// The skipped row never lands. So no day reaches the receiver two times.
		const dates = await deliveredDailyDates();
		expect(new Set(dates).size).toBe(dates.length);
	});

	test('does not resurrect an orphan already covered by a newer delivered report', async () => {
		// A newer delivered report is above an older pending row that never delivered.
		await seedDeliveredReport('2026-03-25');
		const orphan = await seedPendingReport('2026-03-20', {
			attempts: 1,
			lastAttemptAt: new Date('2026-03-20T23:56:00.000Z'),
			createdAt: new Date('2026-03-20T23:56:00.000Z'),
		});

		const harness = makeHarness([accepted()]);
		harness.scheduler.start();
		await armed(harness, 1);

		// The latest row is delivered. So the code sends nothing and leaves the orphan.
		expect(harness.httpRequest).not.toHaveBeenCalled();
		await expect(repository.findOneByOrFail({ id: orphan.id })).resolves.toMatchObject({
			status: 'pending',
		});
		const dates = await deliveredDailyDates();
		expect(dates).not.toContain('2026-03-20');
	});

	test('expires a pending row after days of downtime, even before the slot, then backfills', async () => {
		await setReportTime('23:58');

		// A delivered report for 03-23, so the gap has a start.
		await seedDeliveredReport('2026-03-23');
		await seedDailyExecutions({
			'2026-03-24': 4,
			'2026-03-25': 6,
			'2026-03-26': 8,
			'2026-03-27': 10,
			'2026-03-28': 12,
		});

		// The 03-25 23:58 slot made this row for 03-24, then delivery failed.
		const stale = await seedPendingReport('2026-03-24', {
			attempts: 2,
			lastAttemptAt: new Date('2026-03-26T00:03:00.000Z'),
			createdAt: new Date('2026-03-25T23:58:00.000Z'),
		});

		// Back up four days later, and before tonight's 23:58 slot.
		vi.setSystemTime(new Date('2026-03-29T20:59:00.000Z'));

		const harness = makeHarness([accepted()]);
		harness.scheduler.start();
		await armed(harness, 1);

		// Four days is past its own next slot, so it is given up, not resent — even
		// though the time of day is still before tonight's slot.
		expect(harness.httpRequest).not.toHaveBeenCalled();
		await expect(repository.findOneByOrFail({ id: stale.id })).resolves.toMatchObject({
			status: 'skipped_after_max_retries',
		});
		expectArmedFor(harness, '2026-03-29T23:58:00.000Z');

		// Tonight's slot creates one fresh report for the whole gap.
		await vi.advanceTimersByTimeAsync(new Date('2026-03-29T23:58:00.000Z').getTime() - Date.now());
		await armed(harness, 2);

		const backfill = sentPayload(harness, 0);
		expect(backfill.batchId).not.toBe(stale.id);
		expect(dailyPoints(backfill)).toEqual([
			{ date: '2026-03-24', value: 4 },
			{ date: '2026-03-25', value: 6 },
			{ date: '2026-03-26', value: 8 },
			{ date: '2026-03-27', value: 10 },
			{ date: '2026-03-28', value: 12 },
		]);
		await expect(repository.findLastCoveredDay()).resolves.toBe('2026-03-28');

		const dates = await deliveredDailyDates();
		expect(new Set(dates).size).toBe(dates.length);
	});

	test('caps the retry to the slot, so a failure at the end of the day backfills the same night', async () => {
		await setReportTime('23:58');

		await seedDeliveredReport('2026-03-23');
		await seedDailyExecutions({ '2026-03-24': 4, '2026-03-25': 6 });

		// The 03-25 23:58 slot made this row for 03-24, its first attempt failed there,
		// then the instance was down for almost a day.
		const stale = await seedPendingReport('2026-03-24', {
			attempts: 1,
			lastAttemptAt: new Date('2026-03-25T23:58:00.000Z'),
			createdAt: new Date('2026-03-25T23:58:00.000Z'),
		});

		// Back up two minutes before tonight's slot, at the very end of the UTC day.
		vi.setSystemTime(new Date('2026-03-26T23:56:00.000Z'));

		const harness = makeHarness([unreachable(), accepted()]);
		harness.scheduler.start();
		await armed(harness, 1);

		// The resume fails; the next attempt is capped to the slot, two minutes away,
		// rather than a full five minutes that would cross midnight.
		expect(harness.httpRequest).toHaveBeenCalledTimes(1);
		expect(sentPayload(harness, 0).batchId).toBe(stale.id);

		// Two minutes later, at the slot, the row is given up and a fresh report goes
		// out the same night — not deferred to the next day's slot.
		await vi.advanceTimersByTimeAsync(2 * Time.minutes.toMilliseconds);
		await armed(harness, 2);

		expect(harness.httpRequest).toHaveBeenCalledTimes(2);
		await expect(repository.findOneByOrFail({ id: stale.id })).resolves.toMatchObject({
			status: 'skipped_after_max_retries',
		});
		const backfill = sentPayload(harness, 1);
		expect(backfill.batchId).not.toBe(stale.id);
		expect(dailyPoints(backfill)).toEqual([
			{ date: '2026-03-24', value: 4 },
			{ date: '2026-03-25', value: 6 },
		]);
		expectArmedFor(harness, '2026-03-27T23:58:00.000Z');
	});

	test('skips a stale row and sends a fresh report in the same pass, after the slot', async () => {
		await setReportTime('23:58');

		await seedDeliveredReport('2026-03-23');
		await seedDailyExecutions({ '2026-03-24': 4, '2026-03-25': 6, '2026-03-26': 8 });

		// A pending row for 03-24 from the 03-25 slot, left over from downtime.
		const stale = await seedPendingReport('2026-03-24', {
			attempts: 2,
			lastAttemptAt: new Date('2026-03-26T00:03:00.000Z'),
			createdAt: new Date('2026-03-25T23:58:00.000Z'),
		});

		// Back up after tonight's slot, so one pass both skips and sends.
		vi.setSystemTime(new Date('2026-03-27T23:59:00.000Z'));

		const harness = makeHarness([accepted()]);
		harness.scheduler.start();
		await armed(harness, 1);

		// The first pass gives up the stale row and creates the new report at once.
		expect(harness.httpRequest).toHaveBeenCalledTimes(1);
		await expect(repository.findOneByOrFail({ id: stale.id })).resolves.toMatchObject({
			status: 'skipped_after_max_retries',
		});
		const backfill = sentPayload(harness, 0);
		expect(backfill.batchId).not.toBe(stale.id);
		expect(dailyPoints(backfill)).toEqual([
			{ date: '2026-03-24', value: 4 },
			{ date: '2026-03-25', value: 6 },
			{ date: '2026-03-26', value: 8 },
		]);

		const dates = await deliveredDailyDates();
		expect(new Set(dates).size).toBe(dates.length);
	});
});

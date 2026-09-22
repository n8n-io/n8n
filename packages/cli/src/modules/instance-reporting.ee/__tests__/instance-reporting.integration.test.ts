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

import { EventService } from '@/events/event.service';
import { createCompactedInsightsEvent } from '@/modules/insights/database/entities/__tests__/db-utils';
import { InsightsService } from '@/modules/insights/insights.service';
import { OwnershipService } from '@/services/ownership.service';
import { createOwner } from '@test-integration/db/users';

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
			'User',
			'InsightsByPeriod',
			'InsightsMetadata',
			'WorkflowEntity',
			'Project',
		]);
		await createOwner();
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
			Container.get(OwnershipService),
			Container.get(LicenseMetricsRepository),
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
		const workflow = await createWorkflow({}, await createTeamProject());
		for (const [day, value] of Object.entries(totalsByDay)) {
			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value,
				periodUnit: 'day',
				periodStart: DateTime.fromISO(day, { zone: 'utc' }),
			});
		}
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

	test('caps a long gap at 30 days and still reads every day on its own', async () => {
		await seedDeliveredReport('2026-01-01');
		await seedDailyExecutions({ '2026-02-24': 6, '2026-03-25': 8 });

		const harness = makeHarness([accepted()]);
		harness.scheduler.start();
		await armed(harness, 1);

		expect(harness.httpRequest).toHaveBeenCalledTimes(1);
		const points = dailyPoints(sentPayload(harness, 0));
		expect(points).toHaveLength(30);
		// Exact days, not weekly buckets: a 30-day range still reads as days.
		expect(points.at(0)).toEqual({ date: '2026-02-24', value: 6 });
		expect(points.at(-1)).toEqual({ date: '2026-03-25', value: 8 });
		expect(points.slice(1, -1).every((point) => point.value === 0)).toBe(true);
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
});

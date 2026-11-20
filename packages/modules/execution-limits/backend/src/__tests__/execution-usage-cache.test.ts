import { mockLogger } from '@n8n/backend-test-utils';
import type { EventService } from '@n8n/backend-services';
import { mock } from 'vitest-mock-extended';

import type { ExecutionLimitUsageRepository } from '../execution-limit-usage.repository';
import { ExecutionUsageCache, USAGE_REFRESH_INTERVAL_MS } from '../execution-usage-cache';
import type { ExecutionLimitsSnapshot, LimitedScopes } from '../execution-limits-snapshot';
import type { UsageScope, UsageTotals } from '../execution-usage';

const NOW = new Date('2026-11-20T10:00:00.000Z');
const TODAY = '2026-11-20';
const FIRST_DAY = '2026-11-01';
const YESTERDAY = '2026-11-19';

const LIMITS: LimitedScopes = {
	periodUnit: 'month',
	hasInstanceLimit: true,
	limitedProjectIds: new Set(['p1', 'p2']),
};

const totals = (startedCount: number, blockedCount = 0, lastFoldAt: Date | null = null) =>
	({ startedCount, blockedCount, lastFoldAt }) satisfies UsageTotals;

const INSTANCE: UsageScope = { type: 'instance' };
const PROJECT: UsageScope = { type: 'project', projectId: 'p1' };

describe('ExecutionUsageCache', () => {
	const snapshot = mock<ExecutionLimitsSnapshot>();
	const repository = mock<ExecutionLimitUsageRepository>();
	const eventService = mock<EventService>();
	let logger: ReturnType<typeof mockLogger>;
	let cache: ExecutionUsageCache;

	const todayCalls = () =>
		repository.sumInstanceUsage.mock.calls.filter(([first, last]) => first === last);

	beforeEach(() => {
		vi.resetAllMocks();
		logger = mockLogger();
		vi.useFakeTimers();
		vi.setSystemTime(NOW);

		snapshot.readLimitedScopes.mockReturnValue(LIMITS);
		// Closed days end yesterday. Today is a range of one day that ends today.
		repository.sumInstanceUsage.mockImplementation(async (_first, last) =>
			last === TODAY ? totals(3, 1, new Date('2026-11-20T09:00:00.000Z')) : totals(100, 10),
		);
		repository.sumUsageOfLimitedProjects.mockImplementation(
			async (_first, last) =>
				new Map([
					[
						'p1',
						last === TODAY ? totals(2, 0, new Date('2026-11-20T09:30:00.000Z')) : totals(20, 5),
					],
				]),
		);

		cache = new ExecutionUsageCache(snapshot, repository, eventService, logger);
	});

	afterEach(() => {
		cache.stop();
		vi.useRealTimers();
	});

	it('knows nothing before a load', () => {
		expect(cache.read(INSTANCE, NOW)).toBeNull();
		expect(cache.read(PROJECT, NOW)).toBeNull();
	});

	describe('after a refresh', () => {
		it('adds the closed days and today for the instance', async () => {
			await cache.refresh();

			const usage = cache.read(INSTANCE, NOW);

			expect(usage?.executions).toBe(92);
			expect(usage?.lastFoldAt).toEqual(new Date('2026-11-20T09:00:00.000Z'));
			expect(usage?.period.firstDay).toBe(FIRST_DAY);
		});

		it('adds the closed days and today for a limited project', async () => {
			await cache.refresh();

			expect(cache.read(PROJECT, NOW)?.executions).toBe(17);
		});

		it('reads the closed range and today from the repository', async () => {
			await cache.refresh();

			expect(repository.sumInstanceUsage).toHaveBeenCalledWith(FIRST_DAY, YESTERDAY, {});
			expect(repository.sumInstanceUsage).toHaveBeenCalledWith(TODAY, TODAY, {});
			expect(repository.sumUsageOfLimitedProjects).toHaveBeenCalledWith(FIRST_DAY, YESTERDAY, {});
			expect(repository.sumUsageOfLimitedProjects).toHaveBeenCalledWith(TODAY, TODAY, {});
		});

		it('passes an empty closed range on the first day of a period', async () => {
			vi.setSystemTime(new Date('2026-11-01T10:00:00.000Z'));

			await cache.refresh();

			expect(repository.sumInstanceUsage).toHaveBeenCalledWith('2026-11-01', '2026-10-31', {});
			expect(repository.sumInstanceUsage).toHaveBeenCalledWith('2026-11-01', '2026-11-01', {});
		});

		it('emits a refreshed event with the duration', async () => {
			await cache.refresh();

			expect(eventService.emit).toHaveBeenCalledExactlyOnceWith('execution-limit-usage-refreshed', {
				durationMs: expect.any(Number),
			});
		});
	});

	describe('closed days', () => {
		beforeEach(async () => {
			await cache.refresh();
			vi.clearAllMocks();
		});

		it('reads only today again on a steady refresh', async () => {
			await cache.refresh();

			expect(repository.sumInstanceUsage).toHaveBeenCalledExactlyOnceWith(TODAY, TODAY, {});
			expect(repository.sumUsageOfLimitedProjects).toHaveBeenCalledExactlyOnceWith(
				TODAY,
				TODAY,
				{},
			);
		});

		it('reads them again when the UTC day changes', async () => {
			vi.setSystemTime(new Date('2026-11-21T00:00:01.000Z'));

			await cache.refresh();

			expect(repository.sumInstanceUsage).toHaveBeenCalledWith(FIRST_DAY, TODAY, {});
			expect(repository.sumInstanceUsage).toHaveBeenCalledWith('2026-11-21', '2026-11-21', {});
		});

		it('reads them again when the limits were loaded again', async () => {
			snapshot.readLimitedScopes.mockReturnValue({ ...LIMITS });

			await cache.refresh();

			expect(repository.sumInstanceUsage).toHaveBeenCalledWith(FIRST_DAY, YESTERDAY, {});
		});
	});

	describe('scopes without a limit', () => {
		it.each([
			[
				'no limit at all',
				{ ...LIMITS, hasInstanceLimit: false, limitedProjectIds: new Set<string>() },
			],
			['limits not loaded', null],
		])('reads nothing and emits nothing with %s', async (_name, limits) => {
			snapshot.readLimitedScopes.mockReturnValue(limits);

			await cache.refresh();

			expect(repository.sumInstanceUsage).not.toHaveBeenCalled();
			expect(repository.sumUsageOfLimitedProjects).not.toHaveBeenCalled();
			expect(cache.read(INSTANCE, NOW)).toBeNull();
			expect(eventService.emit).not.toHaveBeenCalled();
		});

		it('drops the loaded usage when the last limit is removed', async () => {
			await cache.refresh();
			snapshot.readLimitedScopes.mockReturnValue({
				...LIMITS,
				hasInstanceLimit: false,
				limitedProjectIds: new Set<string>(),
			});

			await cache.refresh();

			expect(cache.read(INSTANCE, NOW)).toBeNull();
		});

		it('does not read project usage with only an instance limit', async () => {
			snapshot.readLimitedScopes.mockReturnValue({
				...LIMITS,
				limitedProjectIds: new Set<string>(),
			});

			await cache.refresh();

			expect(repository.sumUsageOfLimitedProjects).not.toHaveBeenCalled();
			expect(cache.read(INSTANCE, NOW)?.executions).toBe(92);
		});

		it('does not read instance usage with only project limits', async () => {
			snapshot.readLimitedScopes.mockReturnValue({ ...LIMITS, hasInstanceLimit: false });

			await cache.refresh();

			expect(repository.sumInstanceUsage).not.toHaveBeenCalled();
			expect(cache.read(INSTANCE, NOW)).toBeNull();
			expect(cache.read(PROJECT, NOW)?.executions).toBe(17);
		});
	});

	describe('a failed refresh', () => {
		it('keeps the previous value and tells the event service', async () => {
			await cache.refresh();
			vi.clearAllMocks();
			repository.sumInstanceUsage.mockRejectedValueOnce(new Error('database is down'));

			await expect(cache.refresh()).resolves.toBeUndefined();

			expect(cache.read(INSTANCE, NOW)?.executions).toBe(92);
			expect(eventService.emit).toHaveBeenCalledExactlyOnceWith(
				'execution-limit-usage-refresh-failed',
				{},
			);
		});

		it('takes the next good refresh', async () => {
			await cache.refresh();
			repository.sumInstanceUsage.mockRejectedValueOnce(new Error('database is down'));
			await cache.refresh();
			vi.clearAllMocks();
			repository.sumInstanceUsage.mockImplementation(async (_first, last) =>
				last === TODAY ? totals(50) : totals(100, 10),
			);

			await cache.refresh();

			expect(cache.read(INSTANCE, NOW)?.executions).toBe(140);
			expect(eventService.emit).toHaveBeenCalledExactlyOnceWith('execution-limit-usage-refreshed', {
				durationMs: expect.any(Number),
			});
		});

		it('logs an error for the first failure and then for the 13th', async () => {
			const scoped = logger.scoped('policy');
			repository.sumInstanceUsage.mockRejectedValue(new Error('database is down'));
			repository.sumUsageOfLimitedProjects.mockRejectedValue(new Error('database is down'));

			for (let i = 0; i < 13; i++) await cache.refresh();

			expect(scoped.error).toHaveBeenCalledTimes(2);
		});
	});

	describe('when the loaded usage is stale', () => {
		it('returns null after the period resets without a refresh', async () => {
			await cache.refresh();

			const resetsAt = cache.read(INSTANCE, NOW)!.period.resetsAt;

			expect(cache.read(INSTANCE, new Date(resetsAt.getTime() - 1))).not.toBeNull();
			expect(cache.read(INSTANCE, resetsAt)).toBeNull();
		});

		it('returns null when the limits use another period unit than the load', async () => {
			await cache.refresh();
			snapshot.readLimitedScopes.mockReturnValue({ ...LIMITS, periodUnit: 'week' });

			expect(cache.read(INSTANCE, NOW)).toBeNull();
		});
	});

	describe('project scope', () => {
		beforeEach(async () => {
			await cache.refresh();
		});

		it('returns null for a project without a limit', () => {
			expect(cache.read({ type: 'project', projectId: 'unlimited' }, NOW)).toBeNull();
		});

		it('returns zero usage for a limited project without rows', () => {
			const usage = cache.read({ type: 'project', projectId: 'p2' }, NOW);

			expect(usage?.executions).toBe(0);
			expect(usage?.lastFoldAt).toBeNull();
		});

		it('returns null for a project that got its limit after the load', () => {
			snapshot.readLimitedScopes.mockReturnValue({
				...LIMITS,
				limitedProjectIds: new Set(['p1', 'p2', 'p3']),
			});

			expect(cache.read({ type: 'project', projectId: 'p3' }, NOW)).toBeNull();
		});

		it('still returns the usage of a limited project after the limits were loaded again', () => {
			snapshot.readLimitedScopes.mockReturnValue({ ...LIMITS });

			expect(cache.read(PROJECT, NOW)?.executions).toBe(17);
		});
	});

	describe('timers', () => {
		it('refreshes on start and on every interval until the stop', async () => {
			await cache.start();
			expect(todayCalls()).toHaveLength(1);

			await vi.advanceTimersByTimeAsync(USAGE_REFRESH_INTERVAL_MS);
			expect(todayCalls()).toHaveLength(2);

			await vi.advanceTimersByTimeAsync(USAGE_REFRESH_INTERVAL_MS);
			expect(todayCalls()).toHaveLength(3);

			cache.stop();
			await vi.advanceTimersByTimeAsync(USAGE_REFRESH_INTERVAL_MS * 2);
			expect(todayCalls()).toHaveLength(3);
		});
	});
});

import { mockLogger } from '@n8n/backend-test-utils';
import { Time } from '@n8n/constants';
import type { DbLockService } from '@n8n/db';
import { DbLock } from '@n8n/db';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import { OperationalError } from 'n8n-workflow';

import type { InsightsByPeriodRepository } from '../database/repositories/insights-by-period.repository';
import type { InsightsRawRepository } from '../database/repositories/insights-raw.repository';
import { InsightsCompactionService } from '../insights-compaction.service';
import { InsightsConfig } from '../insights.config';

type WithPrivateRun = { runCompaction: () => Promise<void> };

describe('InsightsCompactionService', () => {
	let config: InsightsConfig;
	let dbLockService: MockProxy<DbLockService>;
	let service: InsightsCompactionService;

	beforeEach(() => {
		jest.useFakeTimers();
		config = new InsightsConfig();
		config.compactionIntervalMinutes = 60;
		dbLockService = mock<DbLockService>();
		// By default, behave as if the lock is free: run the protected section.
		dbLockService.tryWithLock.mockImplementation(async (_id, fn) => await fn(undefined as never));
		service = new InsightsCompactionService(
			mock<InsightsByPeriodRepository>(),
			mock<InsightsRawRepository>(),
			config,
			mockLogger(),
			dbLockService,
		);
	});

	afterEach(() => {
		service.stopCompactionTimer();
		jest.useRealTimers();
		jest.restoreAllMocks();
		jest.clearAllMocks();
	});

	describe('compaction runs at least once per leadership period', () => {
		test('runs a compaction promptly when becoming leader, not only after a full interval', () => {
			const compactSpy = jest.spyOn(service, 'compactInsights').mockResolvedValue(undefined);

			// Simulates @OnLeaderTakeover starting the timer.
			service.startCompactionTimer();

			// A fresh leader must compact promptly. Without a leading-edge run the
			// first compaction is deferred a full interval, so this would be 0.
			expect(compactSpy).toHaveBeenCalledTimes(1);
		});

		test('still compacts when leadership changes faster than the compaction interval', () => {
			const compactSpy = jest.spyOn(service, 'compactInsights').mockResolvedValue(undefined);
			const intervalMs = config.compactionIntervalMinutes * Time.minutes.toMilliseconds;

			// Repeated takeover/stepdown, each shorter than one compaction interval.
			for (let i = 0; i < 5; i++) {
				service.startCompactionTimer(); // @OnLeaderTakeover
				jest.advanceTimersByTime(intervalMs * 0.5);
				service.stopCompactionTimer(); // @OnLeaderStepdown
			}

			// The interval is cleared and recreated on every takeover, so it never
			// reaches its first tick. At least one run should still have happened.
			expect(compactSpy).toHaveBeenCalled();
		});
	});

	describe('cross-instance locking', () => {
		test('runs the compaction body under the shared compaction lock', async () => {
			const runSpy = jest
				.spyOn(service as unknown as WithPrivateRun, 'runCompaction')
				.mockResolvedValue(undefined);

			await service.compactInsights();

			expect(dbLockService.tryWithLock).toHaveBeenCalledWith(
				DbLock.INSIGHTS_COMPACTION,
				expect.any(Function),
			);
			expect(runSpy).toHaveBeenCalledTimes(1);
		});

		test('skips the run when another instance already holds the lock', async () => {
			const runSpy = jest.spyOn(service as unknown as WithPrivateRun, 'runCompaction');
			dbLockService.tryWithLock.mockRejectedValue(
				new OperationalError('DbLock 1003 is already held by another process'),
			);

			// A held lock must not surface as an error; the run is simply skipped.
			await expect(service.compactInsights()).resolves.toBeUndefined();
			expect(runSpy).not.toHaveBeenCalled();
		});

		test('rethrows unexpected errors raised during compaction', async () => {
			dbLockService.tryWithLock.mockRejectedValue(new Error('database unavailable'));

			await expect(service.compactInsights()).rejects.toThrow('database unavailable');
		});
	});
});

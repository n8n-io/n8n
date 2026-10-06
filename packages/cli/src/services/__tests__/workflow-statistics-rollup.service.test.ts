import type { Logger } from '@n8n/backend-common';
import type { DbLockService, WorkflowStatisticsRepository } from '@n8n/db';
import { StatisticsNames } from '@n8n/db';
import { mock } from 'vitest-mock-extended';
import type { ErrorReporter } from 'n8n-core';
import { OperationalError } from 'n8n-workflow';

import type { WorkflowStatisticsService } from '../workflow-statistics.service';
import { WorkflowStatisticsRollupService } from '../workflow-statistics-rollup.service';

type RollupResult = Awaited<ReturnType<WorkflowStatisticsRepository['rollupIncrements']>>;

describe('WorkflowStatisticsRollupService', () => {
	const makeService = () => {
		const errorReporter = mock<ErrorReporter>();
		const dbLockService = mock<DbLockService>();
		const repository = mock<WorkflowStatisticsRepository>();
		const statisticsService = mock<WorkflowStatisticsService>();
		const logger = mock<Logger>(); // the scoped logger the service actually logs to
		const service = new WorkflowStatisticsRollupService(
			mock<Logger>({ scoped: vi.fn().mockReturnValue(logger) }),
			errorReporter,
			dbLockService,
			repository,
			statisticsService,
		);
		return { service, logger, errorReporter, dbLockService, repository, statisticsService };
	};

	const rollup = async (
		service: WorkflowStatisticsRollupService,
		signal = new AbortController().signal,
		runBudgetMs?: number,
	) => await service.rollup(signal, runBudgetMs);

	const batchOf = (increments: number): RollupResult => ({ increments, firstOccurrences: [] });

	describe('lock contention', () => {
		const lockHeld = () => new OperationalError('lock held');

		it('warns with counts once skips reach the threshold', async () => {
			const { service, dbLockService, logger } = makeService();
			dbLockService.tryWithLock.mockRejectedValue(lockHeld());

			for (let i = 0; i < 5; i++) await rollup(service);

			expect(logger.warn).toHaveBeenCalledTimes(1);
			expect(logger.warn).toHaveBeenCalledWith(expect.any(String), {
				consecutiveLockSkips: 5,
				totalLockSkips: 5,
			});
		});

		it('resets the consecutive count on a successful fold but keeps the total', async () => {
			const { service, dbLockService, logger } = makeService();

			for (let i = 0; i < 4; i++) dbLockService.tryWithLock.mockRejectedValueOnce(lockHeld());
			dbLockService.tryWithLock.mockResolvedValueOnce(batchOf(0));
			for (let i = 0; i < 5; i++) await rollup(service);
			expect(logger.warn).not.toHaveBeenCalled(); // streak broken at 4

			for (let i = 0; i < 5; i++) dbLockService.tryWithLock.mockRejectedValueOnce(lockHeld());
			for (let i = 0; i < 5; i++) await rollup(service);

			expect(logger.warn).toHaveBeenCalledTimes(1);
			expect(logger.warn).toHaveBeenCalledWith(expect.any(String), {
				consecutiveLockSkips: 5,
				totalLockSkips: 9,
			});
		});
	});

	describe('drain', () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('folds batches until one comes back partial', async () => {
			const { service, dbLockService } = makeService();
			dbLockService.tryWithLock
				.mockResolvedValueOnce(batchOf(5000))
				.mockResolvedValueOnce(batchOf(5000))
				.mockResolvedValueOnce(batchOf(12));

			const run = rollup(service);
			await vi.runAllTimersAsync();
			await run;

			expect(dbLockService.tryWithLock).toHaveBeenCalledTimes(3);
		});

		it('pauses between full batches', async () => {
			const { service, dbLockService } = makeService();
			dbLockService.tryWithLock
				.mockResolvedValueOnce(batchOf(5000))
				.mockResolvedValueOnce(batchOf(0));

			const run = rollup(service);
			await vi.advanceTimersByTimeAsync(249);
			expect(dbLockService.tryWithLock).toHaveBeenCalledTimes(1);

			await vi.advanceTimersByTimeAsync(1);
			await run;
			expect(dbLockService.tryWithLock).toHaveBeenCalledTimes(2);
		});

		it('drains beyond the task interval when no run budget is supplied', async () => {
			const { service, dbLockService } = makeService();
			for (let i = 0; i < 24; i++) {
				dbLockService.tryWithLock.mockResolvedValueOnce(batchOf(5000));
			}
			dbLockService.tryWithLock.mockResolvedValueOnce(batchOf(12));

			const run = rollup(service);
			await vi.runAllTimersAsync();
			await run;

			expect(dbLockService.tryWithLock).toHaveBeenCalledTimes(25);
		});

		it('stops at once when aborted during the pause between batches', async () => {
			const { service, dbLockService } = makeService();
			dbLockService.tryWithLock.mockResolvedValue(batchOf(5000));
			const controller = new AbortController();

			const run = rollup(service, controller.signal);
			await vi.advanceTimersByTimeAsync(0);
			controller.abort();

			await expect(run).resolves.toBeUndefined();
			expect(dbLockService.tryWithLock).toHaveBeenCalledTimes(1);
		});

		it('stops an unbudgeted drain when aborted past the task interval', async () => {
			const { service, dbLockService } = makeService();
			dbLockService.tryWithLock.mockResolvedValue(batchOf(5000));
			const controller = new AbortController();

			let settled = false;
			void rollup(service, controller.signal).then(() => (settled = true));
			await vi.advanceTimersByTimeAsync(10_000);
			expect(settled).toBe(false);
			const batchesBeforeAbort = dbLockService.tryWithLock.mock.calls.length;

			controller.abort();
			await vi.advanceTimersByTimeAsync(0);

			expect(settled).toBe(true);
			expect(batchesBeforeAbort).toBeGreaterThan(20);
			expect(dbLockService.tryWithLock).toHaveBeenCalledTimes(batchesBeforeAbort);
			expect(vi.getTimerCount()).toBe(0);
		});

		it('stops once the run budget is spent, leaving the backlog to the next run', async () => {
			const { service, dbLockService } = makeService();
			dbLockService.tryWithLock.mockResolvedValue(batchOf(5000));

			let settled = false;
			const run = rollup(service, undefined, 4000).then(() => (settled = true));
			await vi.advanceTimersByTimeAsync(4000);

			expect(settled).toBe(true);
			expect(dbLockService.tryWithLock).toHaveBeenCalledTimes(16);
			await run;
		});

		it('does not pause after the last batch that fits in the run budget', async () => {
			const { service, dbLockService } = makeService();
			dbLockService.tryWithLock.mockResolvedValue(batchOf(5000));

			let settled = false;
			void rollup(service, undefined, 4000).then(() => (settled = true));
			await vi.advanceTimersByTimeAsync(3750);

			expect(settled).toBe(true);
		});

		it('does not start a batch that would end past the run budget', async () => {
			const { service, dbLockService } = makeService();
			dbLockService.tryWithLock.mockImplementation(async () => {
				await new Promise((resolve) => setTimeout(resolve, 1500));
				return batchOf(5000);
			});

			let settled = false;
			void rollup(service, undefined, 4000).then(() => (settled = true));
			await vi.advanceTimersByTimeAsync(3250);

			expect(settled).toBe(true);
			expect(dbLockService.tryWithLock).toHaveBeenCalledTimes(2);
		});

		it('uses the run budget supplied by the caller', async () => {
			const { service, dbLockService } = makeService();
			dbLockService.tryWithLock.mockResolvedValue(batchOf(5000));

			let settled = false;
			void rollup(service, undefined, 1000).then(() => (settled = true));
			await vi.advanceTimersByTimeAsync(750);

			expect(settled).toBe(true);
			expect(dbLockService.tryWithLock).toHaveBeenCalledTimes(4);
		});

		it('folds one batch when the run budget is zero', async () => {
			const { service, dbLockService } = makeService();
			dbLockService.tryWithLock.mockResolvedValue(batchOf(5000));

			await rollup(service, undefined, 0);

			expect(dbLockService.tryWithLock).toHaveBeenCalledTimes(1);
			expect(vi.getTimerCount()).toBe(0);
		});

		it('does not fold when the signal is already aborted', async () => {
			const { service, dbLockService } = makeService();

			await rollup(service, AbortSignal.abort());

			expect(dbLockService.tryWithLock).not.toHaveBeenCalled();
		});

		it('stops after one attempt when the lock is held elsewhere', async () => {
			const { service, dbLockService } = makeService();
			dbLockService.tryWithLock.mockRejectedValue(new OperationalError('lock held'));

			await rollup(service);

			expect(dbLockService.tryWithLock).toHaveBeenCalledTimes(1);
		});
	});

	describe('rollup', () => {
		it('skips the run (no milestones) when the advisory lock is held by another instance', async () => {
			const { service, dbLockService, statisticsService } = makeService();
			dbLockService.tryWithLock.mockRejectedValue(new OperationalError('lock held'));

			await rollup(service);

			expect(statisticsService.emitFirstOccurrenceEvent).not.toHaveBeenCalled();
		});

		it('rethrows a non-lock error so the runner reports the failed run', async () => {
			const { service, dbLockService, statisticsService } = makeService();
			dbLockService.tryWithLock.mockRejectedValue(new Error('connection reset'));

			await expect(rollup(service)).rejects.toThrow('connection reset');
			expect(statisticsService.emitFirstOccurrenceEvent).not.toHaveBeenCalled();
		});

		it('fires a milestone for each first-occurrence row', async () => {
			const { service, dbLockService, statisticsService } = makeService();
			const result: RollupResult = {
				increments: 1234,
				firstOccurrences: [
					{
						name: StatisticsNames.productionSuccess,
						workflowId: 'wf-1',
						workflowName: 'A',
						firstEventMs: 1,
					},
					{
						name: StatisticsNames.productionError,
						workflowId: 'wf-2',
						workflowName: 'B',
						firstEventMs: 2,
					},
				],
			};
			dbLockService.tryWithLock.mockResolvedValue(result);

			await rollup(service);

			expect(statisticsService.emitFirstOccurrenceEvent).toHaveBeenCalledTimes(2);
			expect(statisticsService.emitFirstOccurrenceEvent).toHaveBeenCalledWith(
				StatisticsNames.productionSuccess,
				'wf-1',
				'A',
				1,
			);
		});

		it('isolates milestone failures: one throwing row does not stop the others or fail the run', async () => {
			const { service, dbLockService, statisticsService } = makeService();
			const result: RollupResult = {
				increments: 2,
				firstOccurrences: [
					{
						name: StatisticsNames.productionSuccess,
						workflowId: 'deleted-wf',
						workflowName: null,
						firstEventMs: 1,
					},
					{
						name: StatisticsNames.productionSuccess,
						workflowId: 'wf-2',
						workflowName: 'B',
						firstEventMs: 2,
					},
				],
			};
			dbLockService.tryWithLock.mockResolvedValue(result);
			statisticsService.emitFirstOccurrenceEvent
				.mockRejectedValueOnce(new Error('workflow/project deleted during rollup lag'))
				.mockResolvedValueOnce();

			await expect(rollup(service)).resolves.toBeUndefined();
			expect(statisticsService.emitFirstOccurrenceEvent).toHaveBeenCalledTimes(2);
		});
	});
});

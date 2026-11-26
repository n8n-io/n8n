import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ExecutionFilesDeleter, ExecutionLocation } from '../../dependencies';
import { ExecutionFileCleanup } from '../../execution';
import type { ExecutionStore, PrunableExecution } from '../../execution';
import type { EngineLogger } from '../../logging';
import { RetentionSweeper } from '../retention-sweeper';

const DAY_MS = 86_400_000;
const INTERVAL_MS = 1_000;

function makeLogger(): EngineLogger {
	return { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() };
}

/** Only the retention methods are exercised here. */
function makeExecutionStore(): ExecutionStore {
	return {
		createExecution: vi.fn(),
		loadExecution: vi.fn(),
		loadExecutionStatus: vi.fn(),
		loadSeededOutputs: vi.fn(),
		transitionStatus: vi.fn(),
		finishExecution: vi.fn(),
		cancelExecution: vi.fn(),
		findStaleQueuedExecutions: vi.fn(),
		renewQueuedExecution: vi.fn(),
		refreshLiveStatus: vi.fn(),
		loadLiveSubExecutionIds: vi.fn(),
		findPrunableExecutions: vi.fn().mockResolvedValue([]),
		findRetentionCountCutoff: vi.fn().mockResolvedValue(undefined),
		deleteEndedExecutions: vi.fn(async (ids: string[]) => ids.length),
	};
}

const row = (n: number): PrunableExecution => ({
	id: `exec-${n}`,
	workflowId: 'wf-1',
	finishedAt: new Date(n),
});

/** A sweeper with batches of 2 whose first pass starts at once, unless `random` says otherwise. */
function makeSweeper(
	store = makeExecutionStore(),
	{
		deleteFiles,
		random = () => 0,
		maxCount,
	}: Partial<{ deleteFiles: ExecutionFilesDeleter; random: () => number; maxCount: number }> = {},
) {
	const logger = makeLogger();
	const cleanup = new ExecutionFileCleanup(deleteFiles ?? vi.fn(async () => {}), logger);
	const policy = { maxAgeMs: DAY_MS, maxCount, intervalMs: INTERVAL_MS, batchSize: 2 };
	return { sweeper: new RetentionSweeper(store, cleanup, policy, logger, random), store, logger };
}

describe('RetentionSweeper', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('a pass', () => {
		it('selects the next batch at once while batches are full, after the last row of the batch before', async () => {
			const store = makeExecutionStore();
			vi.mocked(store.findPrunableExecutions)
				.mockResolvedValueOnce([row(1), row(2)])
				.mockResolvedValueOnce([row(3), row(4)])
				.mockResolvedValueOnce([row(5)]);
			const { sweeper, logger } = makeSweeper(store);

			sweeper.start();
			await vi.advanceTimersByTimeAsync(0);

			expect(vi.mocked(store.findPrunableExecutions).mock.calls).toEqual([
				[{ maxAgeMs: DAY_MS, limit: 2 }],
				[{ maxAgeMs: DAY_MS, limit: 2, after: row(2) }],
				[{ maxAgeMs: DAY_MS, limit: 2, after: row(4) }],
			]);
			expect(vi.mocked(store.deleteEndedExecutions).mock.calls).toEqual([
				[['exec-1', 'exec-2']],
				[['exec-3', 'exec-4']],
				[['exec-5']],
			]);
			expect(logger.info).toHaveBeenCalledExactlyOnceWith('Execution retention pass finished', {
				deleted: 5,
			});

			await sweeper.stop();
		});

		it('reads the count cutoff once per pass and passes it to every batch of the pass', async () => {
			const store = makeExecutionStore();
			const cutoff = { id: 'exec-9', finishedAt: new Date(9) };
			vi.mocked(store.findRetentionCountCutoff).mockResolvedValue(cutoff);
			vi.mocked(store.findPrunableExecutions)
				.mockResolvedValueOnce([row(1), row(2)])
				.mockResolvedValueOnce([row(3)]);
			const { sweeper } = makeSweeper(store, { maxCount: 5 });

			sweeper.start();
			await vi.advanceTimersByTimeAsync(0);

			expect(store.findRetentionCountCutoff).toHaveBeenCalledExactlyOnceWith(5);
			expect(vi.mocked(store.findPrunableExecutions).mock.calls).toEqual([
				[{ maxAgeMs: DAY_MS, countCutoff: cutoff, limit: 2 }],
				[{ maxAgeMs: DAY_MS, countCutoff: cutoff, limit: 2, after: row(2) }],
			]);

			await vi.advanceTimersByTimeAsync(INTERVAL_MS);
			expect(store.findRetentionCountCutoff).toHaveBeenCalledTimes(2);

			await sweeper.stop();
		});

		it.each([undefined, 0])(
			'does not read a count cutoff when maxCount is %s',
			async (maxCount) => {
				const { sweeper, store } = makeSweeper(undefined, { maxCount });

				sweeper.start();
				await vi.advanceTimersByTimeAsync(0);

				expect(store.findRetentionCountCutoff).not.toHaveBeenCalled();
				expect(store.findPrunableExecutions).toHaveBeenCalledExactlyOnceWith({
					maxAgeMs: DAY_MS,
					limit: 2,
				});

				await sweeper.stop();
			},
		);

		it('keeps the rows of an execution whose files fail to delete, and selects it again only in the next pass', async () => {
			const store = makeExecutionStore();
			vi.mocked(store.findPrunableExecutions).mockResolvedValueOnce([row(1), row(2)]);
			const deleteFiles = vi.fn(async ({ executionId }: ExecutionLocation) => {
				if (executionId === 'exec-1') throw new Error('store unavailable');
			});
			const { sweeper } = makeSweeper(store, { deleteFiles });

			sweeper.start();
			await vi.advanceTimersByTimeAsync(0);

			expect(store.deleteEndedExecutions).toHaveBeenCalledExactlyOnceWith(['exec-2']);
			expect(store.findPrunableExecutions).toHaveBeenCalledTimes(2);
			expect(store.findPrunableExecutions).toHaveBeenLastCalledWith(
				expect.objectContaining({ after: row(2) }),
			);

			await vi.advanceTimersByTimeAsync(INTERVAL_MS);
			expect(store.findPrunableExecutions).toHaveBeenLastCalledWith({
				maxAgeMs: DAY_MS,
				limit: 2,
				after: undefined,
			});

			await sweeper.stop();
		});

		const error = new Error('connection reset');

		it.each([
			[
				'findRetentionCountCutoff',
				0,
				(store: ExecutionStore) =>
					vi.mocked(store.findRetentionCountCutoff).mockRejectedValueOnce(error),
			],
			[
				'findPrunableExecutions',
				2,
				(store: ExecutionStore) =>
					vi
						.mocked(store.findPrunableExecutions)
						.mockResolvedValueOnce([row(1), row(2)])
						.mockRejectedValueOnce(error),
			],
			[
				'deleteEndedExecutions',
				0,
				(store: ExecutionStore) => {
					vi.mocked(store.findPrunableExecutions).mockResolvedValueOnce([row(1)]);
					vi.mocked(store.deleteEndedExecutions).mockRejectedValueOnce(error);
				},
			],
		])(
			'logs a rejected %s with the %i executions deleted so far, ends the pass, and still schedules the next pass',
			async (_, deleted, reject) => {
				const store = makeExecutionStore();
				reject(store);
				const { sweeper, logger } = makeSweeper(store, { maxCount: 5 });

				sweeper.start();
				await vi.advanceTimersByTimeAsync(0);

				expect(logger.error).toHaveBeenCalledWith('Execution retention pass failed', {
					error,
					deleted,
				});
				expect(logger.info).not.toHaveBeenCalled();

				const passOneCalls = vi.mocked(store.findPrunableExecutions).mock.calls.length;
				await vi.advanceTimersByTimeAsync(INTERVAL_MS);
				expect(store.findPrunableExecutions).toHaveBeenCalledTimes(passOneCalls + 1);

				await sweeper.stop();
			},
		);
	});

	describe('the timer', () => {
		it('starts the first pass after the random offset, and the next one an interval after a pass ends', async () => {
			const passMs = 2_500;
			const store = makeExecutionStore();
			vi.mocked(store.findPrunableExecutions).mockImplementation(
				async () => await new Promise((resolve) => setTimeout(() => resolve([]), passMs)),
			);
			const { sweeper, logger } = makeSweeper(store, { random: () => 0.5 });

			sweeper.start();
			await vi.advanceTimersByTimeAsync(INTERVAL_MS / 2 - 1);
			expect(store.findPrunableExecutions).not.toHaveBeenCalled();

			await vi.advanceTimersByTimeAsync(1);
			expect(store.findPrunableExecutions).toHaveBeenCalledOnce();

			await vi.advanceTimersByTimeAsync(passMs + INTERVAL_MS - 1);
			expect(store.findPrunableExecutions).toHaveBeenCalledOnce();

			await vi.advanceTimersByTimeAsync(1);
			expect(store.findPrunableExecutions).toHaveBeenCalledTimes(2);
			expect(logger.info).not.toHaveBeenCalled();

			await vi.advanceTimersByTimeAsync(passMs);
			await sweeper.stop();
		});

		it('keeps one timer when start is called two times', async () => {
			const { sweeper } = makeSweeper();

			sweeper.start();
			sweeper.start();

			expect(vi.getTimerCount()).toBe(1);
			await sweeper.stop();
		});

		it.each([
			{ when: 'during the first delay', stopAtMs: 1, waits: false },
			{ when: 'during a pass', stopAtMs: INTERVAL_MS / 2, waits: true },
		])(
			'sets no timer and selects no batch once stopped $when, and waits for a pass: $waits',
			async ({ stopAtMs, waits }) => {
				const store = makeExecutionStore();
				vi.mocked(store.findPrunableExecutions).mockResolvedValueOnce([row(1), row(2)]);
				let releaseDelete = () => {};
				vi.mocked(store.deleteEndedExecutions).mockImplementationOnce(
					async () =>
						await new Promise<number>((resolve) => {
							releaseDelete = () => resolve(2);
						}),
				);
				const { sweeper } = makeSweeper(store, { random: () => 0.5 });

				sweeper.start();
				await vi.advanceTimersByTimeAsync(stopAtMs);
				const callsAtStop = vi.mocked(store.findPrunableExecutions).mock.calls.length;
				let settled = false;
				const stopped = sweeper.stop().then(() => (settled = true));
				await vi.advanceTimersByTimeAsync(0);
				expect(settled).toBe(!waits);
				releaseDelete();
				await stopped;

				expect(vi.getTimerCount()).toBe(0);
				await vi.advanceTimersByTimeAsync(INTERVAL_MS * 5);
				expect(store.findPrunableExecutions).toHaveBeenCalledTimes(callsAtStop);
			},
		);
	});
});

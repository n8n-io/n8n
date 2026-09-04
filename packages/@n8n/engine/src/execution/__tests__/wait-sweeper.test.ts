import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { EngineLogger } from '../../logging';
import type { StepMessage, WorkQueue } from '../../queue';
import type { DueStep, StepStore } from '../step-store';
import { WaitSweeper } from '../wait-sweeper';

const SWEEP_MS = 1_000;

function makeStepQueue(): WorkQueue<StepMessage> {
	return { publish: vi.fn(), start: vi.fn(), stop: vi.fn() };
}

function makeLogger(): EngineLogger {
	return { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() };
}

/** Only `resumeDueSteps` is exercised here; the rest belong to other handlers. */
function makeStepStore(resumeDueSteps = vi.fn().mockResolvedValue([])): StepStore {
	return {
		createSteps: vi.fn(),
		loadStep: vi.fn(),
		claimStep: vi.fn(),
		completeStep: vi.fn(),
		suspendStep: vi.fn(),
		resumeStep: vi.fn(),
		resumeDueSteps,
		failStep: vi.fn(),
		cancelQueuedSteps: vi.fn(),
		loadStepsByKeys: vi.fn().mockResolvedValue({}),
		loadStepSummariesByKeys: vi.fn().mockResolvedValue({}),
		loadLatestStepSummaries: vi.fn().mockResolvedValue({}),
		loadAllSteps: vi.fn().mockResolvedValue([]),
		countSettledSteps: vi.fn().mockResolvedValue(0),
		hasFailedSteps: vi.fn().mockResolvedValue(false),
	};
}

const due: DueStep[] = [
	{ id: 'step-a', executionId: 'exec-1' },
	{ id: 'step-b', executionId: 'exec-2' },
];

describe('WaitSweeper', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it('resumes the waits that came due and announces each one ready', async () => {
		const resumeDueSteps = vi.fn().mockResolvedValue(due);
		const stepStore = makeStepStore(resumeDueSteps);
		const queue = makeStepQueue();
		const sweeper = new WaitSweeper(stepStore, queue, makeLogger(), SWEEP_MS);

		sweeper.start();
		await vi.advanceTimersByTimeAsync(SWEEP_MS);

		// the sweep names the instant, so the store applies a deadline it was given
		expect(resumeDueSteps).toHaveBeenCalledWith(new Date(), expect.any(Number));
		expect(queue.publish).toHaveBeenCalledTimes(2);
		expect(queue.publish).toHaveBeenCalledWith({
			type: 'step:ready',
			executionId: 'exec-1',
			stepId: 'step-a',
		});
		expect(queue.publish).toHaveBeenCalledWith({
			type: 'step:ready',
			executionId: 'exec-2',
			stepId: 'step-b',
		});

		await sweeper.stop();
	});

	it('does not sweep before the interval elapses', async () => {
		const stepStore = makeStepStore();
		const sweeper = new WaitSweeper(stepStore, makeStepQueue(), makeLogger(), SWEEP_MS);

		sweeper.start();
		await vi.advanceTimersByTimeAsync(SWEEP_MS - 1);

		expect(stepStore.resumeDueSteps).not.toHaveBeenCalled();

		await sweeper.stop();
	});

	it('sweeps once per interval', async () => {
		const stepStore = makeStepStore();
		const sweeper = new WaitSweeper(stepStore, makeStepQueue(), makeLogger(), SWEEP_MS);

		sweeper.start();
		await vi.advanceTimersByTimeAsync(SWEEP_MS * 3);

		expect(stepStore.resumeDueSteps).toHaveBeenCalledTimes(3);

		await sweeper.stop();
	});

	it('keeps sweeping after a tick fails', async () => {
		// A sweep that cannot reach the database must not stop firing deadlines
		// for the rest of the process's life.
		const resumeDueSteps = vi
			.fn()
			.mockRejectedValueOnce(new Error('connection reset'))
			.mockResolvedValue(due);
		const stepStore = makeStepStore(resumeDueSteps);
		const queue = makeStepQueue();
		const logger = makeLogger();
		const sweeper = new WaitSweeper(stepStore, queue, logger, SWEEP_MS);

		sweeper.start();
		await vi.advanceTimersByTimeAsync(SWEEP_MS * 2);

		expect(resumeDueSteps).toHaveBeenCalledTimes(2);
		expect(queue.publish).toHaveBeenCalledTimes(2);
		expect(logger.error).toHaveBeenCalled();

		await sweeper.stop();
	});

	it('announces the remaining steps when one announcement fails', async () => {
		// The row is already `queued`, so a lost announcement strands that one step
		// for reconciliation (CAT-2938) — it must not strand its whole batch.
		const stepStore = makeStepStore(vi.fn().mockResolvedValue(due));
		const queue = makeStepQueue();
		vi.mocked(queue.publish).mockRejectedValueOnce(new Error('queue closed'));
		const logger = makeLogger();
		const sweeper = new WaitSweeper(stepStore, queue, logger, SWEEP_MS);

		sweeper.start();
		await vi.advanceTimersByTimeAsync(SWEEP_MS);

		expect(queue.publish).toHaveBeenCalledTimes(2);
		expect(queue.publish).toHaveBeenLastCalledWith({
			type: 'step:ready',
			executionId: 'exec-2',
			stepId: 'step-b',
		});
		expect(logger.error).toHaveBeenCalled();

		await sweeper.stop();
	});

	it('sweeps no more once stopped', async () => {
		const stepStore = makeStepStore();
		const sweeper = new WaitSweeper(stepStore, makeStepQueue(), makeLogger(), SWEEP_MS);

		sweeper.start();
		await vi.advanceTimersByTimeAsync(SWEEP_MS);
		await sweeper.stop();
		await vi.advanceTimersByTimeAsync(SWEEP_MS * 5);

		expect(stepStore.resumeDueSteps).toHaveBeenCalledTimes(1);
	});
});

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
		cancelPendingSteps: vi.fn(),
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

		// the sweeper decides what `now` is and passes it, so the store never reads its own clock
		expect(resumeDueSteps).toHaveBeenCalledWith(new Date(), 500);
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
		expect(logger.error).toHaveBeenCalledWith('engine: wait sweep failed to resume due waits', {
			error: expect.any(Error),
		});

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
		// the ids are what makes the stranded step findable for CAT-2938
		expect(logger.error).toHaveBeenCalledWith(
			'engine: wait sweep failed to announce a resumed step',
			{ error: expect.any(Error), executionId: 'exec-1', stepId: 'step-a' },
		);

		await sweeper.stop();
	});

	it('does not sweep again when it is stopped mid-sweep', async () => {
		// `stop()` clears the pending timer, but a sweep already in flight re-arms
		// from its own `finally`. Only the stopped flag prevents that.
		let releaseSweep!: () => void;
		const inFlight = new Promise<DueStep[]>((resolve) => {
			releaseSweep = () => resolve([]);
		});
		const resumeDueSteps = vi.fn().mockReturnValue(inFlight);
		const sweeper = new WaitSweeper(
			makeStepStore(resumeDueSteps),
			makeStepQueue(),
			makeLogger(),
			SWEEP_MS,
		);

		sweeper.start();
		await vi.advanceTimersByTimeAsync(SWEEP_MS);
		const stopped = sweeper.stop();
		releaseSweep();
		await stopped;
		await vi.advanceTimersByTimeAsync(SWEEP_MS * 5);

		expect(resumeDueSteps).toHaveBeenCalledTimes(1);
	});

	it('does not start a sweep while one is still running', async () => {
		// The next sweep is armed from the previous one's `finally`, so a slow
		// database stretches the interval instead of stacking sweeps.
		const resumeDueSteps = vi.fn().mockReturnValue(new Promise<DueStep[]>(() => {}));
		const sweeper = new WaitSweeper(
			makeStepStore(resumeDueSteps),
			makeStepQueue(),
			makeLogger(),
			SWEEP_MS,
		);

		sweeper.start();
		await vi.advanceTimersByTimeAsync(SWEEP_MS * 3);

		// no stop(): it would wait for the sweep that never settles
		expect(resumeDueSteps).toHaveBeenCalledTimes(1);
	});

	it('leaves its timer unreferenced, so a pending sweep holds no process open', async () => {
		const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
		const sweeper = new WaitSweeper(makeStepStore(), makeStepQueue(), makeLogger(), SWEEP_MS);

		sweeper.start();

		const timer = setTimeoutSpy.mock.results[0].value as NodeJS.Timeout;
		expect(timer.hasRef()).toBe(false);

		await sweeper.stop();
	});

	it('defaults to a sweep a minute', async () => {
		// v1 resolves waits on a 60-second poll, so the default matches it.
		const stepStore = makeStepStore();
		const sweeper = new WaitSweeper(stepStore, makeStepQueue(), makeLogger());

		sweeper.start();
		await vi.advanceTimersByTimeAsync(59_999);

		expect(stepStore.resumeDueSteps).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(1);
		expect(stepStore.resumeDueSteps).toHaveBeenCalledTimes(1);

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

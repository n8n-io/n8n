import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { EngineLogger } from '../../logging';
import { ReconciliationSweeper } from '../reconciliation-sweeper';
import type { Detector, Finding, Repair } from '../reconciliation.types';

const INTERVAL_MS = 1_000;

type StepKind = 'step-queued-no-message';
type ExecutionKind = 'execution-queued-no-message';
type FindingOf<K extends Finding['kind']> = Extract<Finding, { kind: K }>;

function makeLogger(): EngineLogger {
	return { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() };
}

function stepFinding(stepId: string): FindingOf<StepKind> {
	return { kind: 'step-queued-no-message', stepId, staleAfter: new Date(0) };
}

function executionFinding(executionId: string): FindingOf<ExecutionKind> {
	return { kind: 'execution-queued-no-message', executionId, staleAfter: new Date(0) };
}

function makeStepDetector(
	findings: Array<FindingOf<StepKind>> = [],
	intervalMs = INTERVAL_MS,
): Detector {
	return {
		name: 'queued steps',
		intervalMs,
		detect: vi.fn<Detector['detect']>().mockResolvedValue(findings),
	};
}

function makeExecutionDetector(
	findings: Array<FindingOf<ExecutionKind>> = [],
	intervalMs = INTERVAL_MS,
): Detector {
	return {
		name: 'queued executions',
		intervalMs,
		detect: vi.fn<Detector['detect']>().mockResolvedValue(findings),
	};
}

function makeStepRepair(): Repair<StepKind> {
	return {
		kind: 'step-queued-no-message',
		apply: vi.fn<Repair<StepKind>['apply']>().mockResolvedValue(true),
	};
}

function makeExecutionRepair(): Repair<ExecutionKind> {
	return {
		kind: 'execution-queued-no-message',
		apply: vi.fn<Repair<ExecutionKind>['apply']>().mockResolvedValue(true),
	};
}

/** A promise that the test settles, to keep a pass in progress. */
function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
	let resolve: (value: T) => void = () => {};
	const promise = new Promise<T>((settle) => {
		resolve = settle;
	});
	return { promise, resolve };
}

describe('ReconciliationSweeper', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it('sets no timer when it has no detector', () => {
		new ReconciliationSweeper([], {}, makeLogger()).start();

		expect(vi.getTimerCount()).toBe(0);
	});

	it('does not run a detector before it starts', async () => {
		const detector = makeStepDetector();
		new ReconciliationSweeper(
			[detector],
			{ 'step-queued-no-message': makeStepRepair() },
			makeLogger(),
		);

		await vi.advanceTimersByTimeAsync(INTERVAL_MS * 3);

		expect(detector.detect).not.toHaveBeenCalled();
	});

	it('runs each detector at its own interval', async () => {
		const fast = makeStepDetector([], INTERVAL_MS);
		const slow = makeExecutionDetector([], INTERVAL_MS * 3);
		const sweeper = new ReconciliationSweeper(
			[fast, slow],
			{
				'step-queued-no-message': makeStepRepair(),
				'execution-queued-no-message': makeExecutionRepair(),
			},
			makeLogger(),
		);

		sweeper.start();
		await vi.advanceTimersByTimeAsync(INTERVAL_MS * 3);

		expect(fast.detect).toHaveBeenCalledTimes(3);
		expect(slow.detect).toHaveBeenCalledTimes(1);
		await sweeper.stop();
	});

	it('passes each finding to the repair of its kind, with the time of the pass', async () => {
		const stepRepair = makeStepRepair();
		const executionRepair = makeExecutionRepair();
		const stepDetector = makeStepDetector([stepFinding('step-a'), stepFinding('step-b')]);
		const sweeper = new ReconciliationSweeper(
			[stepDetector, makeExecutionDetector([executionFinding('exec-1')])],
			{ 'step-queued-no-message': stepRepair, 'execution-queued-no-message': executionRepair },
			makeLogger(),
		);

		sweeper.start();
		await vi.advanceTimersByTimeAsync(INTERVAL_MS);

		const at = vi.mocked(stepDetector.detect).mock.calls[0][0];
		expect(at).toEqual(new Date());
		expect(stepRepair.apply).toHaveBeenCalledTimes(2);
		expect(stepRepair.apply).toHaveBeenCalledWith(stepFinding('step-a'), at);
		expect(stepRepair.apply).toHaveBeenCalledWith(stepFinding('step-b'), at);
		expect(executionRepair.apply).toHaveBeenCalledTimes(1);
		expect(executionRepair.apply).toHaveBeenCalledWith(
			executionFinding('exec-1'),
			expect.any(Date),
		);
		await sweeper.stop();
	});

	it('starts the next pass of a detector only after the current pass ends', async () => {
		const pending = deferred<Array<FindingOf<StepKind>>>();
		const detector = makeStepDetector();
		vi.mocked(detector.detect).mockReturnValueOnce(pending.promise);
		const sweeper = new ReconciliationSweeper(
			[detector],
			{ 'step-queued-no-message': makeStepRepair() },
			makeLogger(),
		);

		sweeper.start();
		await vi.advanceTimersByTimeAsync(INTERVAL_MS * 5);
		expect(detector.detect).toHaveBeenCalledTimes(1);

		pending.resolve([]);
		await vi.advanceTimersByTimeAsync(INTERVAL_MS);
		expect(detector.detect).toHaveBeenCalledTimes(2);
		await sweeper.stop();
	});

	it('logs an error in one repair and continues with the next finding', async () => {
		const logger = makeLogger();
		const repair = makeStepRepair();
		const error = new Error('write failed');
		vi.mocked(repair.apply).mockRejectedValueOnce(error);
		const sweeper = new ReconciliationSweeper(
			[makeStepDetector([stepFinding('step-a'), stepFinding('step-b')])],
			{ 'step-queued-no-message': repair },
			logger,
		);

		sweeper.start();
		await vi.advanceTimersByTimeAsync(INTERVAL_MS);

		expect(repair.apply).toHaveBeenCalledTimes(2);
		expect(logger.error).toHaveBeenCalledWith('Reconciliation repair failed', {
			finding: stepFinding('step-a'),
			error,
		});
		await sweeper.stop();
	});

	it('logs an error in a detector, and keeps that detector and the others running', async () => {
		const logger = makeLogger();
		const failing = makeStepDetector();
		const error = new Error('read failed');
		vi.mocked(failing.detect).mockRejectedValueOnce(error);
		const healthy = makeExecutionDetector();
		const sweeper = new ReconciliationSweeper(
			[failing, healthy],
			{
				'step-queued-no-message': makeStepRepair(),
				'execution-queued-no-message': makeExecutionRepair(),
			},
			logger,
		);

		sweeper.start();
		await vi.advanceTimersByTimeAsync(INTERVAL_MS * 2);

		expect(logger.error).toHaveBeenCalledWith('Reconciliation pass failed', {
			detector: 'queued steps',
			error,
		});
		expect(failing.detect).toHaveBeenCalledTimes(2);
		expect(healthy.detect).toHaveBeenCalledTimes(2);
		await sweeper.stop();
	});

	it('logs a finding whose kind has no repair, and continues', async () => {
		const logger = makeLogger();
		const repair = makeStepRepair();
		const detector = makeStepDetector();
		vi.mocked(detector.detect).mockResolvedValueOnce([
			executionFinding('exec-1'),
			stepFinding('step-a'),
		]);
		const sweeper = new ReconciliationSweeper(
			[detector],
			{ 'step-queued-no-message': repair },
			logger,
		);

		sweeper.start();
		await vi.advanceTimersByTimeAsync(INTERVAL_MS);

		expect(logger.error).toHaveBeenCalledWith('Reconciliation finding has no repair', {
			finding: executionFinding('exec-1'),
		});
		expect(repair.apply).toHaveBeenCalledWith(stepFinding('step-a'), expect.any(Date));
		await sweeper.stop();
	});

	it('logs the counts of a pass that found rows', async () => {
		const logger = makeLogger();
		const repair = makeStepRepair();
		vi.mocked(repair.apply)
			.mockResolvedValueOnce(true)
			.mockResolvedValueOnce(false)
			.mockRejectedValueOnce(new Error('write failed'));
		const sweeper = new ReconciliationSweeper(
			[makeStepDetector([stepFinding('a'), stepFinding('b'), stepFinding('c')])],
			{ 'step-queued-no-message': repair },
			logger,
		);

		sweeper.start();
		await vi.advanceTimersByTimeAsync(INTERVAL_MS);

		expect(logger.info).toHaveBeenCalledWith('Reconciliation pass repaired stuck rows', {
			detector: 'queued steps',
			found: 3,
			repaired: 1,
			unchanged: 1,
			failed: 1,
		});
		await sweeper.stop();
	});

	it('does not log a pass that found no row', async () => {
		const logger = makeLogger();
		const sweeper = new ReconciliationSweeper(
			[makeStepDetector()],
			{ 'step-queued-no-message': makeStepRepair() },
			logger,
		);

		sweeper.start();
		await vi.advanceTimersByTimeAsync(INTERVAL_MS);

		expect(logger.info).not.toHaveBeenCalled();
		await sweeper.stop();
	});

	it('stop waits for the pass in progress, and no pass starts after it', async () => {
		const pending = deferred<boolean>();
		const repair = makeStepRepair();
		vi.mocked(repair.apply).mockReturnValueOnce(pending.promise);
		const detector = makeStepDetector([stepFinding('step-a'), stepFinding('step-b')]);
		const sweeper = new ReconciliationSweeper(
			[detector],
			{ 'step-queued-no-message': repair },
			makeLogger(),
		);
		sweeper.start();
		await vi.advanceTimersByTimeAsync(INTERVAL_MS);

		let stopped = false;
		const stopping = sweeper.stop().then(() => {
			stopped = true;
		});
		await vi.advanceTimersByTimeAsync(0);
		expect(stopped).toBe(false);

		pending.resolve(true);
		await stopping;

		// The repair in progress ends, and the sweeper does not start the next one.
		expect(repair.apply).toHaveBeenCalledTimes(1);
		await vi.advanceTimersByTimeAsync(INTERVAL_MS * 3);
		expect(detector.detect).toHaveBeenCalledTimes(1);
		expect(vi.getTimerCount()).toBe(0);
	});
});

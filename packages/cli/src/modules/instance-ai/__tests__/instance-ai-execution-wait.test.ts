import {
	ENGINE_V2_POLL_INTERVAL_MS,
	pollEngineV2Execution,
	waitForEngineV2Execution,
} from '../instance-ai-execution-wait';

/** Returns each status in turn, then the last one forever. */
function statusSequence(...statuses: Array<string | undefined>) {
	let call = 0;
	return vi.fn(async () => statuses[Math.min(call++, statuses.length - 1)]);
}

describe('waitForEngineV2Execution', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('completes once the execution settles, without a stop', async () => {
		const readStatus = statusSequence('new', 'running', 'success');
		const stop = vi.fn();

		const outcome = waitForEngineV2Execution({ readStatus, stop, timeoutMs: 60_000 });
		await vi.advanceTimersByTimeAsync(ENGINE_V2_POLL_INTERVAL_MS * 3);

		await expect(outcome).resolves.toEqual({ kind: 'completed' });
		expect(readStatus).toHaveBeenCalledTimes(3);
		expect(stop).not.toHaveBeenCalled();
	});

	it.each(['error', 'canceled', 'waiting'])('treats the %s status as settled', async (status) => {
		const stop = vi.fn();

		await expect(
			waitForEngineV2Execution({ readStatus: statusSequence(status), stop, timeoutMs: 1_000 }),
		).resolves.toEqual({ kind: 'completed' });
		expect(stop).not.toHaveBeenCalled();
	});

	it('stops the execution when the time runs out', async () => {
		const stop = vi.fn().mockResolvedValue(undefined);

		const outcome = waitForEngineV2Execution({
			readStatus: statusSequence('running'),
			stop,
			timeoutMs: 1_000,
		});
		await vi.advanceTimersByTimeAsync(1_500);

		await expect(outcome).resolves.toEqual({
			kind: 'cancelled',
			reason: 'timeout',
			message: 'Execution timed out after 1000ms and was cancelled',
		});
		expect(stop).toHaveBeenCalledTimes(1);
	});

	it('keeps polling while the execution is not readable yet', async () => {
		const readStatus = statusSequence(undefined, undefined, 'success');

		const outcome = waitForEngineV2Execution({ readStatus, stop: vi.fn(), timeoutMs: 60_000 });
		await vi.advanceTimersByTimeAsync(ENGINE_V2_POLL_INTERVAL_MS * 3);

		await expect(outcome).resolves.toEqual({ kind: 'completed' });
	});

	it('stops the execution when the signal aborts, without waiting for the next poll', async () => {
		const controller = new AbortController();
		const stop = vi.fn().mockResolvedValue(undefined);
		const readStatus = statusSequence('running');

		const outcome = waitForEngineV2Execution({
			readStatus,
			stop,
			timeoutMs: 60_000,
			abortSignal: controller.signal,
		});
		await vi.advanceTimersByTimeAsync(0);
		controller.abort();
		await vi.advanceTimersByTimeAsync(0);

		await expect(outcome).resolves.toEqual({
			kind: 'cancelled',
			reason: 'abort',
			message: 'Execution was cancelled',
		});
		expect(stop).toHaveBeenCalledTimes(1);
	});

	it('stops at once when the signal aborted before the wait', async () => {
		const controller = new AbortController();
		controller.abort();
		const stop = vi.fn().mockResolvedValue(undefined);

		await expect(
			waitForEngineV2Execution({
				readStatus: statusSequence('running'),
				stop,
				timeoutMs: 60_000,
				abortSignal: controller.signal,
			}),
		).resolves.toMatchObject({ kind: 'cancelled', reason: 'abort' });
		expect(stop).toHaveBeenCalledTimes(1);
	});

	it('stops the execution when the time runs out during a stalled read', async () => {
		const stop = vi.fn().mockResolvedValue(undefined);
		const readStatus = vi.fn(async () => await new Promise<string>(() => {}));

		const outcome = waitForEngineV2Execution({ readStatus, stop, timeoutMs: 1_000 });
		await vi.advanceTimersByTimeAsync(1_000);

		await expect(outcome).resolves.toMatchObject({ kind: 'cancelled', reason: 'timeout' });
		expect(readStatus).toHaveBeenCalledTimes(1);
		expect(stop).toHaveBeenCalledTimes(1);
	});

	it('stops the execution when the signal aborts during a stalled read', async () => {
		const controller = new AbortController();
		const stop = vi.fn().mockResolvedValue(undefined);
		const readStatus = vi.fn(async () => await new Promise<string>(() => {}));

		const outcome = waitForEngineV2Execution({
			readStatus,
			stop,
			timeoutMs: 60_000,
			abortSignal: controller.signal,
		});
		await vi.advanceTimersByTimeAsync(0);
		controller.abort();
		await vi.advanceTimersByTimeAsync(0);

		await expect(outcome).resolves.toMatchObject({ kind: 'cancelled', reason: 'abort' });
		expect(stop).toHaveBeenCalledTimes(1);
	});

	it('ignores a stalled read that rejects after the wait gave up', async () => {
		let rejectRead: (error: Error) => void = () => {};
		const readStatus = vi.fn(
			async () =>
				await new Promise<string>((_, reject) => {
					rejectRead = reject;
				}),
		);

		const outcome = waitForEngineV2Execution({ readStatus, stop: vi.fn(), timeoutMs: 1_000 });
		await vi.advanceTimersByTimeAsync(1_000);
		await expect(outcome).resolves.toMatchObject({ kind: 'cancelled', reason: 'timeout' });

		// An unhandled rejection here would fail the test run.
		rejectRead(new Error('data plane went away'));
		await vi.advanceTimersByTimeAsync(0);
	});

	it('passes on an error from a read that ends before the deadline', async () => {
		const stop = vi.fn();
		const readStatus = vi.fn().mockRejectedValue(new Error('data plane error'));

		await expect(waitForEngineV2Execution({ readStatus, stop, timeoutMs: 1_000 })).rejects.toThrow(
			'data plane error',
		);
		expect(stop).not.toHaveBeenCalled();
	});

	it('reports the cancellation when the stop fails because the run settled first', async () => {
		const stop = vi.fn().mockRejectedValue(new Error('already finished'));

		const outcome = waitForEngineV2Execution({
			readStatus: statusSequence('running'),
			stop,
			timeoutMs: 500,
		});
		await vi.advanceTimersByTimeAsync(1_000);

		await expect(outcome).resolves.toMatchObject({ kind: 'cancelled', reason: 'timeout' });
	});
});

describe('pollEngineV2Execution', () => {
	it('reports the timeout without a stop', async () => {
		vi.useFakeTimers();
		try {
			const outcome = pollEngineV2Execution({
				readStatus: statusSequence('running'),
				timeoutMs: 500,
			});
			await vi.advanceTimersByTimeAsync(1_000);

			await expect(outcome).resolves.toBe('timeout');
		} finally {
			vi.useRealTimers();
		}
	});
});

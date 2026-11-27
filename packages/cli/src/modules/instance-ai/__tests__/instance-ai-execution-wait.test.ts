import { ENGINE_V2_POLL_INTERVAL_MS, pollEngineV2Execution } from '../instance-ai-execution-wait';

/** Returns each status in turn, then the last one forever. */
function statusSequence(...statuses: Array<string | undefined>) {
	let call = 0;
	return vi.fn(async () => statuses[Math.min(call++, statuses.length - 1)]);
}

const stalledRead = () => vi.fn(async () => await new Promise<string>(() => {}));

describe('pollEngineV2Execution', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('reports a settled execution once its status settles', async () => {
		const readStatus = statusSequence('new', 'running', 'success');

		const outcome = pollEngineV2Execution({ readStatus, timeoutMs: 60_000 });
		await vi.advanceTimersByTimeAsync(ENGINE_V2_POLL_INTERVAL_MS * 3);

		await expect(outcome).resolves.toBe('settled');
		expect(readStatus).toHaveBeenCalledTimes(3);
	});

	it.each(['error', 'canceled', 'waiting'])('treats the %s status as settled', async (status) => {
		await expect(
			pollEngineV2Execution({ readStatus: statusSequence(status), timeoutMs: 1_000 }),
		).resolves.toBe('settled');
	});

	it('reports the timeout', async () => {
		const outcome = pollEngineV2Execution({
			readStatus: statusSequence('running'),
			timeoutMs: 500,
		});
		await vi.advanceTimersByTimeAsync(1_000);

		await expect(outcome).resolves.toBe('timeout');
	});

	it('keeps polling while the execution is not readable yet', async () => {
		const readStatus = statusSequence(undefined, undefined, 'success');

		const outcome = pollEngineV2Execution({ readStatus, timeoutMs: 60_000 });
		await vi.advanceTimersByTimeAsync(ENGINE_V2_POLL_INTERVAL_MS * 3);

		await expect(outcome).resolves.toBe('settled');
	});

	it.each([
		['between two reads', () => statusSequence('running')],
		['during a stalled read', stalledRead],
	])('reports the abort when the signal aborts %s', async (_name, createReadStatus) => {
		const controller = new AbortController();

		const outcome = pollEngineV2Execution({
			readStatus: createReadStatus(),
			timeoutMs: 60_000,
			abortSignal: controller.signal,
		});
		await vi.advanceTimersByTimeAsync(0);
		controller.abort();
		await vi.advanceTimersByTimeAsync(0);

		await expect(outcome).resolves.toBe('abort');
	});

	it('reports the abort at once when the signal aborted before the poll', async () => {
		const readStatus = statusSequence('running');

		await expect(
			pollEngineV2Execution({ readStatus, timeoutMs: 60_000, abortSignal: AbortSignal.abort() }),
		).resolves.toBe('abort');
		expect(readStatus).not.toHaveBeenCalled();
	});

	it('reports the timeout during a stalled read', async () => {
		const readStatus = stalledRead();

		const outcome = pollEngineV2Execution({ readStatus, timeoutMs: 1_000 });
		await vi.advanceTimersByTimeAsync(1_000);

		await expect(outcome).resolves.toBe('timeout');
		expect(readStatus).toHaveBeenCalledTimes(1);
	});

	it('ignores a stalled read that rejects after the poll gave up', async () => {
		let rejectRead: (error: Error) => void = () => {};
		const readStatus = vi.fn(
			async () =>
				await new Promise<string>((_, reject) => {
					rejectRead = reject;
				}),
		);

		const outcome = pollEngineV2Execution({ readStatus, timeoutMs: 1_000 });
		await vi.advanceTimersByTimeAsync(1_000);
		await expect(outcome).resolves.toBe('timeout');

		// An unhandled rejection here would fail the test run.
		rejectRead(new Error('data plane went away'));
		await vi.advanceTimersByTimeAsync(0);
	});

	it('passes on an error from a read that ends before the deadline', async () => {
		const readStatus = vi.fn().mockRejectedValue(new Error('data plane error'));

		await expect(pollEngineV2Execution({ readStatus, timeoutMs: 1_000 })).rejects.toThrow(
			'data plane error',
		);
	});
});

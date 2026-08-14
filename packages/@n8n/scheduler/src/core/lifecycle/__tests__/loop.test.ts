import { Loop } from '../loop';
import type { LoopOptions } from '../loop';

const INTERVAL_MS = 10_000;
const JITTER_RATIO = 0.1;
const TIMEOUT_MS = 60_000;

describe('Loop', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	/**
	 * A sequential loop over `pass` with a scripted random sequence (defaults
	 * to midpoint = half-interval phase, no jitter) and a timeout far beyond
	 * what any non-timeout test advances.
	 */
	function makeLoop(
		pass: (signal: AbortSignal) => Promise<unknown>,
		randoms: number[] = [],
		options: Partial<LoopOptions> = {},
	) {
		const hooks = { onError: vi.fn(), onTimeout: vi.fn(), onSkippedTick: vi.fn() };
		const random = vi.fn(() => randoms.shift() ?? 0.5);
		const loop = new Loop(
			pass,
			{
				intervalMs: INTERVAL_MS,
				jitterRatio: JITTER_RATIO,
				timeoutMs: TIMEOUT_MS,
				concurrency: 'sequential',
				maxConcurrent: 10,
				...options,
			},
			hooks,
			random,
		);
		return { loop, ...hooks };
	}

	/** A pass that hangs until the test resolves it. */
	function hangingPass() {
		const finishers: Array<() => void> = [];
		const pass = vi.fn(
			async () =>
				await new Promise<void>((resolve) => {
					finishers.push(resolve);
				}),
		);
		return { pass, finish: (index = 0) => finishers[index]() };
	}

	it('fires the first tick at a random phase within one interval', async () => {
		const pass = vi.fn().mockResolvedValue(undefined);
		const { loop } = makeLoop(pass, [0.25]);

		loop.start();
		await vi.advanceTimersByTimeAsync(2499);
		expect(pass).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(1);
		expect(pass).toHaveBeenCalledTimes(1);

		await loop.stop();
	});

	it('jitters each tick around its fixed slot without accumulating', async () => {
		const pass = vi.fn().mockResolvedValue(undefined);
		// Phase 0.5 anchors slots at 5000, 15000, 25000. Random 1 pushes the
		// second tick to 16000; midpoint puts the third back on 25000 exactly —
		// a drift-based cadence would land it at 26000.
		const { loop } = makeLoop(pass, [0.5, 1, 0.5]);

		loop.start();
		await vi.advanceTimersByTimeAsync(5000);
		expect(pass).toHaveBeenCalledTimes(1);

		await vi.advanceTimersByTimeAsync(10_999);
		expect(pass).toHaveBeenCalledTimes(1);
		await vi.advanceTimersByTimeAsync(1);
		expect(pass).toHaveBeenCalledTimes(2);

		await vi.advanceTimersByTimeAsync(8999);
		expect(pass).toHaveBeenCalledTimes(2);
		await vi.advanceTimersByTimeAsync(1);
		expect(pass).toHaveBeenCalledTimes(3);

		await loop.stop();
	});

	it('keeps ticks on the fixed timeline while passes outlast the interval (concurrent)', async () => {
		const pass = vi.fn(
			async () =>
				await new Promise<void>((resolve) => {
					setTimeout(resolve, INTERVAL_MS * 1.2);
				}),
		);
		const { loop, onSkippedTick } = makeLoop(pass, [], { concurrency: 'concurrent' });

		loop.start();
		await vi.advanceTimersByTimeAsync(5000);
		expect(pass).toHaveBeenCalledTimes(1);

		// Slots 15000 and 25000 fire on time although earlier passes still run.
		await vi.advanceTimersByTimeAsync(INTERVAL_MS);
		expect(pass).toHaveBeenCalledTimes(2);
		await vi.advanceTimersByTimeAsync(INTERVAL_MS);
		expect(pass).toHaveBeenCalledTimes(3);
		expect(onSkippedTick).not.toHaveBeenCalled();

		const stopping = loop.stop();
		await vi.advanceTimersByTimeAsync(2 * INTERVAL_MS);
		await stopping;
	});

	it('drops a tick that would overlap the in-flight pass in sequential mode', async () => {
		const { pass, finish } = hangingPass();
		const { loop, onSkippedTick } = makeLoop(pass);

		loop.start();
		await vi.advanceTimersByTimeAsync(5000);
		expect(pass).toHaveBeenCalledTimes(1);

		// The 15000 slot finds the first pass still running: dropped, not queued.
		await vi.advanceTimersByTimeAsync(INTERVAL_MS);
		expect(pass).toHaveBeenCalledTimes(1);
		expect(onSkippedTick).toHaveBeenCalledWith({ inFlight: 1, limit: 1 });

		// Once the pass settles, the 25000 slot runs on the unshifted timeline.
		finish();
		await vi.advanceTimersByTimeAsync(INTERVAL_MS);
		expect(pass).toHaveBeenCalledTimes(2);

		finish(1);
		await loop.stop();
	});

	it('caps overlapping passes at maxConcurrent and drops the excess tick', async () => {
		const { pass, finish } = hangingPass();
		const { loop, onSkippedTick } = makeLoop(pass, [], {
			concurrency: 'concurrent',
			maxConcurrent: 2,
		});

		loop.start();
		await vi.advanceTimersByTimeAsync(5000 + INTERVAL_MS);
		expect(pass).toHaveBeenCalledTimes(2);

		await vi.advanceTimersByTimeAsync(INTERVAL_MS);
		expect(pass).toHaveBeenCalledTimes(2);
		expect(onSkippedTick).toHaveBeenCalledWith({ inFlight: 2, limit: 2 });

		finish(0);
		finish(1);
		await loop.stop();
	});

	it('frees a timed-out slot while other concurrent passes keep running', async () => {
		const pass = vi.fn(async () => await new Promise<void>(() => {})); // every pass hangs
		const { loop, onTimeout, onSkippedTick } = makeLoop(pass, [], {
			concurrency: 'concurrent',
			maxConcurrent: 2,
			timeoutMs: 12_000,
		});

		loop.start();
		// Slots 5000 and 15000 fill both slots; the first pass times out at 17000.
		await vi.advanceTimersByTimeAsync(5000 + INTERVAL_MS + 2000);
		expect(pass).toHaveBeenCalledTimes(2);
		expect(onTimeout).toHaveBeenCalledTimes(1);

		// Its freed slot lets the 25000 tick run although the second pass still hangs.
		await vi.advanceTimersByTimeAsync(8000);
		expect(pass).toHaveBeenCalledTimes(3);
		expect(onSkippedTick).not.toHaveBeenCalled();

		// Stop drains the remaining hung passes at their own timeouts (27000, 37000).
		const stopping = loop.stop();
		await vi.advanceTimersByTimeAsync(12_000);
		await stopping;
		expect(onTimeout).toHaveBeenCalledTimes(3);
	});

	it('recovers from a pile-up: dropped ticks resume once in-flight passes settle', async () => {
		const { pass, finish } = hangingPass();
		const { loop, onSkippedTick } = makeLoop(pass, [], {
			concurrency: 'concurrent',
			maxConcurrent: 2,
		});

		loop.start();
		// Slots 5000 and 15000 fill both slots; 25000 and 35000 pile up and drop.
		await vi.advanceTimersByTimeAsync(5000 + 3 * INTERVAL_MS);
		expect(pass).toHaveBeenCalledTimes(2);
		expect(onSkippedTick).toHaveBeenCalledTimes(2);

		finish(0);
		finish(1);
		// The next slot (45000) runs again, exactly on the unshifted timeline.
		await vi.advanceTimersByTimeAsync(INTERVAL_MS - 1);
		expect(pass).toHaveBeenCalledTimes(2);
		await vi.advanceTimersByTimeAsync(1);
		expect(pass).toHaveBeenCalledTimes(3);

		finish(2);
		await loop.stop();
	});

	it('abandons a pass at its timeout: reports it, aborts its signal, frees its slot', async () => {
		let signal: AbortSignal | undefined;
		const pass = vi.fn(async (passSignal: AbortSignal) => {
			signal = passSignal;
			return await new Promise<void>(() => {}); // never settles
		});
		const { loop, onTimeout, onError } = makeLoop(pass, [], { timeoutMs: 3000 });

		loop.start();
		await vi.advanceTimersByTimeAsync(5000);
		expect(pass).toHaveBeenCalledTimes(1);
		expect(signal?.aborted).toBe(false);

		await vi.advanceTimersByTimeAsync(3000);
		expect(onTimeout).toHaveBeenCalledWith({ timeoutMs: 3000 });
		expect(signal?.aborted).toBe(true);

		// The slot is free again: the next tick runs a fresh pass on time.
		await vi.advanceTimersByTimeAsync(INTERVAL_MS - 3000);
		expect(pass).toHaveBeenCalledTimes(2);
		expect(onError).not.toHaveBeenCalled();

		// Stop drains the second hung pass, which settles at its own timeout.
		const stopping = loop.stop();
		await vi.advanceTimersByTimeAsync(3000);
		await stopping;
	});

	it('does not report a timeout for a pass that settles in time', async () => {
		const pass = vi.fn(
			async () =>
				await new Promise<void>((resolve) => {
					setTimeout(resolve, 1000);
				}),
		);
		const { loop, onTimeout } = makeLoop(pass, [], { timeoutMs: 3000 });

		loop.start();
		await vi.advanceTimersByTimeAsync(5000 + INTERVAL_MS);
		expect(pass).toHaveBeenCalledTimes(2);
		expect(onTimeout).not.toHaveBeenCalled();

		// Stop drains the second pass, whose duration timer only fires on fake time.
		const stopping = loop.stop();
		await vi.advanceTimersByTimeAsync(1000);
		await stopping;
		expect(onTimeout).not.toHaveBeenCalled();
	});

	it('discards the late rejection of an abandoned pass', async () => {
		const pass = vi.fn(
			async () =>
				await new Promise<void>((_, reject) => {
					setTimeout(() => reject(new Error('too late')), 5000);
				}),
		);
		const { loop, onTimeout, onError } = makeLoop(pass, [], { timeoutMs: 3000 });

		loop.start();
		await vi.advanceTimersByTimeAsync(5000 + 3000);
		expect(onTimeout).toHaveBeenCalledTimes(1);

		// The pass rejects 2000ms after its abandonment; nobody reports it twice.
		await vi.advanceTimersByTimeAsync(2000);
		expect(onError).not.toHaveBeenCalled();

		await loop.stop();
	});

	it('reports a failing pass and keeps the timeline', async () => {
		const boom = new Error('storage down');
		const pass = vi.fn().mockRejectedValueOnce(boom).mockResolvedValue(undefined);
		const { loop, onError } = makeLoop(pass);

		loop.start();
		await vi.advanceTimersByTimeAsync(5000);
		expect(pass).toHaveBeenCalledTimes(1);
		expect(onError).toHaveBeenCalledWith(boom);

		await vi.advanceTimersByTimeAsync(INTERVAL_MS);
		expect(pass).toHaveBeenCalledTimes(2);

		await loop.stop();
	});

	it('skips slots a stall left behind instead of replaying them as a burst', async () => {
		const pass = vi.fn().mockResolvedValue(undefined);
		const { loop } = makeLoop(pass, [], { jitterRatio: 0 });
		const startedAt = Date.now();

		loop.start();
		// The process stalls across four slots (5000, 15000, 25000, 35000, 45000)
		// before the first tick's timer gets to fire.
		vi.setSystemTime(startedAt + 45_000);
		await vi.advanceTimersByTimeAsync(5000);
		expect(pass).toHaveBeenCalledTimes(1);

		// No catch-up burst: the next tick is the next future slot, 55000.
		await vi.advanceTimersByTimeAsync(4999);
		expect(pass).toHaveBeenCalledTimes(1);
		await vi.advanceTimersByTimeAsync(1);
		expect(pass).toHaveBeenCalledTimes(2);

		await loop.stop();
	});

	it('start is idempotent while running', async () => {
		const pass = vi.fn().mockResolvedValue(undefined);
		const { loop } = makeLoop(pass);

		loop.start();
		loop.start();
		await vi.advanceTimersByTimeAsync(5000 + INTERVAL_MS);

		expect(pass).toHaveBeenCalledTimes(2);

		await loop.stop();
	});

	it('stop cancels a pending tick', async () => {
		const pass = vi.fn().mockResolvedValue(undefined);
		const { loop } = makeLoop(pass);

		loop.start();
		await loop.stop();
		await vi.advanceTimersByTimeAsync(10 * INTERVAL_MS);

		expect(pass).not.toHaveBeenCalled();
	});

	it('stop waits out an in-flight pass and nothing fires after', async () => {
		const { pass, finish } = hangingPass();
		const { loop } = makeLoop(pass);

		loop.start();
		await vi.advanceTimersByTimeAsync(5000);
		expect(pass).toHaveBeenCalledTimes(1);

		let stopResolved = false;
		const stopping = loop.stop().then(() => {
			stopResolved = true;
		});
		await Promise.resolve();
		expect(stopResolved).toBe(false);

		finish();
		await stopping;
		await vi.advanceTimersByTimeAsync(10 * INTERVAL_MS);
		expect(pass).toHaveBeenCalledTimes(1);
	});

	it('stop aborts in-flight passes; a cancellation rejection is not reported as a failure', async () => {
		// A signal-aware pass: it winds down the moment it observes the abort.
		const pass = vi.fn(
			async (signal: AbortSignal) =>
				await new Promise((_, reject) => {
					signal.addEventListener('abort', () => reject(new Error('cancelled')));
				}),
		);
		const { loop, onError, onTimeout } = makeLoop(pass);

		loop.start();
		await vi.advanceTimersByTimeAsync(5000);
		expect(pass).toHaveBeenCalledTimes(1);

		// Resolves without advancing time: the pass settles on the abort itself.
		await loop.stop();
		expect(onError).not.toHaveBeenCalled();
		expect(onTimeout).not.toHaveBeenCalled();
	});

	it('stop resolves once a hung pass times out instead of waiting forever', async () => {
		const pass = vi.fn(async () => await new Promise<void>(() => {}));
		const { loop, onTimeout } = makeLoop(pass, [], { timeoutMs: 3000 });

		loop.start();
		await vi.advanceTimersByTimeAsync(5000);
		expect(pass).toHaveBeenCalledTimes(1);

		let stopResolved = false;
		const stopping = loop.stop().then(() => {
			stopResolved = true;
		});
		await vi.advanceTimersByTimeAsync(2999);
		expect(stopResolved).toBe(false);

		await vi.advanceTimersByTimeAsync(1);
		await stopping;
		expect(onTimeout).toHaveBeenCalledTimes(1);
	});

	it('a stopped loop cannot be restarted', async () => {
		const pass = vi.fn().mockResolvedValue(undefined);
		const { loop } = makeLoop(pass);

		await loop.stop();
		loop.start();
		await vi.advanceTimersByTimeAsync(10 * INTERVAL_MS);

		expect(pass).not.toHaveBeenCalled();
	});
});

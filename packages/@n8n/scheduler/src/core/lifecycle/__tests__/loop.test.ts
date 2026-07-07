import { Loop } from '../loop';

const INTERVAL_MS = 10_000;
const JITTER_RATIO = 0.1;

describe('Loop', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	/** A loop over `pass` with a scripted random sequence (defaults to midpoint = no jitter). */
	function makeLoop(pass: () => Promise<unknown>, randoms: number[] = []) {
		const onError = vi.fn();
		const random = vi.fn(() => randoms.shift() ?? 0.5);
		const loop = new Loop(pass, INTERVAL_MS, JITTER_RATIO, onError, random);
		return { loop, onError };
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

	it('jitters each subsequent delay around the interval', async () => {
		const pass = vi.fn().mockResolvedValue(undefined);
		// Phase 0.5 => first tick at 5000; random 1 => next delay interval·1.1.
		const { loop } = makeLoop(pass, [0.5, 1]);

		loop.start();
		await vi.advanceTimersByTimeAsync(5000);
		expect(pass).toHaveBeenCalledTimes(1);

		await vi.advanceTimersByTimeAsync(10_999);
		expect(pass).toHaveBeenCalledTimes(1);

		await vi.advanceTimersByTimeAsync(1);
		expect(pass).toHaveBeenCalledTimes(2);

		await loop.stop();
	});

	it('reports a failing pass and keeps the cadence', async () => {
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
		let finish!: () => void;
		const pass = vi.fn(
			async () =>
				await new Promise<void>((resolve) => {
					finish = resolve;
				}),
		);
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

	it('a stopped loop cannot be restarted', async () => {
		const pass = vi.fn().mockResolvedValue(undefined);
		const { loop } = makeLoop(pass);

		await loop.stop();
		loop.start();
		await vi.advanceTimersByTimeAsync(10 * INTERVAL_MS);

		expect(pass).not.toHaveBeenCalled();
	});
});

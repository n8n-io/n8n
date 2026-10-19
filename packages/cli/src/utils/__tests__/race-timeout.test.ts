import { raceTimeout, TIMED_OUT } from '../race-timeout';

describe('raceTimeout', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.useRealTimers();
	});

	it('returns the promise value and clears the deadline before it expires', async () => {
		const clearTimer = vi.spyOn(global, 'clearTimeout');
		const value = { id: 1 };
		const outcome = raceTimeout(Promise.resolve(value), 100);
		expect(vi.getTimerCount()).toBe(1);

		await expect(outcome).resolves.toBe(value);

		expect(clearTimer).toHaveBeenCalledTimes(1);
		expect(vi.getTimerCount()).toBe(0);
	});

	it('returns TIMED_OUT at the deadline and clears the timer', async () => {
		const clearTimer = vi.spyOn(global, 'clearTimeout');
		const settled = vi.fn();
		const outcome = raceTimeout(new Promise<string>(() => {}), 100);
		void outcome.then(settled);

		await vi.advanceTimersByTimeAsync(99);
		expect(settled).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(1);

		await expect(outcome).resolves.toBe(TIMED_OUT);
		expect(clearTimer).toHaveBeenCalledTimes(1);
		expect(vi.getTimerCount()).toBe(0);
	});

	it('preserves the rejection and clears the deadline', async () => {
		const error = new Error('work failed');
		const outcome = raceTimeout(Promise.reject(error), 100);

		await expect(outcome).rejects.toBe(error);

		expect(vi.getTimerCount()).toBe(0);
	});

	it('does not keep the event loop open for the deadline', async () => {
		const createTimer = vi.spyOn(global, 'setTimeout');
		const outcome = raceTimeout(Promise.resolve('done'), 100);
		const timer = createTimer.mock.results[0].value;

		expect(timer.hasRef()).toBe(false);
		await expect(outcome).resolves.toBe('done');
	});
});

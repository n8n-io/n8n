import { raceTimeout, TIMED_OUT } from '../race-timeout';

describe('raceTimeout', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should resolve with the raced promise when it settles first', async () => {
		let resolvePromise: (value: string) => void = () => {};
		const promise = new Promise<string>((resolve) => {
			resolvePromise = resolve;
		});

		const raced = raceTimeout(promise, 1000);
		await vi.advanceTimersByTimeAsync(999);
		resolvePromise('done');

		await expect(raced).resolves.toBe('done');
		expect(vi.getTimerCount()).toBe(0);
	});

	it('should reject when the raced promise rejects first', async () => {
		const raced = raceTimeout(Promise.reject(new Error('failed')), 1000);

		await expect(raced).rejects.toThrow('failed');
		expect(vi.getTimerCount()).toBe(0);
	});

	it('should resolve with TIMED_OUT when the timeout elapses first', async () => {
		const raced = raceTimeout(new Promise(() => {}), 1000);
		await vi.advanceTimersByTimeAsync(1000);

		await expect(raced).resolves.toBe(TIMED_OUT);
		expect(vi.getTimerCount()).toBe(0);
	});
});

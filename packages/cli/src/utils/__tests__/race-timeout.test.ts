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

	describe('when given a factory', () => {
		it('should arm the deadline before invoking it, so synchronous setup counts', async () => {
			const raced = raceTimeout(async () => {
				vi.advanceTimersByTime(1000); // setup burns the whole budget
				return await new Promise<string>(() => {});
			}, 1000);

			await expect(raced).resolves.toBe(TIMED_OUT);
			expect(vi.getTimerCount()).toBe(0);
		});

		it('should resolve with the returned promise when it settles first', async () => {
			const raced = raceTimeout(async () => await Promise.resolve('done'), 1000);

			await expect(raced).resolves.toBe('done');
			expect(vi.getTimerCount()).toBe(0);
		});

		it('should reject and clear the deadline when it throws synchronously', async () => {
			const raced = raceTimeout(() => {
				throw new Error('failed');
			}, 1000);

			await expect(raced).rejects.toThrow('failed');
			expect(vi.getTimerCount()).toBe(0);
		});
	});

	describe('unref option', () => {
		const armDeadline = (options?: { unref: boolean }) => {
			const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
			const raced = raceTimeout(new Promise(() => {}), 1000, options);
			const timer = setTimeoutSpy.mock.results[0].value as NodeJS.Timeout;
			// Restored while the fake timers are still installed, so the spy cannot
			// outlive the test.
			setTimeoutSpy.mockRestore();
			return { raced, timer };
		};

		it('should keep the deadline referenced by default', async () => {
			const { raced, timer } = armDeadline();

			expect(timer.hasRef()).toBe(true);

			await vi.advanceTimersByTimeAsync(1000);
			await expect(raced).resolves.toBe(TIMED_OUT);
		});

		it('should unref the deadline when asked', async () => {
			const { raced, timer } = armDeadline({ unref: true });

			expect(timer.hasRef()).toBe(false);

			await vi.advanceTimersByTimeAsync(1000);
			await expect(raced).resolves.toBe(TIMED_OUT);
		});
	});
});

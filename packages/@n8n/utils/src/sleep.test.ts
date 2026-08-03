import { sleep } from './sleep';

describe('sleep', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should resolve after the specified time when no abort signal is given', async () => {
		const onResolve = vi.fn();
		const sleepPromise = sleep(100).then(onResolve);

		await vi.advanceTimersByTimeAsync(99);
		expect(onResolve).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(1);
		await sleepPromise;
		expect(onResolve).toHaveBeenCalled();
	});

	it('should work without abort signal', async () => {
		const onResolve = vi.fn();
		const sleepPromise = sleep(100, undefined).then(onResolve);

		await vi.advanceTimersByTimeAsync(100);
		await sleepPromise;
		expect(onResolve).toHaveBeenCalled();
	});

	it('should reject immediately if abort signal is already aborted', async () => {
		const abortController = new AbortController();
		abortController.abort();

		await expect(sleep(1000, abortController.signal)).rejects.toThrow('Aborted');
	});

	it('should reject when abort signal is triggered during sleep', async () => {
		const abortController = new AbortController();
		const onSettled = vi.fn();

		const promise = sleep(1000, abortController.signal).catch(onSettled);

		await vi.advanceTimersByTimeAsync(50);
		abortController.abort();
		await promise;

		expect(onSettled).toHaveBeenCalledWith(expect.objectContaining({ message: 'Aborted' }));
	});

	it('should clean up timeout when aborted during sleep', async () => {
		const abortController = new AbortController();
		const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

		const sleepPromise = sleep(1000, abortController.signal);

		await vi.advanceTimersByTimeAsync(50);
		abortController.abort();

		await expect(sleepPromise).rejects.toThrow('Aborted');

		expect(clearTimeoutSpy).toHaveBeenCalled();

		clearTimeoutSpy.mockRestore();
	});
});

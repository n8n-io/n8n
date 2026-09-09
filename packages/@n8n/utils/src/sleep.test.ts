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

	it('should reject with the abort reason if abort signal is already aborted', async () => {
		const abortController = new AbortController();
		const reason = new Error('deadline');
		abortController.abort(reason);

		await expect(sleep(1000, abortController.signal)).rejects.toBe(reason);
	});

	it('should reject with the abort reason when abort signal is triggered during sleep', async () => {
		const abortController = new AbortController();
		const reason = new Error('deadline');
		const onSettled = vi.fn();

		const promise = sleep(1000, abortController.signal).catch(onSettled);

		await vi.advanceTimersByTimeAsync(50);
		abortController.abort(reason);
		await promise;

		expect(onSettled).toHaveBeenCalledWith(reason);
	});

	it('should reject with the default abort reason when none is given', async () => {
		const abortController = new AbortController();
		abortController.abort();

		await expect(sleep(1000, abortController.signal)).rejects.toThrow('This operation was aborted');
	});

	it('should clean up timeout when aborted during sleep', async () => {
		const abortController = new AbortController();
		const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

		const sleepPromise = sleep(1000, abortController.signal);

		await vi.advanceTimersByTimeAsync(50);
		abortController.abort();

		await expect(sleepPromise).rejects.toThrow('This operation was aborted');

		expect(clearTimeoutSpy).toHaveBeenCalled();

		clearTimeoutSpy.mockRestore();
	});

	it('should remove the abort listener when the sleep completes', async () => {
		const abortController = new AbortController();
		const removeListenerSpy = vi.spyOn(abortController.signal, 'removeEventListener');

		const sleepPromise = sleep(100, abortController.signal);

		await vi.advanceTimersByTimeAsync(100);
		await sleepPromise;

		expect(removeListenerSpy).toHaveBeenCalledWith('abort', expect.any(Function));
	});
});

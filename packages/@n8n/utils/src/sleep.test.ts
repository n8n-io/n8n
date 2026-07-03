import { sleep } from './sleep';

describe('sleep', () => {
	it('should resolve after the specified time when no abort signal is given', async () => {
		const start = Date.now();
		await sleep(100);
		const end = Date.now();
		const elapsed = end - start;

		// Allow some tolerance for timing
		expect(elapsed).toBeGreaterThanOrEqual(90);
		expect(elapsed).toBeLessThan(200);
	});

	it('should work without abort signal', async () => {
		const start = Date.now();
		await sleep(100, undefined);
		const end = Date.now();
		const elapsed = end - start;

		expect(elapsed).toBeGreaterThanOrEqual(90);
		expect(elapsed).toBeLessThan(200);
	});

	it('should reject immediately if abort signal is already aborted', async () => {
		const abortController = new AbortController();
		abortController.abort();

		await expect(sleep(1000, abortController.signal)).rejects.toThrow('Aborted');
	});

	it('should reject when abort signal is triggered during sleep', async () => {
		const abortController = new AbortController();

		// Start the sleep and abort after 50ms
		setTimeout(() => abortController.abort(), 50);

		const start = Date.now();
		await expect(sleep(1000, abortController.signal)).rejects.toThrow('Aborted');
		const end = Date.now();
		const elapsed = end - start;

		// Should have been aborted after ~50ms, not the full 1000ms
		expect(elapsed).toBeLessThan(200);
	});

	it('should clean up timeout when aborted during sleep', async () => {
		const abortController = new AbortController();
		const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

		// Start the sleep and abort after 50ms
		const sleepPromise = sleep(1000, abortController.signal);
		setTimeout(() => abortController.abort(), 50);

		await expect(sleepPromise).rejects.toThrow('Aborted');

		// clearTimeout should have been called to clean up
		expect(clearTimeoutSpy).toHaveBeenCalled();

		clearTimeoutSpy.mockRestore();
	});
});

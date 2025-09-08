import { ThrottledExecutor } from '../throttled-executor.service';

describe('ThrottledExecutor', () => {
	let throttledExecutor: ThrottledExecutor;
	let checkFn: jest.Mock;

	beforeEach(() => {
		throttledExecutor = new ThrottledExecutor(1000);
		checkFn = jest.fn().mockResolvedValue(undefined);
	});

	it('should execute check on first call', async () => {
		await throttledExecutor.executeIfNeeded(checkFn, new Date('2024-01-01T00:00:00Z'));
		expect(checkFn).toHaveBeenCalledTimes(1);
	});

	it('should skip check within cache duration', async () => {
		const time1 = new Date('2024-01-01T00:00:00Z');
		const time2 = new Date('2024-01-01T00:00:00.500Z'); // 500ms later

		await throttledExecutor.executeIfNeeded(checkFn, time1);
		await throttledExecutor.executeIfNeeded(checkFn, time2);

		expect(checkFn).toHaveBeenCalledTimes(1);
	});

	it('should execute check after cache duration', async () => {
		const time1 = new Date('2024-01-01T00:00:00Z');
		const time2 = new Date('2024-01-01T00:00:01.001Z'); // 1001ms later

		await throttledExecutor.executeIfNeeded(checkFn, time1);
		await throttledExecutor.executeIfNeeded(checkFn, time2);

		expect(checkFn).toHaveBeenCalledTimes(2);
	});

	it('should handle concurrent calls correctly', async () => {
		let resolveCheck: () => void;
		const checkPromise = new Promise<void>((resolve) => {
			resolveCheck = resolve;
		});

		const slowCheckFn = jest.fn().mockImplementation(async () => {
			await checkPromise;
		});

		const time = new Date('2024-01-01T00:00:00Z');

		// Start multiple concurrent calls
		const promise1 = throttledExecutor.executeIfNeeded(slowCheckFn, time);
		const promise2 = throttledExecutor.executeIfNeeded(slowCheckFn, time);
		const promise3 = throttledExecutor.executeIfNeeded(slowCheckFn, time);

		// Let promises start
		await new Promise((resolve) => setImmediate(resolve));

		// Resolve the check
		resolveCheck!();

		await Promise.all([promise1, promise2, promise3]);

		// Should only execute once
		expect(slowCheckFn).toHaveBeenCalledTimes(1);
	});
});

import { describe, it, expect, vi, afterEach } from 'vitest';

import { StepQueueService } from '../step-queue.service';

describe('StepQueueService', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('drain() should resolve immediately when no in-flight steps', async () => {
		const fakeDataSource = {} as never;
		const fakeProcessor = {} as never;
		const queue = new StepQueueService(fakeDataSource, fakeProcessor);

		await expect(queue.drain(1000)).resolves.toBeUndefined();
	});

	it('drain() should stop the poller', async () => {
		vi.useFakeTimers();

		const fakeDataSource = {} as never;
		const fakeProcessor = {} as never;
		const queue = new StepQueueService(fakeDataSource, fakeProcessor);
		queue.start();
		expect(queue.isRunning()).toBe(true);

		await queue.drain(1000);
		expect(queue.isRunning()).toBe(false);
	});

	it('drain() should wait for in-flight steps to complete', async () => {
		const fakeDataSource = {} as never;
		const fakeProcessor = {} as never;
		const queue = new StepQueueService(fakeDataSource, fakeProcessor);

		// Simulate an in-flight step by incrementing the counter directly
		(queue as unknown as { inFlight: number }).inFlight = 1;

		// Start drain, then "complete" the step after 50ms
		const drainPromise = queue.drain(5000);
		setTimeout(() => {
			(queue as unknown as { inFlight: number }).inFlight = 0;
		}, 50);

		await drainPromise;
		expect(queue.getInFlightCount()).toBe(0);
	});

	it('drain() should resolve after timeout even with in-flight steps', async () => {
		const fakeDataSource = {} as never;
		const fakeProcessor = {} as never;
		const queue = new StepQueueService(fakeDataSource, fakeProcessor);

		(queue as unknown as { inFlight: number }).inFlight = 1;

		const start = Date.now();
		await queue.drain(200); // short timeout
		const elapsed = Date.now() - start;

		expect(elapsed).toBeGreaterThanOrEqual(200);
		expect(queue.getInFlightCount()).toBe(1); // still in-flight
	});
});

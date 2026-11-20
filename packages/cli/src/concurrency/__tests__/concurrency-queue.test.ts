import { sleep } from '@n8n/utils/sleep';

import { ConcurrencyQueue } from '../concurrency-queue';

describe('ConcurrencyQueue', () => {
	beforeAll(() => {
		vi.useFakeTimers();
	});

	it('should limit concurrency', async () => {
		const queue = new ConcurrencyQueue(1);
		const state: Record<string, 'started' | 'finished'> = {};

		// eslint-disable-next-line @typescript-eslint/promise-function-async
		const sleepSpy = vi.fn(() => sleep(500));

		const testFn = async (item: { executionId: string }) => {
			await queue.enqueue(item.executionId);
			state[item.executionId] = 'started';
			await sleepSpy();
			queue.dequeue();
			state[item.executionId] = 'finished';
		};

		void Promise.all([
			testFn({ executionId: '1' }),
			testFn({ executionId: '2' }),
			testFn({ executionId: '3' }),
			testFn({ executionId: '4' }),
			testFn({ executionId: '5' }),
		]);

		// At T+0 seconds this method hasn't yielded to the event-loop, so no `testFn` calls are made
		expect(sleepSpy).toHaveBeenCalledTimes(0);
		expect(state).toEqual({});

		// At T+0.4 seconds the first `testFn` has been called, but hasn't resolved
		await vi.advanceTimersByTimeAsync(400);
		expect(sleepSpy).toHaveBeenCalledTimes(1);
		expect(state).toEqual({ 1: 'started' });

		// At T+0.5 seconds the first promise has resolved, and the second one has stared
		await vi.advanceTimersByTimeAsync(100);
		expect(sleepSpy).toHaveBeenCalledTimes(2);
		expect(state).toEqual({ 1: 'finished', 2: 'started' });

		// At T+1 seconds the first two promises have resolved, and the third one has stared
		await vi.advanceTimersByTimeAsync(500);
		expect(sleepSpy).toHaveBeenCalledTimes(3);
		expect(state).toEqual({ 1: 'finished', 2: 'finished', 3: 'started' });

		// Removing the fourth waiter must not release the fifth while the third is still running.
		queue.remove('4');
		expect(queue.getAll()).toEqual(new Set(['5']));
		await vi.advanceTimersByTimeAsync(1);
		expect(sleepSpy).toHaveBeenCalledTimes(3);
		expect(state).toEqual({ 1: 'finished', 2: 'finished', 3: 'started' });

		// The fifth promise starts only after the third execution releases its slot.
		await vi.advanceTimersByTimeAsync(499);
		expect(sleepSpy).toHaveBeenCalledTimes(3);
		expect(state).toEqual({ 1: 'finished', 2: 'finished', 3: 'started' });
		await vi.advanceTimersByTimeAsync(1);
		expect(sleepSpy).toHaveBeenCalledTimes(4);
		expect(state).toEqual({ 1: 'finished', 2: 'finished', 3: 'finished', 5: 'started' });

		// At T+2 seconds, every non-removed execution has finished.
		await vi.advanceTimersByTimeAsync(500);
		expect(sleepSpy).toHaveBeenCalledTimes(4);
		expect(state).toEqual({ 1: 'finished', 2: 'finished', 3: 'finished', 5: 'finished' });
	});

	it('should debounce emitting of the `concurrency-check` event', async () => {
		const queue = new ConcurrencyQueue(10);
		const emitSpy = vi.fn();
		queue.on('concurrency-check', emitSpy);

		// eslint-disable-next-line @typescript-eslint/promise-function-async
		Array.from({ length: 10 }, (_, i) => i).forEach(() => queue.enqueue('1'));

		expect(queue.currentCapacity).toBe(0);
		await vi.advanceTimersByTimeAsync(1000);
		expect(emitSpy).toHaveBeenCalledTimes(1);
	});
});

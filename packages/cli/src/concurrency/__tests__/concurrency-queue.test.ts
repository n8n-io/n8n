import { sleep } from 'n8n-workflow';

import { ConcurrencyQueue } from '../concurrency-queue';

describe('ConcurrencyQueue', () => {
	beforeAll(() => {
		jest.useFakeTimers();
	});

	it('should limit concurrency', async () => {
		const queue = new ConcurrencyQueue(1);
		const state: Record<string, 'started' | 'finished'> = {};

		// eslint-disable-next-line @typescript-eslint/promise-function-async
		const sleepSpy = jest.fn(() => sleep(500));

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
		await jest.advanceTimersByTimeAsync(400);
		expect(sleepSpy).toHaveBeenCalledTimes(1);
		expect(state).toEqual({ 1: 'started' });

		// At T+0.5 seconds the first promise has resolved, and the second one has stared
		await jest.advanceTimersByTimeAsync(100);
		expect(sleepSpy).toHaveBeenCalledTimes(2);
		expect(state).toEqual({ 1: 'finished', 2: 'started' });

		// At T+1 seconds the first two promises have resolved, and the third one has stared
		await jest.advanceTimersByTimeAsync(500);
		expect(sleepSpy).toHaveBeenCalledTimes(3);
		expect(state).toEqual({ 1: 'finished', 2: 'finished', 3: 'started' });

		// If the fourth promise is removed, its waiter is released and the fifth one starts.
		queue.remove('4');
		await jest.advanceTimersByTimeAsync(1);
		expect(sleepSpy).toHaveBeenCalledTimes(5);
		expect(state).toEqual({
			1: 'finished',
			2: 'finished',
			3: 'started',
			4: 'started',
			5: 'started',
		});

		// at T+5 seconds, all promises should be resolved
		await jest.advanceTimersByTimeAsync(4000);
		expect(sleepSpy).toHaveBeenCalledTimes(5);
		expect(state).toEqual({
			1: 'finished',
			2: 'finished',
			3: 'finished',
			4: 'finished',
			5: 'finished',
		});
	});

	it('should resolve the removed item promise', async () => {
		const queue = new ConcurrencyQueue(0);
		let resolved = false;

		const enqueuePromise = queue.enqueue('queued-execution').then(() => {
			resolved = true;
		});

		await jest.advanceTimersByTimeAsync(1);
		expect(resolved).toBe(false);

		queue.remove('queued-execution');
		await enqueuePromise;

		expect(resolved).toBe(true);
	});

	it('should debounce emitting of the `concurrency-check` event', async () => {
		const queue = new ConcurrencyQueue(10);
		const emitSpy = jest.fn();
		queue.on('concurrency-check', emitSpy);

		// eslint-disable-next-line @typescript-eslint/promise-function-async
		Array.from({ length: 10 }, (_, i) => i).forEach(() => queue.enqueue('1'));

		expect(queue.currentCapacity).toBe(0);
		await jest.advanceTimersByTimeAsync(1000);
		expect(emitSpy).toHaveBeenCalledTimes(1);
	});
});

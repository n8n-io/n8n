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

		// Removing the queued fourth execution frees no running slot, so the fifth stays queued
		queue.remove('4');

		// At T+1.499 seconds the third execution is still running, so the fifth is still queued
		await vi.advanceTimersByTimeAsync(499);
		expect(sleepSpy).toHaveBeenCalledTimes(3);
		expect(state).toEqual({ 1: 'finished', 2: 'finished', 3: 'started' });

		// At T+1.5 seconds the third execution has finished, and the fifth one has started
		await vi.advanceTimersByTimeAsync(1);
		expect(sleepSpy).toHaveBeenCalledTimes(4);
		expect(state).toEqual({ 1: 'finished', 2: 'finished', 3: 'finished', 5: 'started' });

		// at T+5 seconds, all but the fourth promise should be resolved
		await vi.advanceTimersByTimeAsync(3500);
		expect(sleepSpy).toHaveBeenCalledTimes(4);
		expect(state).toEqual({ 1: 'finished', 2: 'finished', 3: 'finished', 5: 'finished' });
	});

	it('should not release a queued execution when another queued execution is removed', async () => {
		const queue = new ConcurrencyQueue(1);
		const started: string[] = [];

		void queue.enqueue('1').then(() => started.push('1'));
		void queue.enqueue('2').then(() => started.push('2'));
		void queue.enqueue('3').then(() => started.push('3'));
		await vi.advanceTimersByTimeAsync(1);
		expect(started).toEqual(['1']);

		queue.remove('2');
		await vi.advanceTimersByTimeAsync(1);
		expect(started).toEqual(['1']);
		expect(queue.currentCapacity).toBe(-1);

		queue.dequeue();
		await vi.advanceTimersByTimeAsync(1);
		expect(started).toEqual(['1', '3']);
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

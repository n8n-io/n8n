import { sleep, ManualExecutionCancelledError } from 'n8n-workflow';

import { ConcurrencyQueue } from '../concurrency-queue';

describe('ConcurrencyQueue', () => {
	beforeAll(() => {
		vi.useFakeTimers();
	});

	it('should limit concurrency', async () => {
		const queue = new ConcurrencyQueue(1);
		const state: Record<string, 'started' | 'finished' | 'rejected'> = {};

		const sleepSpy = vi.fn(async () => await sleep(500));

		const testFn = async (item: { executionId: string }) => {
			try {
				await queue.enqueue(item.executionId);
			} catch (error) {
				expect(error).toBeInstanceOf(ManualExecutionCancelledError);
				state[item.executionId] = 'rejected';
				return;
			}
			state[item.executionId] = 'started';
			await sleepSpy();
			queue.dequeue();
			state[item.executionId] = 'finished';
		};

		void testFn({ executionId: '1' });
		void testFn({ executionId: '2' });
		void testFn({ executionId: '3' });
		void testFn({ executionId: '4' });
		void testFn({ executionId: '5' });

		await vi.advanceTimersByTimeAsync(1);
		expect(sleepSpy).toHaveBeenCalledTimes(1);
		expect(state).toEqual({ 1: 'started' });

		// After 500 ms, 1st finishes, 2nd starts
		await vi.advanceTimersByTimeAsync(499);
		expect(sleepSpy).toHaveBeenCalledTimes(2);
		expect(state).toEqual({ 1: 'finished', 2: 'started' });

		// After another 500 ms, 2nd finishes, 3rd starts
		await vi.advanceTimersByTimeAsync(500);
		expect(sleepSpy).toHaveBeenCalledTimes(3);
		expect(state).toEqual({ 1: 'finished', 2: 'finished', 3: 'started' });

		// Remove the 4th promise → it is rejected, 5th stays queued until 3rd finishes
		queue.remove('4');
		await vi.advanceTimersByTimeAsync(1);
		expect(sleepSpy).toHaveBeenCalledTimes(3); // 4 was rejected, 5 is still waiting
		expect(state).toEqual({
			1: 'finished',
			2: 'finished',
			3: 'started',
			4: 'rejected',
		});

		// 3rd promise finishes → capacity freed, 5th starts
		await vi.advanceTimersByTimeAsync(499);
		expect(sleepSpy).toHaveBeenCalledTimes(4); // 5 has started
		expect(state).toEqual({
			1: 'finished',
			2: 'finished',
			3: 'finished',
			4: 'rejected',
			5: 'started',
		});

		// 5th finishes
		await vi.advanceTimersByTimeAsync(1000);
		expect(sleepSpy).toHaveBeenCalledTimes(4);
		expect(state).toEqual({
			1: 'finished',
			2: 'finished',
			3: 'finished',
			4: 'rejected',
			5: 'finished',
		});
	});

	it('should reject the removed item promise', async () => {
		const queue = new ConcurrencyQueue(0);
		let rejectedError: Error | null = null;

		const enqueuePromise = queue.enqueue('queued-execution').catch((error) => {
			rejectedError = error;
		});

		await vi.advanceTimersByTimeAsync(1);
		expect(rejectedError).toBeNull();

		queue.remove('queued-execution');
		await enqueuePromise;

		expect(rejectedError).toBeInstanceOf(ManualExecutionCancelledError);
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

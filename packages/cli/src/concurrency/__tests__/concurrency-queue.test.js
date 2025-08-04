'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const n8n_workflow_1 = require('n8n-workflow');
const concurrency_queue_1 = require('../concurrency-queue');
describe('ConcurrencyQueue', () => {
	beforeAll(() => {
		jest.useFakeTimers();
	});
	it('should limit concurrency', async () => {
		const queue = new concurrency_queue_1.ConcurrencyQueue(1);
		const state = {};
		const sleepSpy = jest.fn(async () => await (0, n8n_workflow_1.sleep)(500));
		const testFn = async (item) => {
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
		expect(sleepSpy).toHaveBeenCalledTimes(0);
		expect(state).toEqual({});
		await jest.advanceTimersByTimeAsync(400);
		expect(sleepSpy).toHaveBeenCalledTimes(1);
		expect(state).toEqual({ 1: 'started' });
		await jest.advanceTimersByTimeAsync(100);
		expect(sleepSpy).toHaveBeenCalledTimes(2);
		expect(state).toEqual({ 1: 'finished', 2: 'started' });
		await jest.advanceTimersByTimeAsync(500);
		expect(sleepSpy).toHaveBeenCalledTimes(3);
		expect(state).toEqual({ 1: 'finished', 2: 'finished', 3: 'started' });
		queue.remove('4');
		await jest.advanceTimersByTimeAsync(1);
		expect(sleepSpy).toHaveBeenCalledTimes(4);
		expect(state).toEqual({ 1: 'finished', 2: 'finished', 3: 'started', 5: 'started' });
		await jest.advanceTimersByTimeAsync(4000);
		expect(sleepSpy).toHaveBeenCalledTimes(4);
		expect(state).toEqual({ 1: 'finished', 2: 'finished', 3: 'finished', 5: 'finished' });
	});
	it('should debounce emitting of the `concurrency-check` event', async () => {
		const queue = new concurrency_queue_1.ConcurrencyQueue(10);
		const emitSpy = jest.fn();
		queue.on('concurrency-check', emitSpy);
		Array.from({ length: 10 }, (_, i) => i).forEach(async () => await queue.enqueue('1'));
		expect(queue.currentCapacity).toBe(0);
		await jest.advanceTimersByTimeAsync(1000);
		expect(emitSpy).toHaveBeenCalledTimes(1);
	});
});
//# sourceMappingURL=concurrency-queue.test.js.map

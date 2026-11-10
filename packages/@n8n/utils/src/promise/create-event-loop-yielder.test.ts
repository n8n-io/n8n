import { createEventLoopYielder } from './create-event-loop-yielder';

describe('createEventLoopYielder', () => {
	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it('lets pending callbacks run once the time limit has passed', async () => {
		const yieldToEventLoop = createEventLoopYielder(0);
		let hasCallbackRun = false;
		setTimeout(() => {
			hasCallbackRun = true;
		}, 0);

		await yieldToEventLoop();

		expect(hasCallbackRun).toBe(true);
	});

	it('does not wait before the time limit has passed', async () => {
		const yieldToEventLoop = createEventLoopYielder(60_000);
		let hasCallbackRun = false;
		setTimeout(() => {
			hasCallbackRun = true;
		}, 0);

		await yieldToEventLoop();

		expect(hasCallbackRun).toBe(false);
	});

	it('waits the full time limit again after each yield', async () => {
		vi.useFakeTimers({ toFake: ['performance', 'setTimeout'] });
		const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
		const yieldToEventLoop = createEventLoopYielder(50);
		const callAfter = async (elapsedMs: number) => {
			vi.advanceTimersByTime(elapsedMs);
			const done = yieldToEventLoop();
			await vi.advanceTimersByTimeAsync(0);
			await done;
		};

		await callAfter(50);
		await callAfter(49);
		expect(setTimeoutSpy).toHaveBeenCalledTimes(1);

		await callAfter(1);
		expect(setTimeoutSpy).toHaveBeenCalledTimes(2);
	});

	it.each([Number.NaN, Number.POSITIVE_INFINITY, -1])('rejects %s as time limit', (maxBlockMs) => {
		expect(() => createEventLoopYielder(maxBlockMs)).toThrow(
			'maxBlockMs must be a finite number of at least 0',
		);
	});
});

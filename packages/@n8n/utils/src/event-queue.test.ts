import { createEventQueue } from './event-queue';

describe('createEventQueue', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should process events in order', async () => {
		const processedEvents: string[] = [];

		// Create an async handler that pushes events into the processedEvents array.
		const processEvent = vi.fn(async (event: string) => {
			processedEvents.push(event);
			// Simulate asynchronous delay of 10ms.
			await new Promise((resolve) => setTimeout(resolve, 10));
		});

		// Create the event queue.
		const { enqueue } = createEventQueue<string>(processEvent);

		// Enqueue events in a specific order.
		enqueue('Event 1');
		enqueue('Event 2');
		enqueue('Event 3');

		// Advance the timers enough to process all events.
		// runAllTimersAsync() will run all pending timers and wait for any pending promise resolution.
		await vi.runAllTimersAsync();

		expect(processEvent).toHaveBeenCalledTimes(3);
		expect(processedEvents).toEqual(['Event 1', 'Event 2', 'Event 3']);
	});

	it('should handle errors and continue processing', async () => {
		const processedEvents: string[] = [];
		const processEvent = vi.fn(async (event: string) => {
			if (event === 'fail') {
				throw new Error('Processing error'); // eslint-disable-line n8n-local-rules/no-plain-errors
			}
			processedEvents.push(event);
			await new Promise((resolve) => setTimeout(resolve, 10));
		});
		const { enqueue } = createEventQueue<string>(processEvent);
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		enqueue('Event A');
		enqueue('fail');
		enqueue('Event B');

		await vi.runAllTimersAsync();

		expect(processEvent).toHaveBeenCalledTimes(3);
		// 'fail' should cause an error but processing continues.
		expect(processedEvents).toEqual(['Event A', 'Event B']);
		expect(consoleSpy).toHaveBeenCalledWith('Error processing event:', expect.any(Error));

		consoleSpy.mockRestore();
	});

	it('should not process any events if none are enqueued', async () => {
		const processEvent = vi.fn(async (_event: string) => {
			await new Promise((resolve) => setTimeout(resolve, 10));
		});

		createEventQueue<string>(processEvent);

		await vi.runAllTimersAsync();

		// Did not enqueue any event.
		expect(processEvent).not.toHaveBeenCalled();
	});

	it('should ensure no concurrent processing of events', async () => {
		let processingCounter = 0;
		let maxConcurrent = 0;

		const processEvent = vi.fn(async (_event: string) => {
			processingCounter++;
			maxConcurrent = Math.max(maxConcurrent, processingCounter);
			// Simulate asynchronous delay.
			await new Promise((resolve) => setTimeout(resolve, 20));
			processingCounter--;
		});

		const { enqueue } = createEventQueue<string>(processEvent);

		enqueue('A');
		enqueue('B');
		enqueue('C');

		await vi.runAllTimersAsync();

		// Throughout processing, maxConcurrent should remain 1.
		expect(maxConcurrent).toEqual(1);
	});
});

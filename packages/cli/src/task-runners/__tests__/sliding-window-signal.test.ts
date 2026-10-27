import { TypedEmitter } from '@n8n/backend-common';

import { SlidingWindowSignal } from '../sliding-window-signal';

type TestEventMap = {
	testEvent: string;
};

describe('SlidingWindowSignal', () => {
	let eventEmitter: TypedEmitter<TestEventMap>;
	let slidingWindowSignal: SlidingWindowSignal<TestEventMap, 'testEvent'>;

	beforeEach(() => {
		eventEmitter = new TypedEmitter<TestEventMap>();
		slidingWindowSignal = new SlidingWindowSignal(eventEmitter, 'testEvent', {
			windowSizeInMs: 500,
		});
	});

	afterEach(() => {
		vi.clearAllTimers();
		vi.clearAllMocks();
	});

	it('should return the last signal if within window size', async () => {
		const signal = 'testSignal';
		eventEmitter.emit('testEvent', signal);

		const receivedSignal = await slidingWindowSignal.getSignal();

		expect(receivedSignal).toBe(signal);
	});

	it('should return null if there is no signal within the window', async () => {
		vi.useFakeTimers();
		const receivedSignalPromise = slidingWindowSignal.getSignal();
		vi.advanceTimersByTime(600);
		const receivedSignal = await receivedSignalPromise;

		expect(receivedSignal).toBeNull();
		vi.useRealTimers();
	});

	it('should return null if "exit" event is not emitted before timeout', async () => {
		const signal = 'testSignal';
		vi.useFakeTimers();
		const receivedSignalPromise = slidingWindowSignal.getSignal();
		vi.advanceTimersByTime(600);
		eventEmitter.emit('testEvent', signal);

		const receivedSignal = await receivedSignalPromise;
		expect(receivedSignal).toBeNull();
		vi.useRealTimers();
	});

	it('should return the signal emitted on "exit" event before timeout', async () => {
		vi.useFakeTimers();
		const receivedSignalPromise = slidingWindowSignal.getSignal();

		// Emit 'exit' with a signal before timeout
		const exitSignal = 'exitSignal';
		eventEmitter.emit('testEvent', exitSignal);

		// Advance timers enough to go outside the timeout window
		vi.advanceTimersByTime(600);

		const receivedSignal = await receivedSignalPromise;
		expect(receivedSignal).toBe(exitSignal);

		vi.useRealTimers();
	});
});

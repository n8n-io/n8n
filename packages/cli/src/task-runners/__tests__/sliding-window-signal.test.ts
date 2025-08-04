import { TypedEmitter } from '../../typed-emitter';
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
		jest.clearAllTimers();
		jest.clearAllMocks();
	});

	it('should return the last signal if within window size', async () => {
		const signal = 'testSignal';
		eventEmitter.emit('testEvent', signal);

		const receivedSignal = await slidingWindowSignal.getSignal();

		expect(receivedSignal).toBe(signal);
	});

	it('should return null if there is no signal within the window', async () => {
		jest.useFakeTimers();
		const receivedSignalPromise = slidingWindowSignal.getSignal();
		jest.advanceTimersByTime(600);
		const receivedSignal = await receivedSignalPromise;

		expect(receivedSignal).toBeNull();
		jest.useRealTimers();
	});

	it('should return null if "exit" event is not emitted before timeout', async () => {
		const signal = 'testSignal';
		jest.useFakeTimers();
		const receivedSignalPromise = slidingWindowSignal.getSignal();
		jest.advanceTimersByTime(600);
		eventEmitter.emit('testEvent', signal);

		const receivedSignal = await receivedSignalPromise;
		expect(receivedSignal).toBeNull();
		jest.useRealTimers();
	});

	it('should return the signal emitted on "exit" event before timeout', async () => {
		jest.useFakeTimers();
		const receivedSignalPromise = slidingWindowSignal.getSignal();

		// Emit 'exit' with a signal before timeout
		const exitSignal = 'exitSignal';
		eventEmitter.emit('testEvent', exitSignal);

		// Advance timers enough to go outside the timeout window
		jest.advanceTimersByTime(600);

		const receivedSignal = await receivedSignalPromise;
		expect(receivedSignal).toBe(exitSignal);

		jest.useRealTimers();
	});
});

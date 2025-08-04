'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const typed_emitter_1 = require('../../typed-emitter');
const sliding_window_signal_1 = require('../sliding-window-signal');
describe('SlidingWindowSignal', () => {
	let eventEmitter;
	let slidingWindowSignal;
	beforeEach(() => {
		eventEmitter = new typed_emitter_1.TypedEmitter();
		slidingWindowSignal = new sliding_window_signal_1.SlidingWindowSignal(
			eventEmitter,
			'testEvent',
			{
				windowSizeInMs: 500,
			},
		);
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
		const exitSignal = 'exitSignal';
		eventEmitter.emit('testEvent', exitSignal);
		jest.advanceTimersByTime(600);
		const receivedSignal = await receivedSignalPromise;
		expect(receivedSignal).toBe(exitSignal);
		jest.useRealTimers();
	});
});
//# sourceMappingURL=sliding-window-signal.test.js.map

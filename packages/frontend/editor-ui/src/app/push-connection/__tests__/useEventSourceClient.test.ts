import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { useEventSourceClient } from '../useEventSourceClient';
import { MockEventSource } from './mockEventSource';

describe('useEventSourceClient', () => {
	beforeEach(() => {
		vi.stubGlobal('EventSource', MockEventSource);
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.clearAllTimers();
		vi.clearAllMocks();
	});

	test('should create EventSource connection with provided URL', () => {
		const url = 'http://test.com';
		const onMessage = vi.fn();

		const { connect } = useEventSourceClient({ url, onMessage });
		connect();

		expect(MockEventSource.init).toHaveBeenCalledWith(url, { withCredentials: true });
	});

	test('should update connection status on successful connection', () => {
		const { connect, isConnected } = useEventSourceClient({
			url: 'http://test.com',
			onMessage: vi.fn(),
		});
		connect();

		MockEventSource.getInstance().simulateConnectionOpen();

		expect(isConnected.value).toBe(true);
	});

	test('should handle incoming messages', () => {
		const onMessage = vi.fn();
		const { connect } = useEventSourceClient({ url: 'http://test.com', onMessage });
		connect();

		MockEventSource.getInstance().simulateMessageEvent('test data');

		expect(onMessage).toHaveBeenCalledWith('test data');
	});

	test('should handle disconnection', () => {
		const { connect, disconnect, isConnected } = useEventSourceClient({
			url: 'http://test.com',
			onMessage: vi.fn(),
		});
		connect();

		// Simulate successful connection
		MockEventSource.getInstance().simulateConnectionOpen();
		expect(isConnected.value).toBe(true);

		disconnect();

		expect(isConnected.value).toBe(false);
		expect(MockEventSource.getInstance().close).toHaveBeenCalled();
	});

	test('should handle connection loss', () => {
		const { connect, isConnected } = useEventSourceClient({
			url: 'http://test.com',
			onMessage: vi.fn(),
		});
		connect();
		expect(MockEventSource.init).toHaveBeenCalledTimes(1);

		// Simulate successful connection
		MockEventSource.getInstance().simulateConnectionOpen();
		expect(isConnected.value).toBe(true);

		// Simulate connection loss
		MockEventSource.getInstance().simulateConnectionClose();
		expect(isConnected.value).toBe(false);

		// Advance timer to trigger reconnect
		vi.advanceTimersByTime(1_000);
		expect(MockEventSource.init).toHaveBeenCalledTimes(2);
	});

	test('sendMessage should be a noop function', () => {
		const { connect, sendMessage } = useEventSourceClient({
			url: 'http://test.com',
			onMessage: vi.fn(),
		});
		connect();

		// Simulate successful connection
		MockEventSource.getInstance().simulateConnectionOpen();

		const message = 'test message';
		// Should not throw error and should do nothing
		expect(() => sendMessage(message)).not.toThrow();
	});

	test('should attempt reconnection with increasing delays', () => {
		const { connect } = useEventSourceClient({
			url: 'http://test.com',
			onMessage: vi.fn(),
		});
		connect();

		MockEventSource.getInstance().simulateConnectionOpen();
		MockEventSource.getInstance().simulateConnectionClose();

		// First reconnection attempt after 1 second
		vi.advanceTimersByTime(1_000);
		expect(MockEventSource.init).toHaveBeenCalledTimes(2);

		MockEventSource.getInstance().simulateConnectionClose();

		// Second reconnection attempt after 2 seconds
		vi.advanceTimersByTime(2_000);
		expect(MockEventSource.init).toHaveBeenCalledTimes(3);
	});

	test('should reset connection attempts on successful connection', () => {
		const { connect } = useEventSourceClient({
			url: 'http://test.com',
			onMessage: vi.fn(),
		});
		connect();

		// First connection attempt
		MockEventSource.getInstance().simulateConnectionOpen();
		MockEventSource.getInstance().simulateConnectionClose();

		// First reconnection attempt
		vi.advanceTimersByTime(1_000);
		expect(MockEventSource.init).toHaveBeenCalledTimes(2);

		// Successful connection
		MockEventSource.getInstance().simulateConnectionOpen();

		// Connection lost again
		MockEventSource.getInstance().simulateConnectionClose();

		// Should start with initial delay again
		vi.advanceTimersByTime(1_000);
		expect(MockEventSource.init).toHaveBeenCalledTimes(3);
	});
});

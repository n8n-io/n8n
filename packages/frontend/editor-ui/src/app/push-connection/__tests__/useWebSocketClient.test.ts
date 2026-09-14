import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { useWebSocketClient } from '../useWebSocketClient';
import { MockWebSocket } from './mockWebSocketClient';

describe('useWebSocketClient', () => {
	beforeEach(() => {
		vi.stubGlobal('WebSocket', MockWebSocket);

		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.clearAllTimers();
		vi.clearAllMocks();
	});

	test('should create WebSocket connection with provided URL', () => {
		const url = 'ws://test.com';
		const onMessage = vi.fn();

		const { connect } = useWebSocketClient({ url, onMessage });
		connect();

		expect(MockWebSocket.init).toHaveBeenCalledWith(url);
	});

	test('should update connection status and start heartbeat on successful connection', () => {
		const { connect, isConnected } = useWebSocketClient({
			url: 'ws://test.com',
			onMessage: vi.fn(),
		});
		connect();

		MockWebSocket.getInstance().simulateConnectionOpen();

		expect(isConnected.value).toBe(true);

		// Advance timer to trigger heartbeat
		vi.advanceTimersByTime(30_000);
		expect(MockWebSocket.getInstance().send).toHaveBeenCalledWith(
			JSON.stringify({ type: 'heartbeat' }),
		);
	});

	test('should handle incoming messages', () => {
		const onMessage = vi.fn();
		const { connect } = useWebSocketClient({ url: 'ws://test.com', onMessage });
		connect();

		MockWebSocket.getInstance().simulateMessageEvent('test data');

		expect(onMessage).toHaveBeenCalledWith('test data');
	});

	test('should handle disconnection', () => {
		const { connect, disconnect, isConnected } = useWebSocketClient({
			url: 'ws://test.com',
			onMessage: vi.fn(),
		});
		connect();

		// Simulate successful connection
		MockWebSocket.getInstance().simulateConnectionOpen();

		expect(isConnected.value).toBe(true);

		disconnect();

		expect(isConnected.value).toBe(false);
		expect(MockWebSocket.getInstance().close).toHaveBeenCalledWith(1000);
	});

	test('should handle connection loss', () => {
		const { connect, isConnected } = useWebSocketClient({
			url: 'ws://test.com',
			onMessage: vi.fn(),
		});
		connect();
		expect(MockWebSocket.init).toHaveBeenCalledTimes(1);

		// Simulate successful connection
		MockWebSocket.getInstance().simulateConnectionOpen();

		expect(isConnected.value).toBe(true);

		// Simulate connection loss
		MockWebSocket.getInstance().simulateConnectionClose(1006);

		expect(isConnected.value).toBe(false);
		// Advance timer to reconnect
		vi.advanceTimersByTime(1_000);
		expect(MockWebSocket.init).toHaveBeenCalledTimes(2);
	});

	test('should throw error when trying to send message while disconnected', () => {
		const { sendMessage } = useWebSocketClient({ url: 'ws://test.com', onMessage: vi.fn() });

		expect(() => sendMessage('test')).toThrow('Not connected to the server');
	});

	test('should attempt reconnection with increasing delays', () => {
		const { connect } = useWebSocketClient({
			url: 'ws://test.com',
			onMessage: vi.fn(),
		});
		connect();

		MockWebSocket.getInstance().simulateConnectionOpen();
		MockWebSocket.getInstance().simulateConnectionClose(1006);

		// First reconnection attempt after 1 second
		vi.advanceTimersByTime(1_000);
		expect(MockWebSocket.init).toHaveBeenCalledTimes(2);

		MockWebSocket.getInstance().simulateConnectionClose(1006);

		// Second reconnection attempt after 2 seconds
		vi.advanceTimersByTime(2_000);
		expect(MockWebSocket.init).toHaveBeenCalledTimes(3);
	});

	test('should send message when connected', () => {
		const { connect, sendMessage } = useWebSocketClient({
			url: 'ws://test.com',
			onMessage: vi.fn(),
		});
		connect();

		// Simulate successful connection
		MockWebSocket.getInstance().simulateConnectionOpen();

		const message = 'test message';
		sendMessage(message);

		expect(MockWebSocket.getInstance().send).toHaveBeenCalledWith(message);
	});
});

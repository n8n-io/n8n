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

	// Regression tests for GHC-7887: Overly aggressive onConnectionLost handler
	describe('Close code 1005 handling', () => {
		test('should not trigger reconnection on code 1005 (No Status Rcvd from proxy)', () => {
			const { connect, isConnected } = useWebSocketClient({
				url: 'ws://test.com',
				onMessage: vi.fn(),
			});
			connect();
			expect(MockWebSocket.init).toHaveBeenCalledTimes(1);

			// Simulate successful connection
			MockWebSocket.getInstance().simulateConnectionOpen();
			expect(isConnected.value).toBe(true);

			// Simulate code 1005 (common with Cloudflare/Traefik/Nginx proxies)
			// This should NOT trigger a full disconnect/reconnect cycle
			MockWebSocket.getInstance().simulateConnectionClose(1005);

			// Connection should remain stable (no disconnect)
			expect(isConnected.value).toBe(true);

			// Should NOT attempt reconnection
			vi.advanceTimersByTime(1_000);
			expect(MockWebSocket.init).toHaveBeenCalledTimes(1); // Still only 1 connection
		});

		test('should maintain connection stability through transient 1005 events', () => {
			const { connect, isConnected, sendMessage } = useWebSocketClient({
				url: 'ws://test.com',
				onMessage: vi.fn(),
			});
			connect();

			MockWebSocket.getInstance().simulateConnectionOpen();
			expect(isConnected.value).toBe(true);

			// Simulate multiple transient 1005 events (proxy re-evaluations)
			MockWebSocket.getInstance().simulateConnectionClose(1005);
			vi.advanceTimersByTime(500);
			MockWebSocket.getInstance().simulateConnectionClose(1005);
			vi.advanceTimersByTime(500);

			// Connection should still be usable
			expect(isConnected.value).toBe(true);
			expect(() => sendMessage('test')).not.toThrow();
		});

		test('should still handle fatal close codes (1006, 1011) with reconnection', () => {
			const { connect, isConnected } = useWebSocketClient({
				url: 'ws://test.com',
				onMessage: vi.fn(),
			});
			connect();
			expect(MockWebSocket.init).toHaveBeenCalledTimes(1);

			MockWebSocket.getInstance().simulateConnectionOpen();
			expect(isConnected.value).toBe(true);

			// Code 1006 (Abnormal Closure) SHOULD trigger reconnection
			MockWebSocket.getInstance().simulateConnectionClose(1006);

			expect(isConnected.value).toBe(false);
			vi.advanceTimersByTime(1_000);
			expect(MockWebSocket.init).toHaveBeenCalledTimes(2); // Reconnected
		});
	});
});

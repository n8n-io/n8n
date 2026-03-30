import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { useWebSocketClient, convertRelativeWebSocketUrl } from '../useWebSocketClient';
import { MockWebSocket } from './mockWebSocketClient';

describe('convertRelativeWebSocketUrl', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	test('should convert relative path to ws:// on HTTP', () => {
		vi.stubGlobal('location', { href: 'http://localhost:5678/', protocol: 'http:' });

		const result = convertRelativeWebSocketUrl('/rest/push');
		expect(result).toBe('ws://localhost:5678/rest/push');
	});

	test('should convert relative path to wss:// on HTTPS', () => {
		vi.stubGlobal('location', { href: 'https://n8n.example.com/', protocol: 'https:' });

		const result = convertRelativeWebSocketUrl('/rest/push');
		expect(result).toBe('wss://n8n.example.com/rest/push');
	});

	test('should preserve existing query parameters', () => {
		vi.stubGlobal('location', { href: 'http://localhost:5678/', protocol: 'http:' });

		const result = convertRelativeWebSocketUrl('/rest/push?pushRef=abc');
		expect(result).toBe('ws://localhost:5678/rest/push?pushRef=abc');
	});

	test('should not modify already absolute WebSocket URLs', () => {
		const absoluteUrl = 'wss://external.com/socket';
		const result = convertRelativeWebSocketUrl(absoluteUrl);
		expect(result).toBe(absoluteUrl);
	});
});

describe('useWebSocketClient', () => {
	let mockWebSocket: MockWebSocket;

	beforeEach(() => {
		mockWebSocket = new MockWebSocket('ws://test.com');

		// @ts-expect-error - mock WebSocket
		global.WebSocket = vi.fn(() => mockWebSocket);

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

		expect(WebSocket).toHaveBeenCalledWith(url);
	});

	test('should use converted absolute URL when connecting', () => {
		vi.stubGlobal('location', { href: 'http://localhost:5678/', protocol: 'http:' });

		const url = '/rest/push';
		const onMessage = vi.fn();

		const { connect } = useWebSocketClient({ url, onMessage });
		connect();

		expect(WebSocket).toHaveBeenCalledWith('ws://localhost:5678/rest/push');
	});

	test('should update connection status and start heartbeat on successful connection', () => {
		const { connect, isConnected } = useWebSocketClient({
			url: 'ws://test.com',
			onMessage: vi.fn(),
		});
		connect();

		mockWebSocket.simulateConnectionOpen();

		expect(isConnected.value).toBe(true);

		// Advance timer to trigger heartbeat
		vi.advanceTimersByTime(30_000);
		expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify({ type: 'heartbeat' }));
	});

	test('should handle incoming messages', () => {
		const onMessage = vi.fn();
		const { connect } = useWebSocketClient({ url: 'ws://test.com', onMessage });
		connect();

		mockWebSocket.simulateMessageEvent('test data');

		expect(onMessage).toHaveBeenCalledWith('test data');
	});

	test('should handle disconnection', () => {
		const { connect, disconnect, isConnected } = useWebSocketClient({
			url: 'ws://test.com',
			onMessage: vi.fn(),
		});
		connect();

		// Simulate successful connection
		mockWebSocket.simulateConnectionOpen();

		expect(isConnected.value).toBe(true);

		disconnect();

		expect(isConnected.value).toBe(false);
		expect(mockWebSocket.close).toHaveBeenCalledWith(1000);
	});

	test('should handle connection loss', () => {
		const { connect, isConnected } = useWebSocketClient({
			url: 'ws://test.com',
			onMessage: vi.fn(),
		});
		connect();
		expect(WebSocket).toHaveBeenCalledTimes(1);

		// Simulate successful connection
		mockWebSocket.simulateConnectionOpen();

		expect(isConnected.value).toBe(true);

		// Simulate connection loss
		mockWebSocket.simulateConnectionClose(1006);

		expect(isConnected.value).toBe(false);
		// Advance timer to reconnect
		vi.advanceTimersByTime(1_000);
		expect(WebSocket).toHaveBeenCalledTimes(2);
	});

	test('should throw error when trying to send message while disconnected', () => {
		const { sendMessage } = useWebSocketClient({ url: 'ws://test.com', onMessage: vi.fn() });

		expect(() => sendMessage('test')).toThrow('Not connected to the server');
	});

	test('should attempt reconnection with increasing delays', () => {
		const { connect } = useWebSocketClient({
			url: 'http://test.com',
			onMessage: vi.fn(),
		});
		connect();

		mockWebSocket.simulateConnectionOpen();
		mockWebSocket.simulateConnectionClose(1006);

		// First reconnection attempt after 1 second
		vi.advanceTimersByTime(1_000);
		expect(WebSocket).toHaveBeenCalledTimes(2);

		mockWebSocket.simulateConnectionClose(1006);

		// Second reconnection attempt after 2 seconds
		vi.advanceTimersByTime(2_000);
		expect(WebSocket).toHaveBeenCalledTimes(3);
	});

	test('should send message when connected', () => {
		const { connect, sendMessage } = useWebSocketClient({
			url: 'ws://test.com',
			onMessage: vi.fn(),
		});
		connect();

		// Simulate successful connection
		mockWebSocket.simulateConnectionOpen();

		const message = 'test message';
		sendMessage(message);

		expect(mockWebSocket.send).toHaveBeenCalledWith(message);
	});
});

import { setActivePinia, createPinia } from 'pinia';
import { describe, test, expect, vi } from 'vitest';
import { usePushConnectionStore } from './pushConnection.store';
import { useWebSocketClient } from '@/app/push-connection/useWebSocketClient';
import { ref } from 'vue';

type WebSocketClient = ReturnType<typeof useWebSocketClient>;

vi.mock('@/app/push-connection/useWebSocketClient', () => ({
	useWebSocketClient: vi.fn(),
}));

vi.mock('@/app/push-connection/useEventSourceClient', () => ({
	useEventSourceClient: vi.fn().mockReturnValue({
		isConnected: { value: false },
		connect: vi.fn(),
		disconnect: vi.fn(),
		sendMessage: vi.fn(),
	}),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: vi.fn().mockReturnValue({
		restUrl: 'http://localhost:5678/api/v1',
		pushRef: 'test-push-ref',
	}),
}));

vi.mock('./settings.store', () => ({
	useSettingsStore: vi.fn().mockReturnValue({
		pushBackend: 'websocket',
	}),
}));

describe('usePushConnectionStore', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.clearAllMocks();
		vi.useRealTimers();
	});

	const createTestInitialState = ({
		isConnected = false,
	}: {
		isConnected?: boolean;
	} = {}) => {
		// Mock connected state
		let onMessage: (data: unknown) => void = vi.fn();
		const mockWebSocketClient: WebSocketClient = {
			isConnected: ref(isConnected),
			connect: vi.fn(),
			disconnect: vi.fn(),
			sendMessage: vi.fn(),
		};

		vi.mocked(useWebSocketClient).mockImplementation((opts) => {
			onMessage = opts.onMessage;
			return mockWebSocketClient;
		});

		setActivePinia(createPinia());

		return {
			store: usePushConnectionStore(),
			mockWebSocketClient,
			onMessage,
		};
	};

	test('should initialize with default values', () => {
		const { store } = createTestInitialState();

		expect(store.isConnected).toBe(false);
		expect(store.isConnectionRequested).toBe(false);
		expect(store.onMessageReceivedHandlers).toEqual([]);
	});

	test('should handle event listeners', () => {
		const { store } = createTestInitialState();
		const handler = vi.fn();

		const removeListener = store.addEventListener(handler);
		expect(store.onMessageReceivedHandlers).toHaveLength(1);

		removeListener();
		expect(store.onMessageReceivedHandlers).toHaveLength(0);
	});

	describe('connection handling', () => {
		test('should connect and disconnect with debounce', () => {
			const { store, mockWebSocketClient } = createTestInitialState();

			store.pushConnect();
			expect(store.isConnectionRequested).toBe(true);
			expect(mockWebSocketClient.connect).toHaveBeenCalled();

			// Wait for the connect intent to expire (500ms debounce window)
			vi.advanceTimersByTime(500);

			store.pushDisconnect();
			// Disconnect is debounced, so it won't happen immediately
			expect(store.isConnectionRequested).toBe(true);
			expect(mockWebSocketClient.disconnect).not.toHaveBeenCalled();

			// Wait for disconnect debounce to complete
			vi.advanceTimersByTime(500);
			expect(store.isConnectionRequested).toBe(false);
			expect(mockWebSocketClient.disconnect).toHaveBeenCalled();
		});

		test('should not disconnect if connect is called within debounce window (new view mounts before old unmounts)', () => {
			const { store, mockWebSocketClient } = createTestInitialState();

			// Initial connect
			store.pushConnect();
			expect(store.isConnectionRequested).toBe(true);
			expect(mockWebSocketClient.connect).toHaveBeenCalledTimes(1);

			// Simulate route transition: disconnect called but connect follows quickly
			store.pushDisconnect();
			// Disconnect should be ignored because recentConnectIntent is still true
			vi.advanceTimersByTime(500);
			expect(mockWebSocketClient.disconnect).not.toHaveBeenCalled();
			expect(store.isConnectionRequested).toBe(true);
		});

		test('should not disconnect if connect is called during disconnect debounce window', () => {
			const { store, mockWebSocketClient } = createTestInitialState();

			// Initial connect
			store.pushConnect();
			expect(mockWebSocketClient.connect).toHaveBeenCalledTimes(1);

			// Wait for connect intent to expire
			vi.advanceTimersByTime(500);

			// Start disconnect (debounced)
			store.pushDisconnect();
			expect(mockWebSocketClient.disconnect).not.toHaveBeenCalled();

			// Before disconnect completes, connect is called again
			vi.advanceTimersByTime(250);
			store.pushConnect();
			expect(mockWebSocketClient.connect).toHaveBeenCalledTimes(2);

			// Wait for what would have been the disconnect timeout
			vi.advanceTimersByTime(250);

			// Disconnect should NOT have been called because connect was called
			expect(mockWebSocketClient.disconnect).not.toHaveBeenCalled();
			expect(store.isConnectionRequested).toBe(true);
		});

		test('should show correct connection status', () => {
			const { store, mockWebSocketClient } = createTestInitialState({
				isConnected: true,
			});

			expect(store.isConnected).toBe(true);
			expect(mockWebSocketClient.isConnected.value).toBe(true);

			mockWebSocketClient.isConnected.value = false;
			expect(store.isConnected).toBe(false);
		});
	});

	describe('sending messages', () => {
		test('should handle message sending when connected', () => {
			const { store, mockWebSocketClient } = createTestInitialState({
				isConnected: true,
			});
			const testMessage = { type: 'test', data: 'message' };

			store.send(testMessage);

			expect(mockWebSocketClient.sendMessage).toHaveBeenCalledWith(JSON.stringify(testMessage));
		});

		test('should queue messages when disconnected and send them when connected', async () => {
			const { store, mockWebSocketClient } = createTestInitialState();
			const testMessage = { type: 'test', data: 'message' };

			store.send(testMessage);
			store.send(testMessage);

			expect(mockWebSocketClient.sendMessage).not.toHaveBeenCalled();

			mockWebSocketClient.isConnected.value = true;

			// Wait for the queue to be processed (flush microtasks and timers)
			await vi.runAllTimersAsync();

			expect(mockWebSocketClient.sendMessage).toHaveBeenCalledTimes(2);
		});
	});

	describe('receiving messages', () => {
		test('should process received messages', async () => {
			const { store, onMessage } = createTestInitialState({
				isConnected: true,
			});
			const handler = vi.fn();
			const testMessage = { type: 'test', data: 'message' };

			store.addEventListener(handler);

			// Simulate receiving a message
			onMessage(JSON.stringify(testMessage));

			expect(handler).toHaveBeenCalledWith(testMessage);
		});

		test('should handle invalid received messages', async () => {
			const { store, onMessage } = createTestInitialState({
				isConnected: true,
			});
			const handler = vi.fn();

			store.addEventListener(handler);

			// Simulate receiving an invalid message
			onMessage('invalid json');

			expect(handler).not.toHaveBeenCalled();
		});
	});
});

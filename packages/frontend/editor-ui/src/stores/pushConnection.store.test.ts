import { setActivePinia, createPinia } from 'pinia';
import { describe, test, expect, vi } from 'vitest';
import { usePushConnectionStore } from './pushConnection.store';
import { useWebSocketClient } from '@/push-connection/useWebSocketClient';
import { ref } from 'vue';

type WebSocketClient = ReturnType<typeof useWebSocketClient>;

vi.mock('@/push-connection/useWebSocketClient', () => ({
	useWebSocketClient: vi.fn(),
}));

vi.mock('@/push-connection/useEventSourceClient', () => ({
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
	afterEach(() => {
		vi.clearAllMocks();
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
		test('should connect and disconnect', () => {
			const { store, mockWebSocketClient } = createTestInitialState();

			store.pushConnect();
			expect(store.isConnectionRequested).toBe(true);
			expect(mockWebSocketClient.connect).toHaveBeenCalled();

			store.pushDisconnect();
			expect(store.isConnectionRequested).toBe(false);
			expect(mockWebSocketClient.disconnect).toHaveBeenCalled();
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

			// Wait for the queue to be processed
			await new Promise(setImmediate);

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

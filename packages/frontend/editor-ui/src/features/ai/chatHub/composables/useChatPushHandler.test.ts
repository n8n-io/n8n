import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref, nextTick, computed, reactive } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { useChatPushHandler } from './useChatPushHandler';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import { useChatStore } from '../chat.store';
import type {
	PushMessage,
	ChatHubStreamBegin,
	ChatHubStreamChunk,
	ChatHubStreamEnd,
	ChatHubStreamError,
	ChatHubExecutionBegin,
	ChatHubExecutionEnd,
	ChatHubHumanMessageCreated,
	ChatHubMessageEdited,
} from '@n8n/api-types';

vi.mock('@/app/stores/pushConnection.store', () => ({
	usePushConnectionStore: vi.fn(),
}));

vi.mock('../chat.store', () => ({
	useChatStore: vi.fn(),
}));

describe('useChatPushHandler', () => {
	let mockPushStore: ReturnType<typeof createMockPushStore>;
	let mockChatStore: ReturnType<typeof createMockChatStore>;
	let messageHandler: ((event: PushMessage) => void) | null;
	let removeEventListenerFn: ReturnType<typeof vi.fn>;
	let isConnectedRef: ReturnType<typeof ref<boolean>>;

	function createMockPushStore() {
		// Create methods that can be spied on
		const pushConnect = vi.fn();
		const pushDisconnect = vi.fn();
		const addEventListener = vi.fn((handler: (event: PushMessage) => void) => {
			messageHandler = handler;
			return removeEventListenerFn;
		});

		// Use reactive to ensure Vue's watch can track the isConnected property
		// The computed ref simulates Pinia's behavior where refs in the store are unwrapped
		const isConnected = computed(() => isConnectedRef.value);

		return reactive({
			pushConnect,
			pushDisconnect,
			addEventListener,
			isConnected,
		});
	}

	function createMockChatStore() {
		return {
			streaming: undefined as { sessionId: string; messageId?: string } | undefined,
			handleWebSocketExecutionBegin: vi.fn(),
			handleWebSocketExecutionEnd: vi.fn(),
			handleWebSocketStreamBegin: vi.fn(),
			handleWebSocketStreamChunk: vi.fn(),
			handleWebSocketStreamEnd: vi.fn(),
			handleWebSocketStreamError: vi.fn(),
			handleHumanMessageCreated: vi.fn(),
			handleMessageEdited: vi.fn(),
			reconnectToStream: vi.fn(),
		};
	}

	beforeEach(() => {
		setActivePinia(createTestingPinia());

		messageHandler = null;
		removeEventListenerFn = vi.fn();
		isConnectedRef = ref(false);

		mockPushStore = createMockPushStore();
		mockChatStore = createMockChatStore();

		vi.mocked(usePushConnectionStore).mockReturnValue(
			mockPushStore as unknown as ReturnType<typeof usePushConnectionStore>,
		);
		vi.mocked(useChatStore).mockReturnValue(
			mockChatStore as unknown as ReturnType<typeof useChatStore>,
		);
	});

	describe('initialize', () => {
		it('should connect to push and add event listener', () => {
			const { initialize } = useChatPushHandler();

			initialize();

			expect(mockPushStore.pushConnect).toHaveBeenCalled();
			expect(mockPushStore.addEventListener).toHaveBeenCalled();
		});

		it('should not reinitialize if already initialized', () => {
			const { initialize } = useChatPushHandler();

			initialize();
			initialize();

			expect(mockPushStore.pushConnect).toHaveBeenCalledTimes(1);
			expect(mockPushStore.addEventListener).toHaveBeenCalledTimes(1);
		});
	});

	describe('terminate', () => {
		it('should disconnect and remove event listener', () => {
			const { initialize, terminate } = useChatPushHandler();

			initialize();
			terminate();

			expect(removeEventListenerFn).toHaveBeenCalled();
			expect(mockPushStore.pushDisconnect).toHaveBeenCalled();
		});

		it('should clear active streams on terminate', () => {
			const { initialize, terminate, hasActiveStream, initializeStreamState } =
				useChatPushHandler();

			initialize();
			initializeStreamState('session-1', 'message-1', 5);
			expect(hasActiveStream('session-1')).toBe(true);

			terminate();

			expect(hasActiveStream('session-1')).toBe(false);
		});
	});

	describe('processMessage', () => {
		it('should route chatHubExecutionBegin to handleExecutionBegin', () => {
			const { initialize } = useChatPushHandler();
			initialize();

			const event: ChatHubExecutionBegin = {
				type: 'chatHubExecutionBegin',
				data: {
					sessionId: 'session-1',
					timestamp: Date.now(),
				},
			};

			messageHandler?.(event);

			expect(mockChatStore.handleWebSocketExecutionBegin).toHaveBeenCalledWith({
				sessionId: 'session-1',
			});
		});

		it('should route chatHubExecutionEnd to handleExecutionEnd', () => {
			const { initialize } = useChatPushHandler();
			initialize();

			const event: ChatHubExecutionEnd = {
				type: 'chatHubExecutionEnd',
				data: {
					sessionId: 'session-1',
					status: 'success',
					timestamp: Date.now(),
				},
			};

			messageHandler?.(event);

			expect(mockChatStore.handleWebSocketExecutionEnd).toHaveBeenCalledWith({
				sessionId: 'session-1',
				status: 'success',
			});
		});

		it('should route chatHubStreamBegin to handleStreamBegin', () => {
			const { initialize } = useChatPushHandler();
			initialize();

			const event: ChatHubStreamBegin = {
				type: 'chatHubStreamBegin',
				data: {
					sessionId: 'session-1',
					messageId: 'message-1',
					sequenceNumber: 0,
					timestamp: Date.now(),
					previousMessageId: 'prev-1',
					retryOfMessageId: null,
					executionId: null,
				},
			};

			messageHandler?.(event);

			expect(mockChatStore.handleWebSocketStreamBegin).toHaveBeenCalledWith({
				sessionId: 'session-1',
				messageId: 'message-1',
				previousMessageId: 'prev-1',
				retryOfMessageId: null,
			});
		});

		it('should route chatHubStreamChunk to handleStreamChunk', () => {
			const { initialize, initializeStreamState } = useChatPushHandler();
			initialize();
			initializeStreamState('session-1', 'message-1', 0);

			const event: ChatHubStreamChunk = {
				type: 'chatHubStreamChunk',
				data: {
					sessionId: 'session-1',
					messageId: 'message-1',
					sequenceNumber: 1,
					timestamp: Date.now(),
					content: 'Hello',
				},
			};

			messageHandler?.(event);

			expect(mockChatStore.handleWebSocketStreamChunk).toHaveBeenCalledWith({
				sessionId: 'session-1',
				messageId: 'message-1',
				content: 'Hello',
			});
		});

		it('should route chatHubStreamEnd to handleStreamEnd', () => {
			const { initialize, initializeStreamState } = useChatPushHandler();
			initialize();
			initializeStreamState('session-1', 'message-1', 0);

			const event: ChatHubStreamEnd = {
				type: 'chatHubStreamEnd',
				data: {
					sessionId: 'session-1',
					messageId: 'message-1',
					sequenceNumber: 5,
					timestamp: Date.now(),
					status: 'success',
				},
			};

			messageHandler?.(event);

			expect(mockChatStore.handleWebSocketStreamEnd).toHaveBeenCalledWith({
				sessionId: 'session-1',
				messageId: 'message-1',
				status: 'success',
			});
		});

		it('should route chatHubStreamError to handleStreamError', () => {
			const { initialize, initializeStreamState } = useChatPushHandler();
			initialize();
			initializeStreamState('session-1', 'message-1', 0);

			const event: ChatHubStreamError = {
				type: 'chatHubStreamError',
				data: {
					sessionId: 'session-1',
					messageId: 'message-1',
					sequenceNumber: 1,
					timestamp: Date.now(),
					error: 'Something went wrong',
				},
			};

			messageHandler?.(event);

			expect(mockChatStore.handleWebSocketStreamError).toHaveBeenCalledWith({
				sessionId: 'session-1',
				messageId: 'message-1',
				error: 'Something went wrong',
			});
		});

		it('should route chatHubHumanMessageCreated to handleHumanMessageCreated', () => {
			const { initialize } = useChatPushHandler();
			initialize();

			const event: ChatHubHumanMessageCreated = {
				type: 'chatHubHumanMessageCreated',
				data: {
					sessionId: 'session-1',
					messageId: 'human-1',
					previousMessageId: null,
					content: 'Hello AI',
					attachments: [],
					timestamp: Date.now(),
				},
			};

			messageHandler?.(event);

			expect(mockChatStore.handleHumanMessageCreated).toHaveBeenCalledWith(event.data);
		});

		it('should route chatHubMessageEdited to handleMessageEdited', () => {
			const { initialize } = useChatPushHandler();
			initialize();

			const event: ChatHubMessageEdited = {
				type: 'chatHubMessageEdited',
				data: {
					sessionId: 'session-1',
					revisionOfMessageId: 'original-1',
					messageId: 'revised-1',
					content: 'Edited message',
					attachments: [],
					timestamp: Date.now(),
				},
			};

			messageHandler?.(event);

			expect(mockChatStore.handleMessageEdited).toHaveBeenCalledWith(event.data);
		});
	});

	describe('handleStreamBegin', () => {
		it('should create active stream state', () => {
			const { initialize, hasActiveStream, getStreamState } = useChatPushHandler();
			initialize();

			const event: ChatHubStreamBegin = {
				type: 'chatHubStreamBegin',
				data: {
					sessionId: 'session-1',
					messageId: 'message-1',
					sequenceNumber: 0,
					timestamp: Date.now(),
					previousMessageId: null,
					retryOfMessageId: null,
					executionId: null,
				},
			};

			messageHandler?.(event);

			expect(hasActiveStream('session-1')).toBe(true);
			const state = getStreamState('session-1');
			expect(state).toEqual({
				sessionId: 'session-1',
				messageId: 'message-1',
				lastSequenceNumber: 0,
				content: '',
			});
		});

		it('should update streaming messageId if session matches', () => {
			mockChatStore.streaming = { sessionId: 'session-1', messageId: 'old-message' };

			const { initialize } = useChatPushHandler();
			initialize();

			const event: ChatHubStreamBegin = {
				type: 'chatHubStreamBegin',
				data: {
					sessionId: 'session-1',
					messageId: 'new-message',
					sequenceNumber: 0,
					timestamp: Date.now(),
					previousMessageId: null,
					retryOfMessageId: null,
					executionId: null,
				},
			};

			messageHandler?.(event);

			expect(mockChatStore.streaming?.messageId).toBe('new-message');
		});
	});

	describe('handleStreamChunk', () => {
		it('should ignore chunks for unknown sessions', () => {
			const { initialize } = useChatPushHandler();
			initialize();

			const event: ChatHubStreamChunk = {
				type: 'chatHubStreamChunk',
				data: {
					sessionId: 'unknown-session',
					messageId: 'message-1',
					sequenceNumber: 1,
					timestamp: Date.now(),
					content: 'Hello',
				},
			};

			messageHandler?.(event);

			expect(mockChatStore.handleWebSocketStreamChunk).not.toHaveBeenCalled();
		});

		it('should ignore chunks with mismatched messageId', () => {
			const { initialize, initializeStreamState } = useChatPushHandler();
			initialize();
			initializeStreamState('session-1', 'message-1', 0);

			const event: ChatHubStreamChunk = {
				type: 'chatHubStreamChunk',
				data: {
					sessionId: 'session-1',
					messageId: 'different-message',
					sequenceNumber: 1,
					timestamp: Date.now(),
					content: 'Hello',
				},
			};

			messageHandler?.(event);

			expect(mockChatStore.handleWebSocketStreamChunk).not.toHaveBeenCalled();
		});

		it('should ignore chunks with sequence number <= last received', () => {
			const { initialize, initializeStreamState } = useChatPushHandler();
			initialize();
			initializeStreamState('session-1', 'message-1', 5);

			const event: ChatHubStreamChunk = {
				type: 'chatHubStreamChunk',
				data: {
					sessionId: 'session-1',
					messageId: 'message-1',
					sequenceNumber: 5, // Same as last
					timestamp: Date.now(),
					content: 'Hello',
				},
			};

			messageHandler?.(event);

			expect(mockChatStore.handleWebSocketStreamChunk).not.toHaveBeenCalled();
		});

		it('should process valid chunks and update sequence number', () => {
			const { initialize, initializeStreamState, getLastSequenceNumber } = useChatPushHandler();
			initialize();
			initializeStreamState('session-1', 'message-1', 0);

			const event: ChatHubStreamChunk = {
				type: 'chatHubStreamChunk',
				data: {
					sessionId: 'session-1',
					messageId: 'message-1',
					sequenceNumber: 1,
					timestamp: Date.now(),
					content: 'Hello',
				},
			};

			messageHandler?.(event);

			expect(mockChatStore.handleWebSocketStreamChunk).toHaveBeenCalled();
			expect(getLastSequenceNumber('session-1')).toBe(1);
		});

		it('should accumulate content in stream state', () => {
			const { initialize, initializeStreamState, getStreamState } = useChatPushHandler();
			initialize();
			initializeStreamState('session-1', 'message-1', 0);

			messageHandler?.({
				type: 'chatHubStreamChunk',
				data: {
					sessionId: 'session-1',
					messageId: 'message-1',
					sequenceNumber: 1,
					timestamp: Date.now(),
					content: 'Hello',
				},
			} as ChatHubStreamChunk);

			messageHandler?.({
				type: 'chatHubStreamChunk',
				data: {
					sessionId: 'session-1',
					messageId: 'message-1',
					sequenceNumber: 2,
					timestamp: Date.now(),
					content: ' World',
				},
			} as ChatHubStreamChunk);

			const state = getStreamState('session-1');
			expect(state?.content).toBe('Hello World');
		});
	});

	describe('handleStreamEnd', () => {
		it('should clean up active stream', () => {
			const { initialize, initializeStreamState, hasActiveStream } = useChatPushHandler();
			initialize();
			initializeStreamState('session-1', 'message-1', 0);

			expect(hasActiveStream('session-1')).toBe(true);

			const event: ChatHubStreamEnd = {
				type: 'chatHubStreamEnd',
				data: {
					sessionId: 'session-1',
					messageId: 'message-1',
					sequenceNumber: 5,
					timestamp: Date.now(),
					status: 'success',
				},
			};

			messageHandler?.(event);

			expect(hasActiveStream('session-1')).toBe(false);
		});
	});

	describe('handleStreamError', () => {
		it('should clean up active stream on error', () => {
			const { initialize, initializeStreamState, hasActiveStream } = useChatPushHandler();
			initialize();
			initializeStreamState('session-1', 'message-1', 0);

			expect(hasActiveStream('session-1')).toBe(true);

			const event: ChatHubStreamError = {
				type: 'chatHubStreamError',
				data: {
					sessionId: 'session-1',
					messageId: 'message-1',
					sequenceNumber: 1,
					timestamp: Date.now(),
					error: 'Stream failed',
				},
			};

			messageHandler?.(event);

			expect(hasActiveStream('session-1')).toBe(false);
		});
	});

	describe('handleExecutionEnd', () => {
		it('should clean up all active streams for the session', () => {
			const { initialize, initializeStreamState, hasActiveStream } = useChatPushHandler();
			initialize();
			initializeStreamState('session-1', 'message-1', 0);

			const event: ChatHubExecutionEnd = {
				type: 'chatHubExecutionEnd',
				data: {
					sessionId: 'session-1',
					status: 'success',
					timestamp: Date.now(),
				},
			};

			messageHandler?.(event);

			expect(hasActiveStream('session-1')).toBe(false);
		});
	});

	describe('utility functions', () => {
		describe('getStreamState', () => {
			it('should return undefined for non-existent session', () => {
				const { getStreamState } = useChatPushHandler();

				expect(getStreamState('non-existent')).toBeUndefined();
			});

			it('should return stream state for active session', () => {
				const { initializeStreamState, getStreamState } = useChatPushHandler();

				initializeStreamState('session-1', 'message-1', 10);

				const state = getStreamState('session-1');
				expect(state).toEqual({
					sessionId: 'session-1',
					messageId: 'message-1',
					lastSequenceNumber: 10,
					content: '',
				});
			});
		});

		describe('hasActiveStream', () => {
			it('should return false for non-existent session', () => {
				const { hasActiveStream } = useChatPushHandler();

				expect(hasActiveStream('non-existent')).toBe(false);
			});

			it('should return true for active session', () => {
				const { initializeStreamState, hasActiveStream } = useChatPushHandler();

				initializeStreamState('session-1', 'message-1', 0);

				expect(hasActiveStream('session-1')).toBe(true);
			});
		});

		describe('getLastSequenceNumber', () => {
			it('should return 0 for non-existent session', () => {
				const { getLastSequenceNumber } = useChatPushHandler();

				expect(getLastSequenceNumber('non-existent')).toBe(0);
			});

			it('should return last sequence number for active session', () => {
				const { initializeStreamState, getLastSequenceNumber } = useChatPushHandler();

				initializeStreamState('session-1', 'message-1', 42);

				expect(getLastSequenceNumber('session-1')).toBe(42);
			});
		});

		describe('initializeStreamState', () => {
			it('should create stream state with given values', () => {
				const { initializeStreamState, getStreamState } = useChatPushHandler();

				initializeStreamState('session-1', 'message-1', 100);

				expect(getStreamState('session-1')).toEqual({
					sessionId: 'session-1',
					messageId: 'message-1',
					lastSequenceNumber: 100,
					content: '',
				});
			});
		});
	});

	describe('handleReconnect', () => {
		it('should call reconnectToStream for all active streams when connection is restored', async () => {
			mockChatStore.reconnectToStream.mockResolvedValue({
				pendingChunks: [],
			});

			const { initialize, initializeStreamState } = useChatPushHandler();
			initialize();
			initializeStreamState('session-1', 'message-1', 5);
			initializeStreamState('session-2', 'message-2', 10);

			// Trigger reconnect by simulating connection change (false -> true)
			isConnectedRef.value = true;
			await nextTick();

			// Wait for the async watch callback and reconnect logic
			await vi.waitFor(
				() => {
					expect(mockChatStore.reconnectToStream).toHaveBeenCalledTimes(2);
				},
				{ timeout: 2000 },
			);

			expect(mockChatStore.reconnectToStream).toHaveBeenCalledWith('session-1', 5);
			expect(mockChatStore.reconnectToStream).toHaveBeenCalledWith('session-2', 10);
		});

		it('should update sequence numbers from pending chunks after reconnect', async () => {
			mockChatStore.reconnectToStream.mockResolvedValue({
				pendingChunks: [{ sequenceNumber: 15, content: 'chunk1' }],
			});

			const { initialize, initializeStreamState, getLastSequenceNumber } = useChatPushHandler();
			initialize();
			initializeStreamState('session-1', 'message-1', 5);

			// Trigger reconnect
			isConnectedRef.value = true;
			await nextTick();

			await vi.waitFor(
				() => {
					expect(mockChatStore.reconnectToStream).toHaveBeenCalled();
				},
				{ timeout: 2000 },
			);

			// Wait for the async handler to complete and update sequence number
			await vi.waitFor(
				() => {
					expect(getLastSequenceNumber('session-1')).toBe(15);
				},
				{ timeout: 2000 },
			);
		});

		it('should not trigger reconnect when connection goes down', async () => {
			const { initialize } = useChatPushHandler();
			initialize();

			// Start connected
			isConnectedRef.value = true;
			await nextTick();

			// Wait for initial reconnect to complete (if any)
			await vi
				.waitFor(
					() => {
						// Give time for any async operations
					},
					{ timeout: 100 },
				)
				.catch(() => {
					// Ignore timeout - we just want to wait a bit
				});

			mockChatStore.reconnectToStream.mockClear();

			// Now disconnect
			isConnectedRef.value = false;
			await nextTick();

			// The watch should not trigger reconnect when going from connected to disconnected
			expect(mockChatStore.reconnectToStream).not.toHaveBeenCalled();
		});
	});
});

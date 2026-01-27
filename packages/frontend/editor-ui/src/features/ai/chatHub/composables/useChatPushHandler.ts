import { ref } from 'vue';
import type {
	PushMessage,
	ChatStreamBegin,
	ChatStreamChunk,
	ChatStreamEnd,
	ChatStreamError,
	ChatSessionId,
	ChatMessageId,
	ChatHubMessageStatus,
} from '@n8n/api-types';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import { useChatStore } from '../chat.store';

/**
 * State for tracking an active chat stream via WebSocket
 */
export interface ChatPushStreamState {
	sessionId: ChatSessionId;
	messageId: ChatMessageId;
	lastSequenceNumber: number;
	content: string;
	isActive: boolean;
}

/**
 * Composable for handling chat stream messages received via WebSocket Push
 */
export function useChatPushHandler() {
	const pushStore = usePushConnectionStore();
	const chatStore = useChatStore();

	const activeStreams = ref<Map<ChatSessionId, ChatPushStreamState>>(new Map());
	const removeEventListener = ref<(() => void) | null>(null);

	/**
	 * Check if a push message is a chat stream event
	 */
	function isChatStreamMessage(
		event: PushMessage,
	): event is ChatStreamBegin | ChatStreamChunk | ChatStreamEnd | ChatStreamError {
		return (
			event.type === 'chatStreamBegin' ||
			event.type === 'chatStreamChunk' ||
			event.type === 'chatStreamEnd' ||
			event.type === 'chatStreamError'
		);
	}

	/**
	 * Handle a chat stream begin event
	 */
	function handleStreamBegin(event: ChatStreamBegin): void {
		const { sessionId, messageId, sequenceNumber, previousMessageId, retryOfMessageId } =
			event.data;

		// Initialize stream state
		activeStreams.value.set(sessionId, {
			sessionId,
			messageId,
			lastSequenceNumber: sequenceNumber,
			content: '',
			isActive: true,
		});

		// Update the chat store streaming state if this is the current session
		if (chatStore.streaming?.sessionId === sessionId) {
			// The streaming state is already set by the sendMessage call
			// Just update the messageId if needed
			if (chatStore.streaming.messageId !== messageId) {
				chatStore.streaming.messageId = messageId;
			}
		}

		// Emit a begin event to the store handler
		chatStore.handleWebSocketStreamBegin?.({
			sessionId,
			messageId,
			previousMessageId,
			retryOfMessageId,
		});
	}

	/**
	 * Handle a chat stream chunk event
	 */
	function handleStreamChunk(event: ChatStreamChunk): void {
		const { sessionId, messageId, sequenceNumber, content } = event.data;

		const streamState = activeStreams.value.get(sessionId);
		if (!streamState || !streamState.isActive) {
			return;
		}

		// Check for sequence gaps (out-of-order chunks)
		if (sequenceNumber <= streamState.lastSequenceNumber) {
			// Duplicate or out-of-order chunk, ignore
			return;
		}

		// Update stream state
		streamState.lastSequenceNumber = sequenceNumber;
		streamState.content += content;

		// Emit chunk to the store handler
		chatStore.handleWebSocketStreamChunk?.({
			sessionId,
			messageId,
			content,
			sequenceNumber,
		});
	}

	/**
	 * Handle a chat stream end event
	 */
	function handleStreamEnd(event: ChatStreamEnd): void {
		const { sessionId, messageId, status } = event.data;

		const streamState = activeStreams.value.get(sessionId);
		if (streamState) {
			streamState.isActive = false;
		}

		// Clean up after a short delay to allow any late chunks to arrive
		setTimeout(() => {
			activeStreams.value.delete(sessionId);
		}, 1000);

		// Emit end event to the store handler
		chatStore.handleWebSocketStreamEnd?.({
			sessionId,
			messageId,
			status,
		});
	}

	/**
	 * Handle a chat stream error event
	 */
	function handleStreamError(event: ChatStreamError): void {
		const { sessionId, messageId, error } = event.data;

		const streamState = activeStreams.value.get(sessionId);
		if (streamState) {
			streamState.isActive = false;
		}

		// Clean up
		activeStreams.value.delete(sessionId);

		// Emit error event to the store handler
		chatStore.handleWebSocketStreamError?.({
			sessionId,
			messageId,
			error,
		});
	}

	/**
	 * Process a push message if it's a chat stream event
	 */
	function processMessage(event: PushMessage): void {
		if (!isChatStreamMessage(event)) {
			return;
		}

		switch (event.type) {
			case 'chatStreamBegin':
				handleStreamBegin(event);
				break;
			case 'chatStreamChunk':
				handleStreamChunk(event);
				break;
			case 'chatStreamEnd':
				handleStreamEnd(event);
				break;
			case 'chatStreamError':
				handleStreamError(event);
				break;
		}
	}

	/**
	 * Initialize the push handler
	 */
	function initialize(): void {
		if (removeEventListener.value) {
			return; // Already initialized
		}

		removeEventListener.value = pushStore.addEventListener(processMessage);
	}

	/**
	 * Terminate the push handler
	 */
	function terminate(): void {
		if (removeEventListener.value) {
			removeEventListener.value();
			removeEventListener.value = null;
		}

		// Clear all active streams
		activeStreams.value.clear();
	}

	/**
	 * Get the current stream state for a session
	 */
	function getStreamState(sessionId: ChatSessionId): ChatPushStreamState | undefined {
		return activeStreams.value.get(sessionId);
	}

	/**
	 * Check if a session has an active stream
	 */
	function hasActiveStream(sessionId: ChatSessionId): boolean {
		const state = activeStreams.value.get(sessionId);
		return state?.isActive ?? false;
	}

	/**
	 * Get the last received sequence number for a session
	 */
	function getLastSequenceNumber(sessionId: ChatSessionId): number {
		return activeStreams.value.get(sessionId)?.lastSequenceNumber ?? 0;
	}

	return {
		activeStreams,
		initialize,
		terminate,
		getStreamState,
		hasActiveStream,
		getLastSequenceNumber,
	};
}

/**
 * Types for the store handlers that useChatPushHandler will call
 */
export interface ChatWebSocketHandlers {
	handleWebSocketStreamBegin?: (data: {
		sessionId: ChatSessionId;
		messageId: ChatMessageId;
		previousMessageId: ChatMessageId | null;
		retryOfMessageId: ChatMessageId | null;
	}) => void;
	handleWebSocketStreamChunk?: (data: {
		sessionId: ChatSessionId;
		messageId: ChatMessageId;
		content: string;
		sequenceNumber: number;
	}) => void;
	handleWebSocketStreamEnd?: (data: {
		sessionId: ChatSessionId;
		messageId: ChatMessageId;
		status: ChatHubMessageStatus;
	}) => void;
	handleWebSocketStreamError?: (data: {
		sessionId: ChatSessionId;
		messageId: ChatMessageId;
		error: string;
	}) => void;
}

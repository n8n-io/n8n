import { ref } from 'vue';
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
	ChatHubAttachmentInfo,
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
	 * Handle a chat execution begin event (whole streaming session starts)
	 */
	function handleExecutionBegin(event: ChatHubExecutionBegin): void {
		const { sessionId } = event.data;
		chatStore.handleWebSocketExecutionBegin?.({ sessionId });
	}

	/**
	 * Handle a chat execution end event (whole streaming session ends)
	 */
	function handleExecutionEnd(event: ChatHubExecutionEnd): void {
		const { sessionId, status } = event.data;

		// Clean up all active streams for this session
		activeStreams.value.delete(sessionId);

		chatStore.handleWebSocketExecutionEnd?.({ sessionId, status });
	}

	/**
	 * Handle a chat stream begin event
	 */
	function handleStreamBegin(event: ChatHubStreamBegin): void {
		const { sessionId, messageId, sequenceNumber, previousMessageId, retryOfMessageId } =
			event.data;

		// Initialize stream state
		activeStreams.value.set(sessionId, {
			sessionId,
			messageId,
			lastSequenceNumber: sequenceNumber,
			content: '',
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
	function handleStreamChunk(event: ChatHubStreamChunk): void {
		const { sessionId, messageId, sequenceNumber, content } = event.data;

		const streamState = activeStreams.value.get(sessionId);
		if (!streamState || streamState.messageId !== messageId) {
			return;
		}

		if (sequenceNumber <= streamState.lastSequenceNumber) {
			return;
		}

		streamState.lastSequenceNumber = sequenceNumber;
		streamState.content += content;

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
	function handleStreamEnd(event: ChatHubStreamEnd): void {
		const { sessionId, messageId, status } = event.data;

		activeStreams.value.delete(sessionId);

		chatStore.handleWebSocketStreamEnd?.({
			sessionId,
			messageId,
			status,
		});
	}

	/**
	 * Handle a chat stream error event
	 */
	function handleStreamError(event: ChatHubStreamError): void {
		const { sessionId, messageId, error } = event.data;

		activeStreams.value.delete(sessionId);

		chatStore.handleWebSocketStreamError?.({
			sessionId,
			messageId,
			error,
		});
	}

	/**
	 * Handle a human message created event (for cross-client sync)
	 */
	function handleHumanMessageCreated(event: ChatHubHumanMessageCreated): void {
		chatStore.handleRemoteHumanMessage?.(event.data);
	}

	/**
	 * Handle a message edited event (for cross-client sync)
	 */
	function handleMessageEdited(event: ChatHubMessageEdited): void {
		chatStore.handleRemoteMessageEdit?.(event.data);
	}

	/**
	 * Process a push message if it's a chat stream event
	 */
	function processMessage(event: PushMessage): void {
		switch (event.type) {
			case 'chatHubHumanMessageCreated':
				handleHumanMessageCreated(event);
				break;
			case 'chatHubMessageEdited':
				handleMessageEdited(event);
				break;
			case 'chatHubExecutionBegin':
				handleExecutionBegin(event);
				break;
			case 'chatHubExecutionEnd':
				handleExecutionEnd(event);
				break;
			case 'chatHubStreamBegin':
				handleStreamBegin(event);
				break;
			case 'chatHubStreamChunk':
				handleStreamChunk(event);
				break;
			case 'chatHubStreamEnd':
				handleStreamEnd(event);
				break;
			case 'chatHubStreamError':
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
		const activeStream = activeStreams.value.get(sessionId);
		return !!activeStream;
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
	handleWebSocketExecutionBegin?: (data: { sessionId: ChatSessionId }) => void;
	handleWebSocketExecutionEnd?: (data: {
		sessionId: ChatSessionId;
		status: 'success' | 'error' | 'cancelled';
	}) => void;
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
	handleRemoteHumanMessage?: (data: {
		sessionId: ChatSessionId;
		messageId: ChatMessageId;
		previousMessageId: ChatMessageId | null;
		content: string;
		attachments: ChatHubAttachmentInfo[];
		timestamp: number;
	}) => void;
	handleRemoteMessageEdit?: (data: {
		sessionId: ChatSessionId;
		originalMessageId: ChatMessageId;
		newMessageId: ChatMessageId;
		content: string;
		attachments: ChatHubAttachmentInfo[];
		timestamp: number;
	}) => void;
}

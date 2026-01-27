import type { ChatHubMessageStatus, ChatMessageId, ChatSessionId } from '../chat-hub';

/**
 * Base metadata included in all chat stream push messages
 */
export interface ChatStreamMetadata {
	/** Unique identifier for the chat session */
	sessionId: ChatSessionId;
	/** Unique identifier for the AI message being streamed */
	messageId: ChatMessageId;
	/** Sequence number for ordering chunks (starts at 0) */
	sequenceNumber: number;
	/** Timestamp when this message was created */
	timestamp: number;
}

/**
 * Sent when a new AI response begins streaming
 */
export type ChatStreamBegin = {
	type: 'chatStreamBegin';
	data: ChatStreamMetadata & {
		/** ID of the message this is responding to */
		previousMessageId: ChatMessageId | null;
		/** If this is a retry, the ID of the message being retried */
		retryOfMessageId: ChatMessageId | null;
		/** Execution ID if applicable */
		executionId: number | null;
	};
};

/**
 * Sent for each chunk of content during streaming
 */
export type ChatStreamChunk = {
	type: 'chatStreamChunk';
	data: ChatStreamMetadata & {
		/** The content chunk */
		content: string;
	};
};

/**
 * Sent when streaming completes successfully
 */
export type ChatStreamEnd = {
	type: 'chatStreamEnd';
	data: ChatStreamMetadata & {
		/** Final status of the message */
		status: ChatHubMessageStatus;
	};
};

/**
 * Sent when an error occurs during streaming
 */
export type ChatStreamError = {
	type: 'chatStreamError';
	data: ChatStreamMetadata & {
		/** Error message */
		error: string;
	};
};

/**
 * Union type of all chat stream push messages
 */
export type ChatStreamPushMessage =
	| ChatStreamBegin
	| ChatStreamChunk
	| ChatStreamEnd
	| ChatStreamError;

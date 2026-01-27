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
 * Attachment info sent in human message events
 */
export interface ChatAttachmentInfo {
	id: string;
	fileName: string;
	mimeType: string;
}

/**
 * Sent when a human message is created (for cross-client sync)
 */
export type ChatHumanMessageCreated = {
	type: 'chatHumanMessageCreated';
	data: {
		/** Unique identifier for the chat session */
		sessionId: ChatSessionId;
		/** Unique identifier for the human message */
		messageId: ChatMessageId;
		/** ID of the message this follows */
		previousMessageId: ChatMessageId | null;
		/** The message content */
		content: string;
		/** Attachments on the message */
		attachments: ChatAttachmentInfo[];
		/** Timestamp when this message was created */
		timestamp: number;
	};
};

/**
 * Sent when a message is edited (for cross-client sync)
 */
export type ChatMessageEdited = {
	type: 'chatMessageEdited';
	data: {
		/** Unique identifier for the chat session */
		sessionId: ChatSessionId;
		/** ID of the original message being edited */
		originalMessageId: ChatMessageId;
		/** ID of the new message created from the edit */
		newMessageId: ChatMessageId;
		/** The new message content */
		content: string;
		/** Attachments on the new message */
		attachments: ChatAttachmentInfo[];
		/** Timestamp when this edit was created */
		timestamp: number;
	};
};

/**
 * Sent when a chat execution begins (can contain multiple messages, e.g., with tool calls)
 */
export type ChatExecutionBegin = {
	type: 'chatExecutionBegin';
	data: {
		/** Unique identifier for the chat session */
		sessionId: ChatSessionId;
		/** Timestamp when execution started */
		timestamp: number;
	};
};

/**
 * Sent when a chat execution ends (all messages have been sent)
 */
export type ChatExecutionEnd = {
	type: 'chatExecutionEnd';
	data: {
		/** Unique identifier for the chat session */
		sessionId: ChatSessionId;
		/** Final status of the execution */
		status: 'success' | 'error' | 'cancelled';
		/** Timestamp when execution ended */
		timestamp: number;
	};
};

/**
 * Union type of AI stream-related push messages (message level)
 */
export type ChatStreamEvent = ChatStreamBegin | ChatStreamChunk | ChatStreamEnd | ChatStreamError;

/**
 * Union type of execution-level push messages
 */
export type ChatExecutionEvent = ChatExecutionBegin | ChatExecutionEnd;

/**
 * Union type of all chat push messages
 */
export type ChatStreamPushMessage =
	| ChatStreamEvent
	| ChatExecutionEvent
	| ChatHumanMessageCreated
	| ChatMessageEdited;

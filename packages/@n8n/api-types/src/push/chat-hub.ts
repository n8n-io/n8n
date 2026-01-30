import type { ChatHubMessageStatus, ChatMessageId, ChatSessionId } from '../chat-hub';

/**
 * Base metadata included in all chat stream push messages
 */
export interface ChatHubStreamMetadata {
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
export type ChatHubStreamBegin = {
	type: 'chatHubStreamBegin';
	data: ChatHubStreamMetadata & {
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
export type ChatHubStreamChunk = {
	type: 'chatHubStreamChunk';
	data: ChatHubStreamMetadata & {
		/** The content chunk */
		content: string;
	};
};

/**
 * Sent when streaming completes successfully
 */
export type ChatHubStreamEnd = {
	type: 'chatHubStreamEnd';
	data: ChatHubStreamMetadata & {
		/** Final status of the message */
		status: ChatHubMessageStatus;
	};
};

/**
 * Sent when an error occurs during streaming
 */
export type ChatHubStreamError = {
	type: 'chatHubStreamError';
	data: ChatHubStreamMetadata & {
		/** Error message */
		error: string;
	};
};

/**
 * Attachment info sent in human message events
 */
export interface ChatHubAttachmentInfo {
	id: string;
	fileName: string;
	mimeType: string;
}

/**
 * Sent when a human message is created (for cross-client sync)
 */
export type ChatHubHumanMessageCreated = {
	type: 'chatHubHumanMessageCreated';
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
		attachments: ChatHubAttachmentInfo[];
		/** Timestamp when this message was created */
		timestamp: number;
	};
};

/**
 * Sent when a message is edited (for cross-client sync)
 */
export type ChatHubMessageEdited = {
	type: 'chatHubMessageEdited';
	data: {
		/** Unique identifier for the chat session */
		sessionId: ChatSessionId;
		/** ID of the message being revised */
		revisionOfMessageId: ChatMessageId;
		/** ID of this message (the revised version) */
		messageId: ChatMessageId;
		/** The new message content */
		content: string;
		/** Attachments on the new message */
		attachments: ChatHubAttachmentInfo[];
		/** Timestamp when this edit was created */
		timestamp: number;
	};
};

/**
 * Sent when a chat execution begins (can contain multiple messages, e.g., with tool calls)
 */
export type ChatHubExecutionBegin = {
	type: 'chatHubExecutionBegin';
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
export type ChatHubExecutionEnd = {
	type: 'chatHubExecutionEnd';
	data: {
		/** Unique identifier for the chat session */
		sessionId: ChatSessionId;
		/** Final status of the execution */
		status: ChatHubMessageStatus;
		/** Timestamp when execution ended */
		timestamp: number;
	};
};

/**
 * Union type of AI stream-related push messages (message level)
 */
export type ChatHubStreamEvent =
	| ChatHubStreamBegin
	| ChatHubStreamChunk
	| ChatHubStreamEnd
	| ChatHubStreamError;

/**
 * Union type of execution-level push messages
 */
export type ChatHubExecutionEvent = ChatHubExecutionBegin | ChatHubExecutionEnd;

/**
 * Union type of all chat push messages
 */
export type ChatHubPushMessage =
	| ChatHubStreamEvent
	| ChatHubExecutionEvent
	| ChatHubHumanMessageCreated
	| ChatHubMessageEdited;

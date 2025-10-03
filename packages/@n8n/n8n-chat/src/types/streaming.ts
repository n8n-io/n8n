/**
 * Agent message chunk for streaming
 */
export interface AgentMessageChunk {
	role: 'assistant';
	type: 'message';
	text: string;
}

export interface ErrorMessageChunk {
	role: 'assistant';
	type: 'error';
	content: string;
}

/**
 * Union type for all stream chunks
 */
export type StreamChunk = AgentMessageChunk | ErrorMessageChunk;

/**
 * Stream output containing messages
 */
export interface StreamOutput {
	messages: StreamChunk[];
}

/**
 * Configuration for stream processing
 */
export interface StreamProcessorConfig {
	/** Thread configuration for retrieving state */
	threadConfig: { configurable: { thread_id: string } };
}

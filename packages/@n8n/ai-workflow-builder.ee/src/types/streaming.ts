/**
 * Agent message chunk for streaming
 */
export interface AgentMessageChunk {
	role: 'assistant';
	type: 'message';
	text: string;
}

/**
 * Tool progress chunk for streaming
 */
export interface ToolProgressChunk {
	type: 'tool';
	toolName: string;
	status: string;
	[key: string]: unknown;
}

/**
 * Generation error tracked during workflow generation.
 */
export interface StreamGenerationError {
	/** The error message */
	message: string;
	/** The code that caused the error (if available) */
	code?: string;
	/** Iteration number when the error occurred */
	iteration: number;
	/** Type of error: 'parse' for SDK parsing, 'typecheck' for TypeScript errors */
	type: 'parse' | 'typecheck';
}

/**
 * Workflow update chunk for streaming
 */
export interface WorkflowUpdateChunk {
	role: 'assistant';
	type: 'workflow-updated';
	/** JSON-stringified workflow */
	codeSnippet: string;
	/** Optional source code that generated the workflow (e.g., TypeScript SDK code) */
	sourceCode?: string;
	/** Token usage statistics from the generation */
	tokenUsage?: {
		inputTokens: number;
		outputTokens: number;
	};
	/** Number of agentic loop iterations required */
	iterationCount?: number;
	/** Errors encountered during generation (parse errors, type errors) */
	generationErrors?: StreamGenerationError[];
}

/**
 * Execution request chunk for streaming
 */
export interface ExecutionRequestChunk {
	role: 'assistant';
	type: 'execution-requested';
	reason: string;
}

/**
 * Union type for all stream chunks
 */
export type StreamChunk =
	| AgentMessageChunk
	| ToolProgressChunk
	| WorkflowUpdateChunk
	| ExecutionRequestChunk;

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
	/** List of tool names that trigger workflow updates */
	workflowUpdateTools?: string[];
}

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
 * Workflow update chunk for streaming
 */
export interface WorkflowUpdateChunk {
	role: 'assistant';
	type: 'workflow-updated';
	codeSnippet: string;
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
 * Plan chunk for streaming
 */
export interface PlanChunk {
	role: 'assistant';
	type: 'plan';
	plan: unknown;
}

/**
 * Plan adjusted chunk for streaming
 */
export interface PlanAdjustedChunk {
	role: 'assistant';
	type: 'plan-adjusted';
	plan: unknown;
}

/**
 * Plan review chunk for streaming (interrupt)
 */
export interface PlanReviewChunk {
	role: 'assistant';
	type: 'plan-review';
	plan: unknown;
	message: string;
	resumable: boolean;
}

/**
 * Union type for all stream chunks
 */
export type StreamChunk =
	| AgentMessageChunk
	| ToolProgressChunk
	| WorkflowUpdateChunk
	| ExecutionRequestChunk
	| PlanChunk
	| PlanAdjustedChunk
	| PlanReviewChunk;

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

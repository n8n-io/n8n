/**
 * Agent message chunk for streaming
 */
import type { PlanOutput, PlannerQuestion } from './planning';

export interface AgentMessageChunk {
	role: 'assistant';
	type: 'message';
	text: string;
	codeSnippet?: string;
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
	/** JSON-stringified workflow */
	codeSnippet: string;
	/** Number of agentic loop iterations required */
	iterationCount?: number;
	/** Source code that generated the workflow (only populated during evaluations) */
	sourceCode?: string;
}

/**
 * Execution request chunk for streaming
 */
export interface ExecutionRequestChunk {
	role: 'assistant';
	type: 'execution-requested';
	reason: string;
}

export interface QuestionsChunk {
	role: 'assistant';
	type: 'questions';
	introMessage?: string;
	questions: PlannerQuestion[];
}

export interface PlanChunk {
	role: 'assistant';
	type: 'plan';
	plan: PlanOutput;
}

/**
 * Session messages chunk for persistence
 * Contains the full message history for saving to session storage
 */
export interface SessionMessagesChunk {
	type: 'session-messages';
	/** Raw LangChain messages for session persistence */
	messages: unknown[];
}

export interface CodeDiffChunk {
	role: 'assistant';
	type: 'code-diff';
	suggestionId: string;
	sdkSessionId: string;
	codeDiff?: string;
	description?: string;
	nodeName?: string;
	quickReplies?: unknown[];
}

/**
 * Signals that message history was compacted (e.g. via /compact).
 * Frontend should clear old messages when this is received.
 */
export interface MessagesCompactedChunk {
	type: 'messages-compacted';
}

/**
 * Summary chunk for structured summary messages from the SDK
 */
export interface SummaryChunk {
	role: 'assistant';
	type: 'summary';
	title: string;
	content: string;
}

/**
 * Agent suggestion chunk for structured suggestion messages from the SDK
 */
export interface AgentSuggestionChunk {
	role: 'assistant';
	type: 'agent-suggestion';
	title: string;
	text: string;
	suggestionId?: string;
}

/**
 * Union type for all stream chunks
 */
export type StreamChunk =
	| AgentMessageChunk
	| ToolProgressChunk
	| WorkflowUpdateChunk
	| ExecutionRequestChunk
	| SessionMessagesChunk
	| QuestionsChunk
	| PlanChunk
	| CodeDiffChunk
	| MessagesCompactedChunk
	| SummaryChunk
	| AgentSuggestionChunk;

/**
 * Stream output containing messages
 */
export interface StreamOutput {
	messages: StreamChunk[];
	/** Optional interrupt id for deduping repeated interrupt emissions */
	interruptId?: string;
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

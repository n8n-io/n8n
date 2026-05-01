import type { StreamChunk } from '../types/streaming';
import type { SimpleWorkflow } from '../types/workflow';

export type { SimpleWorkflow };

/**
 * Minimal interface wrapping AiAssistantClient.chat() for testability.
 * The real AiAssistantClient already satisfies this interface.
 */
export interface AssistantSdkClient {
	chat(payload: { payload: object; sessionId?: string }, user: { id: string }): Promise<Response>;
}

/**
 * Writer function for streaming chunks to the consumer.
 * Both adapters (subgraph config.writer and tool config.writer) pass their own writer.
 */
export type StreamWriter = (chunk: StreamChunk) => void | Promise<void>;

/**
 * Framework-agnostic input context for the assistant handler.
 * Each adapter maps its state to this shape.
 */
export interface AssistantContext {
	query: string;
	workflowJSON?: SimpleWorkflow;
	errorContext?: {
		nodeName: string;
		errorMessage: string;
		errorDescription?: string;
	};
	credentialContext?: {
		credentialType: string;
		displayName?: string;
	};
	/** SDK session ID for conversation continuity */
	sdkSessionId?: string;
	userName?: string;
}

/**
 * Result returned after the SDK stream is fully consumed.
 */
export interface AssistantResult {
	/** Full collected response text */
	responseText: string;
	/** Truncated summary (~200 chars) for agent state */
	summary: string;
	/** SDK session ID for conversation continuity */
	sdkSessionId?: string;
	/** Whether the response contained a code-diff message */
	hasCodeDiff: boolean;
	/** Suggestion IDs from agent-suggestion messages */
	suggestionIds: string[];
}

// ---------------------------------------------------------------------------
// SDK message types — minimal backend-only mirrors of the frontend types
// at packages/frontend/editor-ui/src/features/ai/assistant/assistant.types.ts
// ---------------------------------------------------------------------------

export interface SdkTextMessage {
	role: 'assistant';
	type: 'message';
	text: string;
	codeSnippet?: string;
	quickReplies?: unknown[];
	step?: string;
}

export interface SdkCodeDiffMessage {
	role: 'assistant';
	type: 'code-diff';
	description: string;
	codeDiff: string;
	suggestionId?: string;
	quickReplies?: unknown[];
}

export interface SdkSummaryMessage {
	role: 'assistant';
	type: 'summary';
	title: string;
	content: string;
}

export interface SdkAgentSuggestionMessage {
	role: 'assistant';
	type: 'agent-suggestion';
	title: string;
	text: string;
	suggestionId?: string;
}

export interface SdkIntermediateStep {
	role: 'assistant';
	type: 'intermediate-step';
	text: string;
	step: string;
}

export interface SdkEndSessionEvent {
	type: 'event';
	eventName: 'end-session' | 'session-timeout';
}

export interface SdkErrorMessage {
	role: 'assistant';
	type: 'error';
	text: string;
}

/** Union of all SDK message response types */
export type SdkMessageResponse =
	| SdkTextMessage
	| SdkCodeDiffMessage
	| SdkSummaryMessage
	| SdkAgentSuggestionMessage
	| SdkIntermediateStep
	| SdkEndSessionEvent
	| SdkErrorMessage;

/** Wrapper for a single chunk in the SDK stream */
export interface SdkStreamChunk {
	sessionId?: string;
	messages: SdkMessageResponse[];
}

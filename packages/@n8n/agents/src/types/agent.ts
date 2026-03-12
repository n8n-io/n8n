import type { JSONValue } from '../json';
import type { AgentMessage } from '../message';
import type { AgentEvent, AgentEventHandler } from './event';
import type { FinishReason, StreamChunk, TokenUsage } from './stream';
import type { BuiltTool } from './tool';
import type { SerializedMessageList } from '../runtime/message-list';

export interface AgentResult {
	id?: string;
	finishReason?: FinishReason;
	usage?: TokenUsage;
	/**
	 * The generated message
	 */
	messages: AgentMessage[];
	/**
	 * Metadata about the response from the provider
	 */
	providerMetadata?: Record<string, unknown>;
	rawResponse?: unknown;
	/** Parsed structured output when structuredOutput schema is set. */
	output?: unknown;
}

export interface RunOptions {
	resourceId: string;
	threadId: string;
	maxIterations?: number;
}

export interface ToolResultEntry {
	tool: string;
	input: unknown;
	output: unknown;
}

export interface GenerateResult {
	messages: AgentMessage[];
	structuredOutput?: unknown;
	usage?: TokenUsage;
	finishReason?: FinishReason;
	providerMetadata?: Record<string, unknown>;
	/** Tool calls made during the run (with merged results when available). */
	toolCalls?: ToolResultEntry[];
	/**
	 * Present when the run suspended awaiting tool resume (HITL).
	 * Call `agent.resume('generate', data, { runId, toolCallId })` to resume.
	 */
	pendingSuspend?: {
		runId: string;
		toolCallId: string;
		toolName: string;
		input: unknown;
		suspendPayload: unknown;
	};
	/**
	 * Present when the run ended due to an error (finishReason === 'error').
	 * generate() never throws — errors are surfaced here instead so
	 * callers can handle them without try/catch.
	 */
	error?: unknown;
}

export type StreamResult = ReadableStream<StreamChunk>;

export interface BuiltAgent {
	readonly name: string;

	generate(input: AgentMessage[] | string, options?: RunOptions): Promise<GenerateResult>;
	stream(input: AgentMessage[] | string, options?: RunOptions): Promise<StreamResult>;

	on(event: AgentEvent, handler: AgentEventHandler): void;

	asTool(description: string): BuiltTool;

	getState(): SerializableAgentState;

	/** Cancel the currently running agent. Synchronous — sets an abort flag that the agentic loop checks asynchronously. */
	abort(): void;

	resume(
		method: 'generate',
		data: unknown,
		options: { runId: string; toolCallId: string },
	): Promise<GenerateResult>;
	resume(
		method: 'stream',
		data: unknown,
		options: { runId: string; toolCallId: string },
	): Promise<StreamResult>;
}

// --- Checkpoint Storage ---

export type AgentRunState =
	| 'idle' // agent has not been started yet
	| 'running' // agent is running
	| 'success' // agent stopped successfully
	| 'failed' // agent stopped with an error
	| 'suspended' // agent is suspended by HITL, guardrail, or other control, can be resumed
	| 'waiting' // agent is waiting for a tool call to complete
	| 'cancelled'; // agent was cancelled by the user or engine

export interface AgentResumeData {
	resumeToolCall?: {
		toolCallId: string;
	};
	resumeData: unknown;
}

export interface PendingToolCall {
	toolCallId: string;
	input: JSONValue;
}

export interface SerializableAgentState {
	resourceId: string;
	threadId: string;
	status: AgentRunState;
	messageList: SerializedMessageList;
	resumeData?: AgentResumeData;
	pendingToolCalls: Record<string, PendingToolCall>;
	finishReason?: FinishReason;
	usage?: TokenUsage;
}

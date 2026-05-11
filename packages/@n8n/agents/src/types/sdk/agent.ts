import type { ProviderOptions } from '@ai-sdk/provider-utils';
import type { LanguageModel } from 'ai';
import type { JsonSchema7Type } from 'zod-to-json-schema';

import type { AgentMessage, ContentMetadata } from './message';
import type { BuiltTool } from './tool';
import type { AgentEvent, AgentEventHandler } from '../runtime/event';
import type { SerializedMessageList } from '../runtime/message-list';
import type { BuiltTelemetry } from '../telemetry';
import type { JSONValue } from '../utils/json';

export type FinishReason = 'stop' | 'length' | 'content-filter' | 'tool-calls' | 'error' | 'other';

export type TokenUsage<T extends Record<string, unknown> = Record<string, unknown>> = {
	promptTokens: number;
	completionTokens: number;
	totalTokens: number;
	/** Estimated cost in USD, computed from models.dev pricing. */
	cost?: number;
	inputTokenDetails?: {
		cacheRead?: number;
		cacheWrite?: number;
	};
	outputTokenDetails?: {
		reasoning?: number;
	};
	additionalMetadata?: T;
};

// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents -- LanguageModel is semantically distinct from string
export type ModelConfig = string | { id: string; apiKey?: string; url?: string } | LanguageModel;

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

export type StreamChunk = ContentMetadata &
	(
		| {
				type: 'finish';
				finishReason: FinishReason;
				usage?: TokenUsage;
				model?: string;
				structuredOutput?: unknown;
				subAgentUsage?: SubAgentUsage[];
				totalCost?: number;
		  }
		| {
				type: 'text-delta';
				id?: string;
				delta: string;
		  }
		| {
				type: 'reasoning-delta';
				id?: string;
				delta: string;
		  }
		| {
				type: 'tool-call-delta';
				id?: string;
				name?: string;
				argumentsDelta?: string;
		  }
		| {
				type: 'error';
				error: unknown;
		  }
		| {
				type: 'message';
				message: AgentMessage;
				id?: string;
		  }
		| {
				type: 'tool-call-suspended';
				runId?: string;
				toolCallId?: string;
				toolName?: string;
				input?: unknown;
				suspendPayload?: unknown;
				/** JSON Schema describing the shape of data to send when resuming. */
				resumeSchema?: JsonSchema7Type;
		  }
	);

export interface RunOptions {
	persistence?: AgentPersistenceOptions;
}

export interface ExecutionOptions {
	maxIterations?: number;
	abortSignal?: AbortSignal;
	providerOptions?: ProviderOptions;
	/** Inherited telemetry from a parent agent. Used internally by asTool(). */
	telemetry?: BuiltTelemetry;
}

export interface PersistedExecutionOptions {
	maxIterations?: number;
}

export interface ToolResultEntry {
	tool: string;
	input: unknown;
	output: unknown;
	transformed?: boolean;
}

/** Token usage from a sub-agent called via .asTool(). */
export interface SubAgentUsage {
	/** Name of the sub-agent. */
	agent: string;
	/** Model used by the sub-agent. */
	model?: string;
	/** Token usage for the sub-agent call. */
	usage: TokenUsage;
}

export interface GenerateResult {
	/** Unique identifier for this run. Useful for HITL resume and correlation/logging. */
	runId: string;
	messages: AgentMessage[];
	structuredOutput?: unknown;
	usage?: TokenUsage;
	/** The model ID used for this generation (e.g. 'anthropic/claude-haiku-4-5'). */
	model?: string;
	finishReason?: FinishReason;
	providerMetadata?: Record<string, unknown>;
	/** Tool calls made during the run (with merged results when available). */
	toolCalls?: ToolResultEntry[];
	/** Token usage from sub-agents called via .asTool(). */
	subAgentUsage?: SubAgentUsage[];
	/** Total cost (USD) including this agent + all sub-agents. */
	totalCost?: number;
	/**
	 * Present when the run suspended awaiting tool resume (HITL).
	 * Call `agent.resume('generate', data, { runId, toolCallId })` to resume.
	 */
	pendingSuspend?: Array<{
		runId: string;
		toolCallId: string;
		toolName: string;
		input: unknown;
		suspendPayload: unknown;
		/** JSON Schema describing the shape of data to send when resuming. */
		resumeSchema?: JsonSchema7Type;
	}>;
	/**
	 * Present when the run ended due to an error (finishReason === 'error').
	 * generate() never throws — errors are surfaced here instead so
	 * callers can handle them without try/catch.
	 */
	error?: unknown;
}

export interface StreamResult {
	/** Unique identifier for this run. Available immediately before any chunks are emitted. */
	runId: string;
	/** The readable stream of chunks. */
	stream: ReadableStream<StreamChunk>;
}

export interface ResumeOptions {
	runId: string;
	toolCallId: string;
}

export interface BuiltAgent {
	readonly name: string;

	generate(
		input: AgentMessage[] | string,
		options?: RunOptions & ExecutionOptions,
	): Promise<GenerateResult>;
	stream(
		input: AgentMessage[] | string,
		options?: RunOptions & ExecutionOptions,
	): Promise<StreamResult>;

	on(event: AgentEvent, handler: AgentEventHandler): void;

	asTool(description: string): BuiltTool;

	getState(): SerializableAgentState;

	/** Cancel the currently running agent. Synchronous — sets an abort flag that the agentic loop checks asynchronously. */
	abort(): void;

	/** Resume a tool with custom resume data */
	resume(
		method: 'generate',
		data: unknown,
		options: ResumeOptions & ExecutionOptions,
	): Promise<GenerateResult>;
	resume(
		method: 'stream',
		data: unknown,
		options: ResumeOptions & ExecutionOptions,
	): Promise<StreamResult>;

	/** Approve a tool that uses requiresApproval or needsApprovalFn */
	approve(method: 'generate', options: ResumeOptions & ExecutionOptions): Promise<GenerateResult>;
	approve(method: 'stream', options: ResumeOptions & ExecutionOptions): Promise<StreamResult>;

	/** Deny a tool that uses requiresApproval or needsApprovalFn */
	deny(method: 'generate', options: ResumeOptions & ExecutionOptions): Promise<GenerateResult>;
	deny(method: 'stream', options: ResumeOptions & ExecutionOptions): Promise<StreamResult>;
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

export type PendingToolCall = {
	toolCallId: string;
	toolName: string;
	input: JSONValue;
} & (
	| {
			suspended: true;
			suspendPayload: unknown;
			resumeSchema: JsonSchema7Type;
	  }
	| {
			suspended: false;
	  }
);

export interface SerializableAgentState {
	persistence?: AgentPersistenceOptions;
	status: AgentRunState;
	messageList: SerializedMessageList;
	resumeData?: AgentResumeData;
	pendingToolCalls: Record<string, PendingToolCall>;
	finishReason?: FinishReason;
	usage?: TokenUsage;
	executionOptions?: PersistedExecutionOptions;
}

export type AgentPersistenceOptions = {
	threadId: string;
	resourceId: string;
};

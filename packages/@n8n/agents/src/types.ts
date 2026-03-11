import type { z } from 'zod';

/**
 * Local definition replacing a deep internal Mastra import
 * (`@mastra/core/dist/_types/@internal_external-types/dist`).
 * Covers the shape we actually use for provider-defined tools.
 */
export interface ProviderDefinedTool {
	type: 'provider-defined';
	id: string;
	args: Record<string, unknown>;
}

import type { ContentMetadata, Message, MessageContent } from './message';

// --- Run States ---

export type RunState = 'running' | 'suspended' | 'paused' | 'blocked' | 'completed' | 'failed';

// --- Run Events ---

export interface StepEvent {
	step: number;
	toolCalls: Array<{ tool: string; input: unknown }>;
	tokens: { input: number; output: number };
}

export interface ToolCallEvent {
	tool: string;
	input: unknown;
	output: unknown;
	duration: number;
}

export interface MessageEvent {
	role: 'user' | 'assistant' | 'system' | 'tool';
	content: string;
}

export interface StateChangeEvent {
	from: RunState;
	to: RunState;
	context: {
		suspendId?: string;
		pauseId?: string;
		reason?: string;
	};
}

export interface EvalEvent {
	scorer: string;
	score: number;
	reasoning: string;
}

export interface ErrorEvent {
	error: Error;
	step: number;
	recoverable: boolean;
}

export type RunEventMap = {
	step: StepEvent;
	toolCall: ToolCallEvent;
	message: MessageEvent;
	stateChange: StateChangeEvent;
	eval: EvalEvent;
	error: ErrorEvent;
};

export type RunEvent = keyof RunEventMap;

// --- Provider Types ---

/**
 * Known providers with typed thinking configs. The `(string & {})` escape
 * hatch lets any provider string pass while preserving autocomplete for
 * the known ones.
 */
export type Provider =
	| 'anthropic'
	| 'cerebras'
	| 'deepinfra'
	| 'deepseek'
	| 'google'
	| 'groq'
	| 'mistral'
	| 'openai'
	| 'openrouter'
	| 'perplexity'
	| 'togetherai'
	| 'vercel'
	| 'xai'
	| (string & {});

// --- Per-Provider Thinking Configs ---

export interface AnthropicThinkingConfig {
	/** Token budget for extended thinking. Defaults to 10000. */
	budgetTokens?: number;
}

export interface OpenAIThinkingConfig {
	/** Reasoning effort level. Defaults to 'medium'. */
	reasoningEffort?: 'low' | 'medium' | 'high';
}

export interface GoogleThinkingConfig {
	/** Token budget for thinking. */
	thinkingBudget?: number;
	/** Thinking level preset. */
	thinkingLevel?: 'minimal' | 'low' | 'medium' | 'high';
}

export interface XaiThinkingConfig {
	/** Reasoning effort level. */
	reasoningEffort?: 'low' | 'high';
}

/**
 * Resolve thinking config type from provider.
 * Known providers get their specific config; unknown providers default
 * to OpenAI-style (reasoningEffort) since most providers follow that API.
 */
export type ThinkingConfigFor<P> = P extends 'anthropic'
	? AnthropicThinkingConfig
	: P extends 'google'
		? GoogleThinkingConfig
		: P extends 'xai'
			? XaiThinkingConfig
			: P extends string
				? OpenAIThinkingConfig
				: ThinkingConfig;

/** Union of all thinking configs (used when provider is unknown). */
export type ThinkingConfig =
	| AnthropicThinkingConfig
	| OpenAIThinkingConfig
	| GoogleThinkingConfig
	| XaiThinkingConfig;

// --- Run Options ---

export interface RunOptions {
	resourceId?: string;
	threadId?: string;
}

// --- Agent Result ---

export type FinishReason = 'stop' | 'length' | 'content-filter' | 'tool-calls' | 'error' | 'other';

export type TokenUsage<T extends Record<string, unknown> = Record<string, unknown>> = {
	promptTokens: number;
	completionTokens: number;
	totalTokens: number;
	inputTokenDetails?: {
		cacheRead?: number;
	};
	outputTokenDetails?: {
		reasoning?: number;
	};
	additionalMetadata?: T;
};

export interface AgentResult {
	id?: string;
	finishReason?: FinishReason;
	usage?: TokenUsage;
	/**
	 * The generated message
	 */
	messages: Message[];
	/**
	 * Metadata about the response from the provider
	 */
	providerMetadata?: Record<string, unknown>;
	rawResponse?: unknown;
	/** Tool calls made during the run (with merged results when available). */
	toolCalls?: Array<{ tool: string; input: unknown; output: unknown }>;
	/** Number of agent steps (e.g. turns with tool use). */
	steps?: number;
	/** Parsed structured output when structuredOutput schema is set. */
	output?: unknown;
}

export type StreamChunk = ContentMetadata &
	(
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
				type: 'finish';
				finishReason: FinishReason;
				usage?: TokenUsage;
		  }
		| {
				type: 'error';
				error: unknown;
		  }
		| {
				type: 'content';
				content: MessageContent;
				id?: string;
		  }
		| {
				type: 'tool-call-suspended';
				runId?: string;
				toolCallId?: string;
				toolName?: string;
				input?: unknown;
				suspendPayload?: unknown;
		  }
	);

// --- Tool Context ---

export type ToolContext = Record<string, never>;

export interface InterruptibleToolContext<S = unknown, R = unknown> {
	suspend: (payload: S) => Promise<never>;
	resumeData: R | undefined;
}

// --- Built types (opaque handles returned by .build()) ---

export interface BuiltTool {
	readonly name: string;
	readonly description: string;
	/** @internal */ readonly _mastraTool: unknown;
	/** @internal */ readonly _suspendSchema?: z.ZodType;
	/** @internal */ readonly _resumeSchema?: z.ZodType;
	/** @internal */ readonly _toMessage?: (output: unknown) => Message | undefined;
	/** @internal */ readonly _storeResults?: boolean;
}

/** A provider-defined tool (e.g. Anthropic web search, OpenAI code interpreter). */
export interface BuiltProviderTool {
	readonly name: string;
	/** @internal */ readonly _providerTool: ProviderDefinedTool;
}

export interface BuiltMemory {
	/** @internal */ readonly _mastraMemory: unknown;
}

export interface BuiltGuardrail {
	readonly name: string;
	readonly guardType: 'pii' | 'prompt-injection' | 'moderation' | 'custom';
	readonly strategy: 'block' | 'redact' | 'warn';
	/** @internal */ readonly _config: Record<string, unknown>;
}

export interface BuiltScorer {
	readonly name: string;
	readonly scorerType: string;
	readonly sampling: number;
	/** @internal */ readonly _mastraScorer: unknown;
}

export interface BuiltAgent {
	readonly name: string;
	run(input: Message[], options?: RunOptions): Run;
	stream(input: Message[], options?: RunOptions): Run;
	streamText(
		input: Message[],
		options?: RunOptions,
	): Promise<{
		fullStream: ReadableStream<StreamChunk>;
		textStream: ReadableStream<string>;
		getResult: () => Promise<AgentResult>;
	}>;
	asTool(description: string): BuiltTool;
	resume(
		data: unknown,
		options: { runId: string; toolCallId: string },
	): Promise<{ fullStream: ReadableStream<StreamChunk> }>;
}

export interface BuiltNetwork {
	readonly name: string;
	run(prompt: string, options?: RunOptions): Run;
}

// --- Run Object ---

export interface Run {
	readonly state: RunState;
	readonly result: Promise<AgentResult>;
	on<E extends RunEvent>(event: E, handler: (data: RunEventMap[E]) => void): void;
	resume(pauseId: string, data: unknown): Promise<void>;
	abort(reason?: string): void;
}

// --- Guardrail Types ---

export type GuardrailType = 'pii' | 'prompt-injection' | 'moderation' | 'custom';
export type GuardrailStrategy = 'block' | 'redact' | 'warn';
export type PiiDetectionType = 'email' | 'phone' | 'credit-card' | 'ssn' | 'address';

// --- Checkpoint Storage ---

/**
 * Opaque serialized snapshot of an agent's execution state.
 * Treat as a JSON-serializable blob — store and retrieve without inspecting.
 */
export type RunSnapshot = Record<string, unknown>;

/**
 * Interface for persisting agent execution snapshots (used for tool suspend/resume / human-in-the-loop).
 *
 * The execution engine implements this backed by its own database.
 * The SDK uses it internally to provide durable snapshot storage that
 * survives process restarts. Transient execution state (step results,
 * workflow state) is handled in-memory by the runtime — only snapshots
 * need external persistence.
 *
 * Snapshot data is opaque and JSON-serializable. The engine stores and
 * retrieves it without inspecting the contents.
 *
 * The `key` parameter is a composite identifier (e.g. `workflowName:runId`)
 * that uniquely identifies a snapshot. The engine should treat it as an
 * opaque string key.
 */
export interface CheckpointStore {
	/** Persist a snapshot. Overwrites any existing snapshot for the same key. */
	save(key: string, snapshot: RunSnapshot): Promise<void>;
	/** Load a snapshot by key. Returns `undefined` if not found. */
	load(key: string): Promise<RunSnapshot | undefined>;
	/** Delete a snapshot by key. */
	delete(key: string): Promise<void>;
}

// --- Evaluation Types ---

/** Input provided to every eval function. */
export interface EvalInput {
	/** The prompt sent to the agent. */
	input: string;
	/** The agent's response text. */
	output: string;
	/** Expected answer from the dataset (if provided). */
	expected?: string;
	/** Tool calls the agent made during execution. */
	toolCalls?: Array<{ tool: string; input: unknown; output: unknown }>;
}

/** Result returned by an eval — pass/fail with reasoning. */
export interface EvalScore {
	/** Whether the eval passed. */
	pass: boolean;
	/** Explanation of why the eval passed or failed. */
	reasoning: string;
}

/** Callable function bound to the judge model for LLM-as-judge evals. */
export type JudgeFn = (prompt: string) => Promise<{ text: string }>;

/** Context passed to an LLM-as-judge handler. */
export interface JudgeInput extends EvalInput {
	/** Call the judge model with a prompt. */
	llm: JudgeFn;
}

/** A deterministic check function. */
export type CheckFn = (input: EvalInput) => EvalScore | Promise<EvalScore>;

/** An LLM-as-judge handler function. */
export type JudgeHandlerFn = (input: JudgeInput) => EvalScore | Promise<EvalScore>;

/** Opaque handle for a built eval (internal). */
export interface BuiltEval {
	readonly name: string;
	readonly description?: string;
	/** @internal */ readonly _run: (input: EvalInput) => Promise<EvalScore>;
}

/** Result of evaluate() for a single dataset row. */
export interface EvalRunResult {
	input: string;
	output: string;
	expected?: string;
	scores: Record<string, EvalScore>;
}

/** Full results from evaluate(). */
export interface EvalResults {
	runs: EvalRunResult[];
	summary: Record<string, { passed: number; failed: number; total: number }>;
}

// --- Semantic Recall Config ---

export interface SemanticRecallConfig {
	topK: number;
	messageRange?: { before: number; after: number };
}

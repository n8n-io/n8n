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

import type { Message } from './message';

// --- Run States ---

export type RunState =
	| 'running'
	| 'waiting_approval'
	| 'paused'
	| 'blocked'
	| 'completed'
	| 'failed';

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
		approvalId?: string;
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

// --- Run Options ---

export interface RunOptions {
	resourceId?: string;
	threadId?: string;
}

// --- Agent Result ---

export interface AgentResult<TOutput = unknown> {
	text: string;
	toolCalls: Array<{ tool: string; input: unknown; output: unknown }>;
	tokens: { input: number; output: number };
	steps: number;
	/** Structured output parsed from the response (when structuredOutput is configured). */
	output?: TOutput;
}

// --- Tool Context ---

export interface PauseOptions {
	reason: string;
	requestedInput?: z.ZodType;
}

export interface ToolContext {
	pause: (options: PauseOptions) => Promise<void>;
}

// --- Built types (opaque handles returned by .build()) ---

export interface BuiltTool {
	readonly name: string;
	readonly description: string;
	/** @internal */ readonly _mastraTool: unknown;
	/** @internal */ readonly _approval?: boolean | ((input: unknown) => boolean | Promise<boolean>);
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
		textStream: ReadableStream<string>;
		fullStream: ReadableStream<unknown>;
		getResult: () => Promise<AgentResult>;
	}>;
	asTool(description: string): BuiltTool;
	approveToolCall(
		runId: string,
		toolCallId?: string,
	): Promise<{ fullStream: ReadableStream<unknown> }>;
	declineToolCall(
		runId: string,
		toolCallId?: string,
	): Promise<{ fullStream: ReadableStream<unknown> }>;
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
	approve(approvalId: string): Promise<void>;
	deny(approvalId: string, reason?: string): Promise<void>;
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
 * Interface for persisting agent execution snapshots (used for tool approval / human-in-the-loop).
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

// --- Semantic Recall Config ---

export interface SemanticRecallConfig {
	topK: number;
	messageRange?: { before: number; after: number };
}

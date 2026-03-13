import type { ZodType } from 'zod';

// ---------------------------------------------------------------------------
// Agent types — uses `unknown` to avoid importing @n8n/agents at build time
// (TS moduleResolution can't resolve the workspace-linked package).
// The real Agent/Tool objects come from require("@n8n/agents") in compiled
// workflow code; the bridge casts to its own AgentLike at runtime.
// ---------------------------------------------------------------------------

export interface StepDefinition {
	/** Step display name (shown on canvas) */
	name: string;
	/** What this step does (shown below name on canvas) */
	description?: string;
	/** Lucide icon name (e.g., 'globe', 'database', 'zap') */
	icon?: string;
	/** Hex color for the canvas stripe (e.g., '#3b82f6') */
	color?: string;
	/** Step type for special behavior */
	stepType?: 'step' | 'approval' | 'condition';
	/** Retry configuration */
	retry?: RetryConfig;
	/** Step timeout in milliseconds */
	timeout?: number;
	/** Error codes that should trigger retry */
	retriableErrors?: string[];
	/** Whether to retry on timeout */
	retryOnTimeout?: boolean;
}

export interface BatchStepDefinition {
	/** Step display name (shown on canvas) */
	name: string;
	/** What this step does (shown below name on canvas) */
	description?: string;
	/** Lucide icon name (e.g., 'globe', 'database', 'zap') */
	icon?: string;
	/** Hex color for the canvas stripe (e.g., '#3b82f6') */
	color?: string;
	/** Strategy when an individual item fails */
	onItemFailure?: 'fail-fast' | 'continue' | 'abort-remaining';
	/** Retry configuration */
	retry?: RetryConfig;
	/** Step timeout in milliseconds */
	timeout?: number;
}

export interface BatchConfig {
	onItemFailure?: 'fail-fast' | 'continue' | 'abort-remaining';
}

export interface BatchResult<T> {
	status: 'fulfilled' | 'rejected';
	value?: T;
	reason?: Error;
}

export interface RetryConfig {
	maxAttempts: number;
	baseDelay: number;
	maxDelay?: number;
	jitter?: boolean;
}

export interface WebhookResponse {
	statusCode?: number;
	body?: unknown;
	headers?: Record<string, string>;
}

export type WebhookResponseMode = 'lastNode' | 'respondImmediately' | 'respondWithNode' | 'allData';

export interface TriggerConfig {
	type: 'webhook' | 'manual' | 'poll';
	config: Record<string, unknown>;
	code?: string;
}

export interface WebhookSchemaConfig {
	body?: ZodType;
	query?: ZodType;
	headers?: ZodType;
}

/** Infers the triggerData shape from a webhook schema config */
export type InferTriggerData<S extends WebhookSchemaConfig | undefined> =
	S extends WebhookSchemaConfig
		? {
				body: S['body'] extends ZodType<infer T> ? T : unknown;
				query: S['query'] extends ZodType<infer T> ? T : unknown;
				headers: S['headers'] extends ZodType<infer T> ? T : unknown;
				method: string;
				path: string;
			}
		: { body: unknown; query: unknown; headers: unknown; method: string; path: string };

export interface WebhookTriggerConfig<S extends WebhookSchemaConfig | undefined = undefined>
	extends TriggerConfig {
	type: 'webhook';
	config: {
		path: string;
		method: string;
		responseMode?: WebhookResponseMode;
		schema?: {
			body?: Record<string, unknown>;
			query?: Record<string, unknown>;
			headers?: Record<string, unknown>;
		};
	};
	/** Phantom type — carries the schema type for inference, not present at runtime */
	_triggerData?: InferTriggerData<S>;
}

/** Extracts the inferred triggerData type from a triggers array */
type InferTriggerDataFromArray<T> = T extends readonly [WebhookTriggerConfig<infer S>, ...unknown[]]
	? InferTriggerData<S>
	: T extends readonly WebhookTriggerConfig<infer S>[]
		? InferTriggerData<S>
		: Record<string, unknown>;

export interface TriggerWorkflowConfig {
	/** Workflow name to trigger (resolved to ID at runtime) */
	workflow: string;
	input?: Record<string, unknown>;
	timeout?: number;
}

export interface AgentStepConfig {
	name: string;
	description?: string;
	icon?: string;
	color?: string;
	/** Timeout for the entire agent invocation (default: 600_000ms / 10 min) */
	timeout?: number;
}

export interface AgentStepResult {
	/** 'completed' when the agent finished, 'suspended' when a tool needs external input */
	status: 'completed' | 'suspended';
	/** Final agent output (when status === 'completed') */
	output?: unknown;
	/** Opaque snapshot blob for restoring agent state on resume (when status === 'suspended') */
	snapshot?: unknown;
	/** What condition must be met before the engine resumes this step */
	resumeCondition?: ResumeCondition;
	/** Human-readable payload describing what the tool needs (when status === 'suspended') */
	suspendPayload?: unknown;
	/** Token usage for this invocation */
	usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
	/** Tool calls made during this invocation */
	toolCalls?: Array<{ tool: string; input: unknown; output: unknown }>;
}

export type ResumeCondition =
	| { type: 'approval' }
	| { type: 'chat'; prompt?: string }
	| { type: 'webhook'; path?: string };

export interface ExecutionContext<TTriggerData = Record<string, unknown>> {
	input: Record<string, unknown>;
	triggerData: TTriggerData;
	/** The error from a failed try-block step — set by the engine for catch handler steps */
	error?: unknown;
	/** The current batch item — set by the engine when executing a batch child step */
	batchItem?: unknown;
	executionId: string;
	stepId: string;
	attempt: number;
	step: <T>(definition: StepDefinition, fn: () => Promise<T>) => Promise<T>;
	/** Define an approval step that pauses execution until a human approves or declines. The function body returns the approval context shown to the approver. */
	approval: <T>(
		definition: StepDefinition,
		fn: () => Promise<T>,
	) => Promise<T & { approved: boolean }>;
	batch: <T, I>(
		definition: BatchStepDefinition,
		items: I[],
		fn: (item: I, index: number) => Promise<T>,
	) => Promise<BatchResult<T>[]>;
	sendChunk: (data: unknown) => Promise<void>;
	respondToWebhook: (response: WebhookResponse) => Promise<void>;
	/** Pause execution for the given duration. Handled at compile time by the transpiler — creates a sleep graph node. */
	sleep: (ms: number) => Promise<void>;
	/** Pause execution until the given date. Handled at compile time by the transpiler — creates a sleep graph node. */
	waitUntil: (date: Date) => Promise<void>;
	/** Trigger another workflow and wait for its result. Handled at compile time by the transpiler — creates a trigger-workflow graph node. */
	triggerWorkflow: (config: TriggerWorkflowConfig) => Promise<unknown>;
	/**
	 * Run an agent as a workflow step. The agent is built from the @n8n/agents
	 * framework and executed within the engine's lifecycle (suspend/resume,
	 * credential resolution).
	 *
	 * When a tool suspends, the step completes with status 'suspended' and the
	 * engine arranges the resume condition. On resume, this method is called again
	 * with the agent's state restored.
	 */
	agent: (agent: unknown, input: string | unknown[]) => Promise<AgentStepResult>;
	getSecret: (name: string) => string | undefined;
}

export interface WorkflowDefinition<T extends readonly TriggerConfig[] = TriggerConfig[]> {
	name: string;
	triggers?: T;
	settings?: WorkflowSettings;
	run: (ctx: ExecutionContext<InferTriggerDataFromArray<T>>) => Promise<unknown>;
}

export interface WorkflowSettings {
	executionMode?: 'queued' | 'in-process';
}

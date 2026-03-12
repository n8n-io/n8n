import type { ZodType } from 'zod';

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

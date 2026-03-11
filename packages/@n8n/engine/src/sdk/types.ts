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
	/** Internal: continuation function reference (set by transpiler) */
	continuationRef?: string;
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

export interface WebhookTriggerConfig extends TriggerConfig {
	type: 'webhook';
	config: {
		path: string;
		method: string;
		responseMode?: WebhookResponseMode;
	};
}

export interface ExecutionContext {
	input: Record<string, unknown>;
	triggerData: Record<string, unknown>;
	executionId: string;
	stepId: string;
	attempt: number;
	step: <T>(definition: StepDefinition, fn: () => Promise<T>) => Promise<T>;
	sendChunk: (data: unknown) => Promise<void>;
	respondToWebhook: (response: WebhookResponse) => Promise<void>;
	sleep: (ms: number) => Promise<void>;
	waitUntil: (date: Date) => Promise<void>;
	getSecret: (name: string) => string | undefined;
}

export interface WorkflowDefinition {
	name: string;
	triggers?: TriggerConfig[];
	settings?: WorkflowSettings;
	run: (ctx: ExecutionContext) => Promise<unknown>;
}

export interface WorkflowSettings {
	executionMode?: 'queued' | 'in-process';
}

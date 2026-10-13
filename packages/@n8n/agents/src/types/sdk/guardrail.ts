import type { TokenUsage } from './agent';

export type GuardrailType = 'pii' | 'prompt-injection' | 'moderation' | 'custom';
export type GuardrailStrategy = 'block' | 'redact' | 'warn';
/** Re-exported so the detection vocabulary has one definition (see `@n8n/utils`). */
export type { PiiDetectionType } from '@n8n/utils/redaction/pii-patterns';

export interface BuiltGuardrail {
	readonly name: string;
	readonly guardType: 'pii' | 'prompt-injection' | 'moderation' | 'custom';
	readonly strategy: 'block' | 'redact' | 'warn';
	/** @internal */ readonly _config: Record<string, unknown>;
}

export type GuardrailDecision = { action: 'allow' } | { action: 'stop'; code: string };

export type GuardrailStop = { code: string };
export type GuardrailModelCallSource = 'turn' | 'title' | 'memory';

export interface GuardrailModelCallContext {
	/** New id for every attempt, including an empty-turn retry. */
	callId: string;
	agentId?: string;
	threadId?: string;
	model: string;
	source: GuardrailModelCallSource;
}

export interface GuardrailToolCallContext {
	toolCallId: string;
	toolName: string;
	input: unknown;
	runId: string;
	agentId?: string;
	threadId?: string;
}

/**
 * Hooks around model and tool calls. A `before*` hook returns `undefined` or
 * `allow` to continue, or `stop` to refuse the call.
 */
export interface ModelGuardrail {
	before?(ctx: GuardrailModelCallContext): Promise<GuardrailDecision | undefined>;
	after?(ctx: GuardrailModelCallContext, usage: TokenUsage | undefined): Promise<void>;
	beforeTool?(ctx: GuardrailToolCallContext): Promise<GuardrailDecision | undefined>;
	afterTool?(ctx: GuardrailToolCallContext, result: unknown): Promise<void>;
}

/** Host-supplied on `ExecutionOptions`. The SDK never looks up settings. */
export interface GuardrailsOptions {
	hooks: ModelGuardrail[];
	agentId?: string;
	threadId?: string;
}

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

export type GuardrailDecision =
	| { action: 'allow' }
	| { action: 'stop'; code: string }
	| { action: 'redact'; code: string; value: unknown };

/**
 * A model-call hook can only allow or stop: the model-call runner has no
 * redact handling, so a redact there would silently send the unredacted
 * request. Redaction belongs to the tool-call stages.
 */
export type GuardrailModelCallDecision = { action: 'allow' } | { action: 'stop'; code: string };

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
 * Hooks around model and tool calls. A tool-call hook returns `undefined` or
 * `allow` to continue, `stop` to refuse the call, or `redact` to continue
 * with the rewritten value: a before-stage redact rewrites the tool input,
 * an after-stage redact rewrites the tool result. A model-call hook can only
 * allow or stop.
 */
export interface ModelGuardrail {
	before?(ctx: GuardrailModelCallContext): Promise<GuardrailModelCallDecision | undefined>;
	after?(ctx: GuardrailModelCallContext, usage: TokenUsage | undefined): Promise<void>;
	beforeTool?(ctx: GuardrailToolCallContext): Promise<GuardrailDecision | undefined>;
	afterTool?(
		ctx: GuardrailToolCallContext,
		result: unknown,
	): Promise<GuardrailDecision> | Promise<void>;
}

/**
 * What an after-stage tool check decided: stop the call, or continue with the
 * redacted result.
 */
export type GuardrailToolCallOutcome = { stop: GuardrailStop } | { redacted: unknown };

/** Host-supplied on `ExecutionOptions`. The SDK never looks up settings. */
export interface GuardrailsOptions {
	hooks: ModelGuardrail[];
	agentId?: string;
	threadId?: string;
	onNotice?: (notice: GuardrailNotice) => void;
}

export type GuardrailNotice = {
	code: string;
	agentId?: string;
	/** Marks a non-blocking outcome so the session timeline can show it later. */
	outcome?: 'redact' | 'review';
};

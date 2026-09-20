import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { Serialized } from '@langchain/core/load/serializable';
import type { BaseMessage } from '@langchain/core/messages';
import type { LLMResult } from '@langchain/core/outputs';
import type { IDataObject } from 'n8n-workflow';

/*
 * Everything the reviewer (and any analytics on the review service) may want to
 * know about how a draft was produced: each model call with its prompt, answer,
 * tokens and cost; each tool call; totals; the model configuration; and the
 * workflow context. Sent to the service as the `agent` field of a registration.
 */

export const AGENT_TRACE_SCHEMA_VERSION = 2;

export interface TraceMessage {
	role: string;
	content: string;
	/** Present when the content was cut to the configured limit. */
	truncated?: boolean;
}

export interface TokenUsage {
	input: number;
	output: number;
	cacheRead: number;
	cacheWrite: number;
	total: number;
}

export interface Cost {
	input: number;
	output: number;
	cache: number;
	total: number;
	currency: 'USD';
}

export interface LlmCall {
	index: number;
	model: string;
	provider: string;
	startedAt: string;
	latencyMs: number;
	input: TraceMessage[];
	output: string;
	/** Tool invocations the model asked for in this turn. */
	toolCallsRequested: Array<{ name: string; args: unknown }>;
	stopReason?: string;
	usage: TokenUsage;
	cost?: Cost;
	error?: string;
}

export interface ToolCall {
	index: number;
	name: string;
	input: string;
	output: string;
	startedAt: string;
	latencyMs: number;
	error?: string;
}

export interface Pricing {
	/** USD per 1M tokens. */
	input: number;
	output: number;
	cacheRead?: number;
	cacheWrite?: number;
}

export interface AgentTrace {
	schemaVersion: typeof AGENT_TRACE_SCHEMA_VERSION;
	startedAt: string;
	endedAt: string;
	latencyMs: number;
	model: {
		provider: string;
		name: string;
		params: IDataObject;
		fallback?: { provider: string; name: string };
	};
	prompt: { input: string; systemMessage: string };
	llmCalls: LlmCall[];
	toolCalls: ToolCall[];
	usage: TokenUsage & { llmCalls: number };
	cost?: Cost & { pricing: { source: 'builtin' | 'override'; model: string; ratesPer1M: Pricing } };
	tools: {
		available: Array<{ name: string; description: string }>;
		memory: { connected: boolean; type?: string };
		outputParser: { connected: boolean; type?: string };
	};
	context: IDataObject;
	errors: Array<{ stage: string; message: string }>;
}

/* ------------------------------------------------------------------ pricing */

/**
 * List prices in USD per 1M tokens. Cache rates follow each vendor's published
 * multipliers (Anthropic: read 10%, write 125%; OpenAI: read 25–50%). Keys are
 * matched as prefixes of the model id, longest first, so dated variants resolve.
 */
const BUILTIN_PRICING: Record<string, Pricing> = {
	// Anthropic
	'claude-opus-4-5': { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
	'claude-opus-4-1': { input: 15, output: 75, cacheRead: 1.5, cacheWrite: 18.75 },
	'claude-opus-4': { input: 15, output: 75, cacheRead: 1.5, cacheWrite: 18.75 },
	'claude-sonnet-4': { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
	'claude-3-7-sonnet': { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
	'claude-3-5-sonnet': { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
	'claude-haiku-4-5': { input: 1, output: 5, cacheRead: 0.1, cacheWrite: 1.25 },
	'claude-3-5-haiku': { input: 0.8, output: 4, cacheRead: 0.08, cacheWrite: 1 },
	// OpenAI
	'gpt-5-nano': { input: 0.05, output: 0.4, cacheRead: 0.005 },
	'gpt-5-mini': { input: 0.25, output: 2, cacheRead: 0.025 },
	'gpt-5': { input: 1.25, output: 10, cacheRead: 0.125 },
	'gpt-4.1-nano': { input: 0.1, output: 0.4, cacheRead: 0.025 },
	'gpt-4.1-mini': { input: 0.4, output: 1.6, cacheRead: 0.1 },
	'gpt-4.1': { input: 2, output: 8, cacheRead: 0.5 },
	'gpt-4o-mini': { input: 0.15, output: 0.6, cacheRead: 0.075 },
	'gpt-4o': { input: 2.5, output: 10, cacheRead: 1.25 },
	'o4-mini': { input: 1.1, output: 4.4, cacheRead: 0.275 },
	o3: { input: 2, output: 8, cacheRead: 0.5 },
	// Google
	'gemini-2.5-pro': { input: 1.25, output: 10, cacheRead: 0.31 },
	'gemini-2.5-flash-lite': { input: 0.1, output: 0.4, cacheRead: 0.025 },
	'gemini-2.5-flash': { input: 0.3, output: 2.5, cacheRead: 0.075 },
	'gemini-2.0-flash': { input: 0.1, output: 0.4, cacheRead: 0.025 },
};

export function resolvePricing(
	modelName: string,
	override: Record<string, Pricing> = {},
): { rates: Pricing; source: 'builtin' | 'override' } | undefined {
	const name = modelName.toLowerCase();
	const match = (table: Record<string, Pricing>) =>
		Object.keys(table)
			.filter((key) => name.startsWith(key.toLowerCase()) || name === key.toLowerCase())
			.sort((a, b) => b.length - a.length)[0];

	const overridden = match(override);
	if (overridden) return { rates: override[overridden], source: 'override' };
	const builtin = match(BUILTIN_PRICING);
	if (builtin) return { rates: BUILTIN_PRICING[builtin], source: 'builtin' };
	return undefined;
}

export function computeCost(usage: TokenUsage, rates: Pricing): Cost {
	const perToken = (rate: number | undefined) => (rate ?? 0) / 1_000_000;
	const input = usage.input * perToken(rates.input);
	const output = usage.output * perToken(rates.output);
	const cache =
		usage.cacheRead * perToken(rates.cacheRead ?? rates.input) +
		usage.cacheWrite * perToken(rates.cacheWrite ?? rates.input);
	const round = (n: number) => Math.round(n * 1e8) / 1e8;
	return {
		input: round(input),
		output: round(output),
		cache: round(cache),
		total: round(input + output + cache),
		currency: 'USD',
	};
}

/* ------------------------------------------------------------------- usage */

type RawUsage = {
	promptTokens?: number;
	completionTokens?: number;
	input_tokens?: number;
	output_tokens?: number;
	cache_read_input_tokens?: number;
	cache_creation_input_tokens?: number;
	input_token_details?: { cache_read?: number; cache_creation?: number };
	prompt_tokens_details?: { cached_tokens?: number };
};

const emptyUsage = (): TokenUsage => ({
	input: 0,
	output: 0,
	cacheRead: 0,
	cacheWrite: 0,
	total: 0,
});

/**
 * Providers report usage under different keys: OpenAI-style `tokenUsage`,
 * Anthropic-style `usage`, or LangChain's normalised `usage_metadata` on the
 * message. Read whichever is present, cache counters included.
 */
export function extractTokenUsage(result: LLMResult): TokenUsage {
	const message = result.generations?.[0]?.[0] as
		| { message?: { usage_metadata?: RawUsage } }
		| undefined;
	const candidates: Array<RawUsage | undefined> = [
		message?.message?.usage_metadata,
		result.llmOutput?.usage as RawUsage | undefined,
		result.llmOutput?.tokenUsage as RawUsage | undefined,
	];
	for (const raw of candidates) {
		if (!raw) continue;
		const input = raw.promptTokens ?? raw.input_tokens;
		const output = raw.completionTokens ?? raw.output_tokens;
		if (input === undefined && output === undefined) continue;
		const cacheRead =
			raw.input_token_details?.cache_read ??
			raw.cache_read_input_tokens ??
			raw.prompt_tokens_details?.cached_tokens ??
			0;
		const cacheWrite =
			raw.input_token_details?.cache_creation ?? raw.cache_creation_input_tokens ?? 0;
		const usage: TokenUsage = {
			input: input ?? 0,
			output: output ?? 0,
			cacheRead,
			cacheWrite,
			total: 0,
		};
		usage.total = usage.input + usage.output + usage.cacheRead + usage.cacheWrite;
		return usage;
	}
	return emptyUsage();
}

function addUsage(into: TokenUsage, add: TokenUsage) {
	into.input += add.input;
	into.output += add.output;
	into.cacheRead += add.cacheRead;
	into.cacheWrite += add.cacheWrite;
	into.total += add.total;
}

/* ------------------------------------------------------------------- model */

/** Reads the identifying fields off a LangChain chat model without a hard type dependency. */
export function describeModel(model: BaseChatModel): {
	provider: string;
	name: string;
	params: IDataObject;
} {
	const record = model as unknown as Record<string, unknown>;
	const name = String(record.model ?? record.modelName ?? record.modelId ?? 'unknown');
	let provider = 'unknown';
	try {
		provider = model._llmType();
	} catch {
		// Not every model implements it
	}
	const params: IDataObject = {};
	for (const key of [
		'temperature',
		'maxTokens',
		'maxTokensToSample',
		'topP',
		'topK',
		'frequencyPenalty',
		'presencePenalty',
		'timeout',
		'maxRetries',
	]) {
		const value = record[key];
		if (typeof value === 'number' || typeof value === 'string') params[key] = value;
	}
	return { provider, name, params };
}

/* ---------------------------------------------------------------- callback */

function messageToTrace(message: BaseMessage, limit: number): TraceMessage {
	const role = (message as { _getType?: () => string })._getType?.() ?? 'unknown';
	const content =
		typeof message.content === 'string' ? message.content : JSON.stringify(message.content);
	return clip({ role, content }, limit);
}

function clip(message: TraceMessage, limit: number): TraceMessage {
	if (limit > 0 && message.content.length > limit) {
		return { ...message, content: message.content.slice(0, limit), truncated: true };
	}
	return message;
}

function clipText(text: string, limit: number): string {
	return limit > 0 && text.length > limit ? text.slice(0, limit) : text;
}

/**
 * Collects every model call and tool call of one agent run. Attached to the
 * executor as a LangChain callback, so it sees the same events Langfuse would.
 */
export class TraceCallback extends BaseCallbackHandler {
	name = 'AgentHumanReviewTrace';

	readonly llmCalls: LlmCall[] = [];

	readonly toolCalls: ToolCall[] = [];

	readonly errors: Array<{ stage: string; message: string }> = [];

	readonly usage: TokenUsage = emptyUsage();

	private readonly pendingLlm = new Map<
		string,
		{ startedAt: number; input: TraceMessage[]; model: string; provider: string }
	>();

	private readonly pendingTools = new Map<
		string,
		{ name: string; input: string; startedAt: number }
	>();

	constructor(
		private readonly options: { contentLimit: number; pricing?: Pricing; defaultModel: string },
	) {
		super();
	}

	handleChatModelStart(
		llm: Serialized,
		messages: BaseMessage[][],
		runId: string,
		_parentRunId?: string,
		extraParams?: Record<string, unknown>,
	): void {
		const invocation = (extraParams?.invocation_params ?? {}) as Record<string, unknown>;
		this.pendingLlm.set(runId, {
			startedAt: Date.now(),
			input: (messages[0] ?? []).map((m) => messageToTrace(m, this.options.contentLimit)),
			model: String(invocation.model ?? invocation.model_name ?? this.options.defaultModel),
			provider: String(invocation._type ?? llm.id?.at(-1) ?? 'unknown'),
		});
	}

	handleLLMEnd(result: LLMResult, runId: string): void {
		const started = this.pendingLlm.get(runId);
		this.pendingLlm.delete(runId);
		const generation = result.generations?.[0]?.[0] as
			| {
					text?: string;
					message?: {
						tool_calls?: Array<{ name: string; args: unknown }>;
						response_metadata?: { stop_reason?: string; finish_reason?: string; model?: string };
					};
			  }
			| undefined;
		const usage = extractTokenUsage(result);
		addUsage(this.usage, usage);

		const modelName =
			generation?.message?.response_metadata?.model ??
			(result.llmOutput?.model as string | undefined) ??
			started?.model ??
			this.options.defaultModel;

		this.llmCalls.push({
			index: this.llmCalls.length,
			model: modelName,
			provider: started?.provider ?? 'unknown',
			startedAt: new Date(started?.startedAt ?? Date.now()).toISOString(),
			latencyMs: started ? Date.now() - started.startedAt : 0,
			input: started?.input ?? [],
			output: clipText(generation?.text ?? '', this.options.contentLimit),
			toolCallsRequested: (generation?.message?.tool_calls ?? []).map(({ name, args }) => ({
				name,
				args,
			})),
			stopReason:
				generation?.message?.response_metadata?.stop_reason ??
				generation?.message?.response_metadata?.finish_reason,
			usage,
			cost: this.options.pricing ? computeCost(usage, this.options.pricing) : undefined,
		});
	}

	handleLLMError(error: unknown, runId: string): void {
		const started = this.pendingLlm.get(runId);
		this.pendingLlm.delete(runId);
		const message = error instanceof Error ? error.message : String(error);
		this.errors.push({ stage: 'llm', message });
		this.llmCalls.push({
			index: this.llmCalls.length,
			model: started?.model ?? this.options.defaultModel,
			provider: started?.provider ?? 'unknown',
			startedAt: new Date(started?.startedAt ?? Date.now()).toISOString(),
			latencyMs: started ? Date.now() - started.startedAt : 0,
			input: started?.input ?? [],
			output: '',
			toolCallsRequested: [],
			usage: emptyUsage(),
			error: message,
		});
	}

	handleToolStart(tool: Serialized, input: string, runId: string): void {
		this.pendingTools.set(runId, {
			name: tool.id?.at(-1) ?? 'tool',
			input: clipText(input, this.options.contentLimit),
			startedAt: Date.now(),
		});
	}

	handleToolEnd(output: unknown, runId: string): void {
		const started = this.pendingTools.get(runId);
		if (!started) return;
		this.pendingTools.delete(runId);
		this.toolCalls.push({
			index: this.toolCalls.length,
			name: started.name,
			input: started.input,
			output: clipText(
				typeof output === 'string' ? output : JSON.stringify(output),
				this.options.contentLimit,
			),
			startedAt: new Date(started.startedAt).toISOString(),
			latencyMs: Date.now() - started.startedAt,
		});
	}

	handleToolError(error: unknown, runId: string): void {
		const started = this.pendingTools.get(runId);
		if (!started) return;
		this.pendingTools.delete(runId);
		const message = error instanceof Error ? error.message : String(error);
		this.errors.push({ stage: `tool:${started.name}`, message });
		this.toolCalls.push({
			index: this.toolCalls.length,
			name: started.name,
			input: started.input,
			output: '',
			startedAt: new Date(started.startedAt).toISOString(),
			latencyMs: Date.now() - started.startedAt,
			error: message,
		});
	}
}

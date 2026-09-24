import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import type { DocumentInterface } from '@langchain/core/documents';
import type { Serialized } from '@langchain/core/load/serializable';
import { BaseMessage } from '@langchain/core/messages';
import type { LLMResult } from '@langchain/core/outputs';
import type { ChainValues } from '@langchain/core/utils/types';
import { isRecord } from '@n8n/utils/is-record';
import { sanitizeErrorDetail } from '@n8n/utils/redaction/sanitize-error-detail';
import { randomBytes } from 'node:crypto';

import type { MlflowSpan, MlflowSpanType, CollectedTrace, TokenUsage } from './types';
import { MLFLOW_ATTRIBUTE, MLFLOW_MESSAGE_FORMAT, MLFLOW_SPAN_TYPE } from './types';

/** The whole serialized attribute, and any single string inside it. */
const MAX_ATTRIBUTE_CHARS = 100_000;
const MAX_STRING_CHARS = 4_000;
const MAX_ERROR_CHARS = 2_000;

const TRACE_ID_BYTES = 16;
const SPAN_ID_BYTES = 8;

/** Agent invoke keys that carry no information worth exporting. */
const UNINTERESTING_INPUT_KEYS = [
	'formatting_instructions',
	'agent_scratchpad',
	'chat_history',
	'steps',
];

/**
 * The executor echoes its inputs back alongside the answer, so the same keys are
 * dropped from the outputs. This is the list the node itself omits from its
 * output data.
 */
const ECHOED_OUTPUT_KEYS = [...UNINTERESTING_INPUT_KEYS, 'input', 'system_message'];

/**
 * MLflow uses two id encodings and rejects the wrong one.
 *
 * `TraceInfo.trace_id` is the client-facing string `tr-<32 hex>`; sending base64
 * there fails with "was not a valid trace ID". The prefix is `TRACE_ID_PREFIX` in
 * mlflow-tracing 0.1.3. Span ids inside the uploaded span data are base64 of the
 * raw bytes, which is what `encodeSpanIdToBase64` in MLflow's client produces.
 */
function randomTraceId(): { traceId: string; spanTraceId: string } {
	const raw = randomBytes(TRACE_ID_BYTES);
	return { traceId: `tr-${raw.toString('hex')}`, spanTraceId: raw.toString('base64') };
}

function randomSpanId(): string {
	return randomBytes(SPAN_ID_BYTES).toString('base64');
}

function toNanos(ms: number): string {
	return `${ms}000000`;
}

/** The last segment of a LangChain serialized `id` is the class name. */
function serializedName(serialized: Serialized | undefined, fallback: string): string {
	const id = serialized?.id;
	return (Array.isArray(id) ? id.at(-1) : undefined) ?? fallback;
}

/**
 * JSON with path-based cycle detection, so a value LangChain reuses across
 * branches survives and only a true cycle is cut.
 */
function stringifySafely(value: unknown): string {
	const seen = new Set<object>();
	return (
		JSON.stringify(value, function (_key, raw: unknown) {
			if (raw === null || typeof raw !== 'object') return raw;
			if (seen.has(raw)) return '[circular]';
			seen.add(raw);
			return raw;
		}) ?? ''
	);
}

/** Shortens every string in place, keeping the surrounding structure. */
function capStrings(value: unknown, seen: Set<object>): unknown {
	if (typeof value === 'string') {
		return value.length > MAX_STRING_CHARS
			? `${value.slice(0, MAX_STRING_CHARS)}…[truncated ${value.length} chars]`
			: value;
	}
	if (value === null || typeof value !== 'object') return value;
	if (seen.has(value)) return '[circular]';

	seen.add(value);
	try {
		if (Array.isArray(value)) return value.map((entry) => capStrings(entry, seen));
		return Object.fromEntries(
			Object.entries(value).map(([key, entry]) => [key, capStrings(entry, seen)]),
		);
	} finally {
		seen.delete(value);
	}
}

/**
 * Serializes an input or output for an MLflow attribute.
 *
 * The result is always valid JSON. Cutting the serialized text instead would
 * leave a half-finished string, and MLflow then cannot parse the attribute and
 * renders the raw text instead of the chat transcript. Oversized values are
 * shortened string by string, and a payload that is still too large is replaced
 * by a note rather than a broken fragment.
 */
function toAttributeJson(value: unknown): string {
	const full = stringifySafely(value);
	if (full.length <= MAX_ATTRIBUTE_CHARS) return full;

	const capped = stringifySafely(capStrings(value, new Set()));
	if (capped.length <= MAX_ATTRIBUTE_CHARS) return capped;

	return JSON.stringify({ truncated: true, original_size_chars: full.length });
}

function errorMessage(error: unknown): string {
	const raw = error instanceof Error ? error.message : String(error);
	return sanitizeErrorDetail(raw, MAX_ERROR_CHARS);
}

function firstNumber(...candidates: unknown[]): number | undefined {
	return candidates.find((c): c is number => typeof c === 'number' && Number.isFinite(c));
}

/**
 * Reads one provider usage shape. Databricks answers through `ChatOpenAI`, so
 * `promptTokens`/`completionTokens` is the common case; the snake_case keys cover
 * providers reporting LangChain's normalized shape.
 */
function readUsage(raw: unknown): TokenUsage | undefined {
	if (!isRecord(raw)) return undefined;

	const input = firstNumber(raw.promptTokens, raw.input_tokens, raw.prompt_tokens);
	const output = firstNumber(raw.completionTokens, raw.output_tokens, raw.completion_tokens);
	if (input === undefined && output === undefined) return undefined;

	const inputTokens = input ?? 0;
	const outputTokens = output ?? 0;
	return {
		inputTokens,
		outputTokens,
		totalTokens: firstNumber(raw.totalTokens, raw.total_tokens) ?? inputTokens + outputTokens,
	};
}

function extractTokenUsage(output: LLMResult): TokenUsage | undefined {
	const fromLlmOutput =
		readUsage(output.llmOutput?.tokenUsage) ?? readUsage(output.llmOutput?.usage);
	if (fromLlmOutput) return fromLlmOutput;

	for (const generation of output.generations.flat()) {
		const usage = readUsage(generation.generationInfo?.usage);
		if (usage) return usage;
	}
	return undefined;
}

/** LangChain message types to the OpenAI roles the MLflow UI understands. */
function toOpenAiRole(type: string): string {
	switch (type) {
		case 'human':
			return 'user';
		case 'ai':
			return 'assistant';
		default:
			return type;
	}
}

/**
 * One message in OpenAI shape. `content` is passed through untouched, because a
 * reasoning model returns content blocks rather than a plain string.
 */
function toChatMessage(message: BaseMessage): Record<string, unknown> {
	const converted: Record<string, unknown> = {
		role: toOpenAiRole(message.type),
		content: message.content,
	};

	if ('tool_calls' in message && Array.isArray(message.tool_calls)) {
		converted.tool_calls = message.tool_calls.map((call) => ({
			id: call.id,
			type: 'function',
			function: { name: call.name, arguments: JSON.stringify(call.args ?? {}) },
		}));
	}
	if ('tool_call_id' in message && typeof message.tool_call_id === 'string') {
		converted.tool_call_id = message.tool_call_id;
	}
	return converted;
}

/** Model output in OpenAI shape, keeping the finish reason and any tool calls. */
function toChatCompletion(output: LLMResult): unknown {
	return {
		choices: output.generations.flat().map((generation) => {
			// Only a ChatGeneration carries `message`; a plain Generation has text.
			const message = isRecord(generation) ? generation.message : undefined;
			return {
				message: BaseMessage.isInstance(message)
					? toChatMessage(message)
					: { role: 'assistant', content: generation.text },
				finish_reason: generation.generationInfo?.finish_reason,
			};
		}),
	};
}

function withoutKeys(values: ChainValues, drop: string[]): Record<string, unknown> {
	return Object.fromEntries(Object.entries(values).filter(([key]) => !drop.includes(key)));
}

/**
 * Turns the LangChain callback events of one agent run into an MLflow span tree.
 *
 * Only the steps a reader cares about become spans: the agent itself, each model
 * call, each tool call and each retriever call. LangChain's own graph nodes
 * (`RunnableSequence`, `RunnableMap`, `RunnableLambda`, `ChatPromptTemplate`,
 * `ToolCallingAgentOutputParser`) are dropped - a two-turn run emits twenty
 * callback runs, of which four carry information, and each dropped run repeats
 * the whole conversation state in its inputs and outputs.
 *
 * Dropped runs are still tracked by id, so a kept span re-parents to its nearest
 * kept ancestor and nesting survives the filter.
 *
 * Attach it in the `callbacks` array of the second `invoke`/`streamEvents`
 * argument; LangChain propagates it to every nested run.
 */
export class MlflowSpanCollector extends BaseCallbackHandler {
	name = 'MlflowSpanCollector';

	/** In-memory work only, and it guarantees error hooks land before the flush. */
	awaitHandlers = true;

	/** The `tr-<hex>` form, for `TraceInfo.trace_id`. */
	readonly traceId: string;

	/** The base64 form, for `trace_id` on each uploaded span. */
	private readonly spanTraceId: string;

	constructor() {
		super();
		const ids = randomTraceId();
		this.traceId = ids.traceId;
		this.spanTraceId = ids.spanTraceId;
	}

	/** Kept spans, keyed by LangChain `runId`. */
	private readonly spans = new Map<string, MlflowSpan>();

	/** Every run's parent, including dropped ones, so re-parenting works. */
	private readonly parentOf = new Map<string, string | undefined>();

	private readonly runOrder: string[] = [];

	/** Runs that started but never ended, so a cancelled run can be closed. */
	private readonly openRuns = new Set<string>();

	private rootRunId?: string;

	private startedAtMs?: number;

	private lastActivityMs = 0;

	private executionId?: string;

	private workflowId?: string;

	private nodeName?: string;

	private requestPreview?: string;

	private responsePreview?: string;

	/** Walks up through dropped runs to the closest run that became a span. */
	private nearestKeptAncestor(runId: string | undefined): MlflowSpan | undefined {
		let cursor = runId;
		const guard = new Set<string>();
		while (cursor !== undefined && !guard.has(cursor)) {
			guard.add(cursor);
			const span = this.spans.get(cursor);
			if (span) return span;
			cursor = this.parentOf.get(cursor);
		}
		return undefined;
	}

	private captureRunMetadata(metadata: unknown): void {
		if (!isRecord(metadata)) return;
		if (typeof metadata.execution_id === 'string') this.executionId ??= metadata.execution_id;
		if (typeof metadata.node === 'string') this.nodeName ??= metadata.node;
		if (isRecord(metadata.workflow) && typeof metadata.workflow.id === 'string') {
			this.workflowId ??= metadata.workflow.id;
		}
	}

	private startSpan(params: {
		runId: string;
		parentRunId?: string;
		name: string;
		spanType: MlflowSpanType;
		inputs: unknown;
		messageFormat?: boolean;
	}): void {
		const { runId, parentRunId, name, spanType, inputs } = params;
		if (this.spans.has(runId)) return;

		const startTimeMs = Date.now();
		this.startedAtMs ??= startTimeMs;
		this.lastActivityMs = startTimeMs;

		const span: MlflowSpan = {
			trace_id: this.spanTraceId,
			span_id: randomSpanId(),
			parent_span_id: this.nearestKeptAncestor(parentRunId)?.span_id,
			name,
			start_time_unix_nano: toNanos(startTimeMs),
			end_time_unix_nano: toNanos(startTimeMs),
			status: { code: 'OK' },
			attributes: {
				[MLFLOW_ATTRIBUTE.SpanType]: toAttributeJson(spanType),
				[MLFLOW_ATTRIBUTE.TraceRequestId]: toAttributeJson(this.traceId),
				[MLFLOW_ATTRIBUTE.SpanInputs]: toAttributeJson(inputs),
				...(params.messageFormat && {
					[MLFLOW_ATTRIBUTE.MessageFormat]: MLFLOW_MESSAGE_FORMAT,
				}),
			},
		};

		this.spans.set(runId, span);
		this.runOrder.push(runId);
		this.openRuns.add(runId);
	}

	/** Stamps the end time and marks the run closed. */
	private closeSpan(runId: string): MlflowSpan | undefined {
		const span = this.spans.get(runId);
		if (!span) return undefined;

		const now = Date.now();
		this.lastActivityMs = now;
		span.end_time_unix_nano = toNanos(now);
		this.openRuns.delete(runId);
		return span;
	}

	private endSpan(runId: string, outputs: unknown, tokenUsage?: TokenUsage): void {
		const span = this.closeSpan(runId);
		if (!span) return;

		span.attributes[MLFLOW_ATTRIBUTE.SpanOutputs] = toAttributeJson(outputs);
		if (tokenUsage) {
			span.tokenUsage = tokenUsage;
			span.attributes[MLFLOW_ATTRIBUTE.TokenUsage] = toAttributeJson({
				input_tokens: tokenUsage.inputTokens,
				output_tokens: tokenUsage.outputTokens,
				total_tokens: tokenUsage.totalTokens,
			});
		}
	}

	private failSpan(runId: string, error: unknown): void {
		const span = this.closeSpan(runId);
		if (!span) return;

		span.status = { code: 'ERROR', message: errorMessage(error) };
	}

	/**
	 * LangChain's type declaration for this hook is out of order: the callback
	 * manager passes `parentRunId` fourth, where the `.d.ts` names `runType`. Both
	 * are `string | undefined`, so the compiler cannot catch it.
	 *
	 * Only the parentless run becomes a span - that is the agent. Every inner
	 * chain is LangChain plumbing, so it is recorded as a parent link and dropped.
	 */
	handleChainStart(
		_chain: Serialized,
		inputs: ChainValues,
		runId: string,
		parentRunId?: string,
		_tags?: string[],
		metadata?: Record<string, unknown>,
		_runType?: string,
		runName?: string,
	): void {
		this.parentOf.set(runId, parentRunId);
		this.captureRunMetadata(metadata);

		if (parentRunId !== undefined || this.rootRunId !== undefined) return;

		this.rootRunId = runId;
		this.startSpan({
			runId,
			parentRunId: undefined,
			name: runName ?? 'Agent',
			spanType: MLFLOW_SPAN_TYPE.Agent,
			inputs: withoutKeys(inputs, UNINTERESTING_INPUT_KEYS),
		});
		// Plain text, so the trace list shows the question rather than a JSON blob.
		if (typeof inputs.input === 'string') this.requestPreview = inputs.input;
	}

	handleChainEnd(outputs: ChainValues, runId: string): void {
		if (runId !== this.rootRunId) return;

		if (typeof outputs.output === 'string') this.responsePreview = outputs.output;
		this.endSpan(runId, withoutKeys(outputs, ECHOED_OUTPUT_KEYS));
	}

	handleChainError(error: Error, runId: string): void {
		this.failSpan(runId, error);
	}

	handleChatModelStart(
		llm: Serialized,
		messages: BaseMessage[][],
		runId: string,
		parentRunId?: string,
		_extraParams?: Record<string, unknown>,
		_tags?: string[],
		metadata?: Record<string, unknown>,
		runName?: string,
	): void {
		this.parentOf.set(runId, parentRunId);
		this.captureRunMetadata(metadata);
		this.startSpan({
			runId,
			parentRunId,
			name: runName ?? serializedName(llm, 'chat model'),
			spanType: MLFLOW_SPAN_TYPE.ChatModel,
			inputs: { messages: messages.flat().map(toChatMessage) },
			messageFormat: true,
		});
	}

	handleLLMStart(
		llm: Serialized,
		prompts: string[],
		runId: string,
		parentRunId?: string,
		_extraParams?: Record<string, unknown>,
		_tags?: string[],
		metadata?: Record<string, unknown>,
		runName?: string,
	): void {
		this.parentOf.set(runId, parentRunId);
		this.captureRunMetadata(metadata);
		this.startSpan({
			runId,
			parentRunId,
			name: runName ?? serializedName(llm, 'model'),
			spanType: MLFLOW_SPAN_TYPE.Llm,
			inputs: prompts,
		});
	}

	handleLLMEnd(output: LLMResult, runId: string): void {
		this.endSpan(runId, toChatCompletion(output), extractTokenUsage(output));
	}

	handleLLMError(error: Error, runId: string): void {
		this.failSpan(runId, error);
	}

	handleToolStart(
		tool: Serialized,
		input: string,
		runId: string,
		parentRunId?: string,
		_tags?: string[],
		metadata?: Record<string, unknown>,
		runName?: string,
	): void {
		this.parentOf.set(runId, parentRunId);
		this.captureRunMetadata(metadata);
		this.startSpan({
			runId,
			parentRunId,
			name: runName ?? serializedName(tool, 'tool'),
			spanType: MLFLOW_SPAN_TYPE.Tool,
			inputs: input,
		});
	}

	handleToolEnd(output: unknown, runId: string): void {
		this.endSpan(runId, output);
	}

	handleToolError(error: Error, runId: string): void {
		this.failSpan(runId, error);
	}

	handleRetrieverStart(
		retriever: Serialized,
		query: string,
		runId: string,
		parentRunId?: string,
		_tags?: string[],
		metadata?: Record<string, unknown>,
		name?: string,
	): void {
		this.parentOf.set(runId, parentRunId);
		this.captureRunMetadata(metadata);
		this.startSpan({
			runId,
			parentRunId,
			name: name ?? serializedName(retriever, 'retriever'),
			spanType: MLFLOW_SPAN_TYPE.Retriever,
			inputs: query,
		});
	}

	handleRetrieverEnd(documents: DocumentInterface[], runId: string): void {
		this.endSpan(runId, documents);
	}

	handleRetrieverError(error: Error, runId: string): void {
		this.failSpan(runId, error);
	}

	/**
	 * Closes the trace. Returns `undefined` when no span was recorded, so a run
	 * that never reached the agent writes nothing.
	 */
	finish(): CollectedTrace | undefined {
		const root = this.rootRunId === undefined ? undefined : this.spans.get(this.rootRunId);
		if (!root || this.startedAtMs === undefined) return undefined;

		const spans = this.runOrder
			.map((runId) => this.spans.get(runId))
			.filter((span): span is MlflowSpan => span !== undefined);

		// A cancelled run leaves steps open; close them at the end of the trace
		// rather than dropping the spans. Times stay in milliseconds here - going
		// back through nanoseconds loses integer precision.
		const endTimeMs = Math.max(this.lastActivityMs, this.startedAtMs);
		const endNanos = toNanos(endTimeMs);
		for (const runId of this.openRuns) {
			const span = this.spans.get(runId);
			if (span) span.end_time_unix_nano = endNanos;
		}

		return {
			traceId: this.traceId,
			rootSpanId: root.span_id,
			spans,
			startTimeMs: this.startedAtMs,
			endTimeMs,
			state: spans.some((span) => span.status.code === 'ERROR') ? 'ERROR' : 'OK',
			executionId: this.executionId,
			workflowId: this.workflowId,
			nodeName: this.nodeName,
			requestPreview: this.requestPreview,
			responsePreview: this.responsePreview,
		};
	}
}

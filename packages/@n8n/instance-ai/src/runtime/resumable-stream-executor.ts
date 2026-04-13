import type { InstanceAiEvent } from '@n8n/api-types';
import type { RunTree } from 'langsmith';

import type { InstanceAiEventBus } from '../event-bus';
import type { Logger } from '../logger';
import { mapMastraChunkToEvent } from '../stream/map-chunk';
import { WorkSummaryAccumulator, type WorkSummary } from '../stream/work-summary-accumulator';
import { getTraceParentRun, setTraceParentOverride } from '../tracing/langsmith-tracing';
import { asResumable, parseSuspension } from '../utils/stream-helpers';
import type { SuspensionInfo } from '../utils/stream-helpers';

type ConfirmationRequestEvent = Extract<InstanceAiEvent, { type: 'confirmation-request' }>;

export interface ResumableStreamSource {
	runId?: string;
	fullStream: AsyncIterable<unknown>;
	text?: Promise<string>;
	steps?: Promise<unknown[]>;
	response?: Promise<unknown>;
	finishReason?: Promise<string | undefined>;
	request?: Promise<unknown>;
	usage?: Promise<unknown>;
	totalUsage?: Promise<unknown>;
}

export interface ResumableStreamContext {
	threadId: string;
	runId: string;
	agentId: string;
	eventBus: InstanceAiEventBus;
	signal: AbortSignal;
	logger: Logger;
}

export interface ManualSuspensionControl {
	mode: 'manual';
}

export interface AutoResumeControl {
	mode: 'auto';
	waitForConfirmation: (requestId: string) => Promise<Record<string, unknown>>;
	drainCorrections?: () => string[];
	/** Returns a promise that resolves when a new user correction is queued. Used to unblock
	 *  HITL suspensions so the builder can incorporate the correction instead of waiting forever. */
	waitForCorrection?: () => Promise<void>;
	onSuspension?: (suspension: SuspensionInfo) => void;
	buildResumeOptions?: (input: {
		mastraRunId: string;
		suspension: SuspensionInfo;
	}) => Record<string, unknown>;
}

export type ResumableStreamControl = ManualSuspensionControl | AutoResumeControl;

export interface ExecuteResumableStreamOptions {
	agent: unknown;
	stream: ResumableStreamSource;
	context: ResumableStreamContext;
	control: ResumableStreamControl;
	initialMastraRunId?: string;
	llmStepTraceHooks?: LlmStepTraceHooks;
}

export type TraceStatus = 'completed' | 'cancelled' | 'suspended' | 'errored';

export interface ExecuteResumableStreamResult {
	status: TraceStatus;
	mastraRunId: string;
	text?: Promise<string>;
	suspension?: SuspensionInfo;
	confirmationEvent?: ConfirmationRequestEvent;
	/** Accumulated tool call outcomes observed during stream consumption. */
	workSummary: WorkSummary;
}

export interface LlmStepTraceHooks {
	executionOptions: {
		prepareStep?: (options: unknown) => Promise<undefined>;
		experimental_prepareStep?: (options: unknown) => Promise<undefined>;
		experimental_onStepStart?: (options: unknown) => Promise<void>;
		onStepFinish: (stepResult: unknown) => Promise<void>;
		experimental_telemetry?: { isEnabled: boolean };
	};
	onStreamChunk: (chunk: unknown) => void;
	startSegment: () => void;
	finalize: (
		source: ResumableStreamSource,
		options?: {
			status?: TraceStatus;
			error?: string;
		},
	) => Promise<void>;
}

interface NormalizedModelMetadata {
	provider?: string;
	modelName?: string;
}

interface LlmStepTraceRecord {
	messageId: string;
	stepNumber?: number;
	runTree: RunTree;
	model: NormalizedModelMetadata;
	inputs: Record<string, unknown>;
	textParts: string[];
	reasoningParts: string[];
	toolCalls: Array<Record<string, unknown>>;
	toolResults: Array<Record<string, unknown>>;
	finishReason?: string;
	usage?: unknown;
	response?: unknown;
	request?: unknown;
	providerMetadata?: unknown;
	sourceUsage?: unknown;
	sourceTotalUsage?: unknown;
	warnings?: unknown;
	isContinued?: boolean;
	recordedFirstToken: boolean;
	finished: boolean;
}

interface StepResultLike {
	stepNumber?: number;
	text?: string;
	reasoning?: unknown;
	toolCalls?: unknown[];
	toolResults?: unknown[];
	finishReason?: string;
	usage?: unknown;
	request?: { body?: unknown };
	response?: {
		messages?: unknown[];
		headers?: Record<string, string>;
		id?: string;
		timestamp?: Date;
		modelId?: string;
		[key: string]: unknown;
	};
	providerMetadata?: unknown;
}

interface StepStartLike {
	stepNumber?: number;
	messages?: unknown[];
	model?: {
		provider?: string;
		modelId?: string;
	};
}

interface SyntheticToolTraceRecord {
	toolCallId: string;
	toolName: string;
	runTree: RunTree;
	finished: boolean;
}

const MAX_TRACE_STRING_LENGTH = 2_000;
const MAX_TRACE_ARRAY_ITEMS = 20;
const MAX_TRACE_OBJECT_KEYS = 20;
const SYNTHETIC_TOOL_TRACE_NAMES = new Set<string>();

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function getFiniteNumber(value: unknown): number | undefined {
	return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function dedupeTags(tags: Array<string | undefined>): string[] | undefined {
	const values = tags.filter((tag): tag is string => Boolean(tag));
	return values.length > 0 ? [...new Set(values)] : undefined;
}

function truncateTraceString(value: string): string {
	if (value.length <= MAX_TRACE_STRING_LENGTH) {
		return value;
	}

	return `${value.slice(0, MAX_TRACE_STRING_LENGTH)}…`;
}

function sanitizeTraceValue(value: unknown, depth = 0): unknown {
	if (value === null || value === undefined) {
		return value;
	}

	if (typeof value === 'string') {
		return truncateTraceString(value);
	}

	if (typeof value === 'number' || typeof value === 'boolean') {
		return value;
	}

	if (typeof value === 'bigint') {
		return value.toString();
	}

	if (value instanceof Date) {
		return value.toISOString();
	}

	if (Array.isArray(value)) {
		if (depth >= 3) {
			return `[array(${value.length})]`;
		}

		return value
			.slice(0, MAX_TRACE_ARRAY_ITEMS)
			.map((entry) => sanitizeTraceValue(entry, depth + 1));
	}

	if (isRecord(value)) {
		if (depth >= 3) {
			return `[object ${Object.keys(value).length} keys]`;
		}

		const entries = Object.entries(value).slice(0, MAX_TRACE_OBJECT_KEYS);
		const sanitized: Record<string, unknown> = {};
		for (const [key, entryValue] of entries) {
			sanitized[key] = sanitizeTraceValue(entryValue, depth + 1);
		}
		if (Object.keys(value).length > entries.length) {
			sanitized.__truncatedKeys = Object.keys(value).length - entries.length;
		}
		return sanitized;
	}

	return truncateTraceString(Object.prototype.toString.call(value));
}

function sanitizeTracePayload(value: unknown): Record<string, unknown> {
	if (!isRecord(value)) {
		return { value: sanitizeTraceValue(value) };
	}

	const sanitized: Record<string, unknown> = {};
	for (const [key, entryValue] of Object.entries(value)) {
		sanitized[key] = sanitizeTraceValue(entryValue);
	}
	return sanitized;
}

function normalizeModelMetadata(modelId: unknown): NormalizedModelMetadata {
	if (typeof modelId === 'string' && modelId.length > 0) {
		const [provider, ...modelParts] = modelId.split('/');
		return modelParts.length > 0
			? { provider, modelName: modelParts.join('/') }
			: { modelName: modelId };
	}

	if (isRecord(modelId) && typeof modelId.id === 'string') {
		return normalizeModelMetadata(modelId.id);
	}

	return {};
}

function formatLlmRunName(model: NormalizedModelMetadata): string {
	if (model.provider && model.modelName) {
		return `llm:${model.provider}/${model.modelName}`;
	}

	if (model.modelName) {
		return `llm:${model.modelName}`;
	}

	return 'llm';
}

function parseMaybeJson(value: unknown): unknown {
	if (typeof value !== 'string') {
		return value;
	}

	try {
		return JSON.parse(value) as unknown;
	} catch {
		return value;
	}
}

function buildLlmInputPayload(request: unknown): Record<string, unknown> {
	const parsedRequest =
		isRecord(request) && 'body' in request ? parseMaybeJson(request.body) : request;

	if (!isRecord(parsedRequest)) {
		return { request: parsedRequest };
	}

	const selected: Record<string, unknown> = {};
	for (const key of [
		'messages',
		'prompt',
		'input',
		'system',
		'model',
		'temperature',
		'tools',
		'tool_choice',
		'toolChoice',
		'stop',
		'stop_sequences',
		'stopSequences',
		'max_tokens',
		'max_output_tokens',
		'max_completion_tokens',
	]) {
		if (parsedRequest[key] !== undefined) {
			selected[key] =
				key === 'messages' && Array.isArray(parsedRequest[key])
					? (normalizeTraceMessages(parsedRequest[key]) ?? [])
					: parsedRequest[key];
		}
	}

	if (Object.keys(selected).length > 0) {
		return selected;
	}

	return { request: parsedRequest };
}

function extractInputTokenCount(usage: Record<string, unknown>): number | undefined {
	if (isRecord(usage.inputTokenDetails)) {
		return (
			getFiniteNumber(usage.inputTokenDetails.noCacheTokens) ??
			getFiniteNumber(usage.inputTokenDetails.no_cache_tokens) ??
			undefined
		);
	}

	if (isRecord(usage.inputTokens)) {
		return (
			getFiniteNumber(usage.inputTokens.noCache) ??
			getFiniteNumber(usage.inputTokens.no_cache) ??
			getFiniteNumber(usage.inputTokens.total) ??
			undefined
		);
	}

	return getFiniteNumber(usage.inputTokens) ?? getFiniteNumber(usage.promptTokens) ?? undefined;
}

function extractOutputTokenCount(usage: Record<string, unknown>): number | undefined {
	if (isRecord(usage.outputTokens)) {
		return (
			getFiniteNumber(usage.outputTokens.total) ??
			getFiniteNumber(usage.outputTokens.text) ??
			undefined
		);
	}

	return (
		getFiniteNumber(usage.outputTokens) ?? getFiniteNumber(usage.completionTokens) ?? undefined
	);
}

function extractReasoningTokenCount(usage: Record<string, unknown>): number | undefined {
	if (isRecord(usage.outputTokens)) {
		return getFiniteNumber(usage.outputTokens.reasoning) ?? undefined;
	}

	return getFiniteNumber(usage.reasoningTokens) ?? undefined;
}

function extractCacheCreationTokens(raw: unknown): number | undefined {
	if (!isRecord(raw)) return undefined;

	if (isRecord(raw.inputTokenDetails)) {
		return (
			getFiniteNumber(raw.inputTokenDetails.cacheWriteTokens) ??
			getFiniteNumber(raw.inputTokenDetails.cache_write_tokens) ??
			undefined
		);
	}

	if (isRecord(raw.inputTokens)) {
		return (
			getFiniteNumber(raw.inputTokens.cacheWrite) ??
			getFiniteNumber(raw.inputTokens.cache_write) ??
			getFiniteNumber(raw.inputTokens.cacheWriteTokens) ??
			getFiniteNumber(raw.inputTokens.cache_write_tokens) ??
			undefined
		);
	}

	return (
		getFiniteNumber(raw.cacheCreationInputTokens) ??
		getFiniteNumber(raw.cache_creation_input_tokens) ??
		getFiniteNumber(raw.input_cache_write) ??
		undefined
	);
}

function extractCacheReadTokens(raw: unknown): number | undefined {
	if (!isRecord(raw)) return undefined;

	if (isRecord(raw.inputTokenDetails)) {
		return (
			getFiniteNumber(raw.inputTokenDetails.cacheReadTokens) ??
			getFiniteNumber(raw.inputTokenDetails.cache_read_tokens) ??
			undefined
		);
	}

	if (isRecord(raw.inputTokens)) {
		return (
			getFiniteNumber(raw.inputTokens.cacheRead) ??
			getFiniteNumber(raw.inputTokens.cache_read) ??
			getFiniteNumber(raw.inputTokens.cacheReadTokens) ??
			getFiniteNumber(raw.inputTokens.cache_read_tokens) ??
			undefined
		);
	}

	return (
		getFiniteNumber(raw.cachedInputTokens) ??
		getFiniteNumber(raw.cacheRead) ??
		getFiniteNumber(raw.cache_read_input_tokens) ??
		getFiniteNumber(raw.input_cache_read) ??
		undefined
	);
}

function extractUsageFromProviderMetadata(
	providerMetadata: unknown,
): Record<string, unknown> | undefined {
	if (!isRecord(providerMetadata)) {
		return undefined;
	}

	if (isRecord(providerMetadata.usage)) {
		return providerMetadata.usage;
	}

	for (const value of Object.values(providerMetadata)) {
		if (!isRecord(value)) {
			continue;
		}

		if (isRecord(value.usage)) {
			return value.usage;
		}
	}

	return undefined;
}

function mergeUsageMetadata(
	primary: Record<string, unknown> | undefined,
	fallback: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
	if (!primary) {
		return fallback;
	}

	if (!fallback) {
		return primary;
	}

	const merged: Record<string, unknown> = { ...primary };
	for (const key of ['input_tokens', 'output_tokens', 'total_tokens']) {
		if (merged[key] === undefined && fallback[key] !== undefined) {
			merged[key] = fallback[key];
		}
	}

	const mergedInputTokenDetails: Record<string, unknown> = {};
	if (isRecord(fallback.input_token_details)) {
		Object.assign(mergedInputTokenDetails, fallback.input_token_details);
	}
	if (isRecord(primary.input_token_details)) {
		Object.assign(mergedInputTokenDetails, primary.input_token_details);
	}
	if (Object.keys(mergedInputTokenDetails).length > 0) {
		merged.input_token_details = mergedInputTokenDetails;
	}

	const mergedOutputTokenDetails: Record<string, unknown> = {};
	if (isRecord(fallback.output_token_details)) {
		Object.assign(mergedOutputTokenDetails, fallback.output_token_details);
	}
	if (isRecord(primary.output_token_details)) {
		Object.assign(mergedOutputTokenDetails, primary.output_token_details);
	}
	if (Object.keys(mergedOutputTokenDetails).length > 0) {
		merged.output_token_details = mergedOutputTokenDetails;
	}

	return merged;
}

function buildUsageMetadata(
	usage: unknown,
	providerMetadata?: unknown,
): Record<string, unknown> | undefined {
	const usageRecord = isRecord(usage) ? usage : undefined;
	const providerUsage = extractUsageFromProviderMetadata(providerMetadata);
	if (!usageRecord && !providerUsage) {
		return undefined;
	}

	const inputTokens =
		(usageRecord ? extractInputTokenCount(usageRecord) : undefined) ??
		(providerUsage ? extractInputTokenCount(providerUsage) : undefined);
	const outputTokens =
		(usageRecord ? extractOutputTokenCount(usageRecord) : undefined) ??
		(providerUsage ? extractOutputTokenCount(providerUsage) : undefined);
	const totalTokens =
		inputTokens !== undefined || outputTokens !== undefined
			? (inputTokens ?? 0) + (outputTokens ?? 0)
			: ((usageRecord ? getFiniteNumber(usageRecord.totalTokens) : undefined) ??
				(providerUsage ? getFiniteNumber(providerUsage.totalTokens) : undefined));
	const cachedInputTokens =
		(usageRecord ? getFiniteNumber(usageRecord.cachedInputTokens) : undefined) ??
		(usageRecord ? extractCacheReadTokens(usageRecord) : undefined) ??
		(usageRecord ? extractCacheReadTokens(usageRecord.raw) : undefined) ??
		(providerUsage ? extractCacheReadTokens(providerUsage) : undefined) ??
		(providerUsage ? extractCacheReadTokens(providerUsage.raw) : undefined);
	const cacheCreationTokens =
		(usageRecord ? extractCacheCreationTokens(usageRecord) : undefined) ??
		(usageRecord ? extractCacheCreationTokens(usageRecord.raw) : undefined) ??
		(providerUsage ? extractCacheCreationTokens(providerUsage) : undefined) ??
		(providerUsage ? extractCacheCreationTokens(providerUsage.raw) : undefined);
	const reasoningTokens =
		(usageRecord ? extractReasoningTokenCount(usageRecord) : undefined) ??
		(providerUsage ? extractReasoningTokenCount(providerUsage) : undefined);

	const usageMetadata: Record<string, unknown> = {};
	if (inputTokens !== undefined) {
		usageMetadata.input_tokens = inputTokens;
	}
	if (outputTokens !== undefined) {
		usageMetadata.output_tokens = outputTokens;
	}
	if (totalTokens !== undefined) {
		usageMetadata.total_tokens = totalTokens;
	}

	const inputTokenDetails: Record<string, unknown> = {};
	if (cachedInputTokens !== undefined) {
		inputTokenDetails.cache_read = cachedInputTokens;
	}
	if (cacheCreationTokens !== undefined) {
		inputTokenDetails.cache_creation = cacheCreationTokens;
	}
	if (Object.keys(inputTokenDetails).length > 0) {
		usageMetadata.input_token_details = inputTokenDetails;
	}

	if (reasoningTokens !== undefined) {
		usageMetadata.output_token_details = { reasoning: reasoningTokens };
	}

	return Object.keys(usageMetadata).length > 0
		? mergeUsageMetadata(
				usageMetadata,
				providerUsage ? buildUsageMetadata(providerUsage) : undefined,
			)
		: providerUsage
			? buildUsageMetadata(providerUsage)
			: undefined;
}

function summarizeUsageLikeValue(value: unknown): Record<string, unknown> | undefined {
	if (!isRecord(value)) {
		return undefined;
	}

	const summary: Record<string, unknown> = {};
	for (const key of [
		'promptTokens',
		'completionTokens',
		'totalTokens',
		'cachedInputTokens',
		'reasoningTokens',
		'inputTokens',
		'outputTokens',
		'inputTokenDetails',
		'outputTokenDetails',
		'input_tokens',
		'output_tokens',
		'cache_creation_input_tokens',
		'cache_read_input_tokens',
		'cacheCreationInputTokens',
		'cacheReadInputTokens',
		'iterations',
	]) {
		if (value[key] !== undefined) {
			summary[key] = sanitizeTraceValue(value[key]);
		}
	}

	for (const nestedKey of ['usage', 'raw', 'rawUsage', 'anthropic', 'openai']) {
		const nestedSummary = summarizeUsageLikeValue(value[nestedKey]);
		if (nestedSummary) {
			summary[nestedKey] = nestedSummary;
		}
	}

	return Object.keys(summary).length > 0 ? summary : undefined;
}

function buildLlmUsageDebug(
	record: LlmStepTraceRecord,
	stepResult?: StepResultLike,
): Record<string, unknown> | undefined {
	const usageDebug: Record<string, unknown> = {};

	const stepUsage = summarizeUsageLikeValue(stepResult?.usage);
	if (stepUsage) {
		usageDebug.step_usage = stepUsage;
	}

	const recordUsage = summarizeUsageLikeValue(record.usage);
	if (recordUsage) {
		usageDebug.record_usage = recordUsage;
	}

	const streamUsage = summarizeUsageLikeValue(record.sourceUsage);
	if (streamUsage) {
		usageDebug.stream_usage = streamUsage;
	}

	const streamTotalUsage = summarizeUsageLikeValue(record.sourceTotalUsage);
	if (streamTotalUsage) {
		usageDebug.stream_total_usage = streamTotalUsage;
	}

	const stepProviderMetadata = summarizeUsageLikeValue(stepResult?.providerMetadata);
	if (stepProviderMetadata) {
		usageDebug.step_provider_metadata = stepProviderMetadata;
	}

	const providerMetadata = summarizeUsageLikeValue(record.providerMetadata);
	if (providerMetadata) {
		usageDebug.provider_metadata = providerMetadata;
	}

	const stepResponse = summarizeUsageLikeValue(stepResult?.response);
	if (stepResponse) {
		usageDebug.step_response = stepResponse;
	}

	const response = summarizeUsageLikeValue(record.response);
	if (response) {
		usageDebug.response = response;
	}

	return Object.keys(usageDebug).length > 0 ? sanitizeTracePayload(usageDebug) : undefined;
}

async function resolveUsagePromise(usage: Promise<unknown> | undefined): Promise<unknown> {
	if (!usage) {
		return undefined;
	}

	return await usage.then(
		(value) => value,
		() => undefined,
	);
}

async function resolveSegmentUsage(source: ResumableStreamSource): Promise<{
	lastStepUsage?: unknown;
	totalUsage?: unknown;
}> {
	const [lastStepUsage, totalUsage] = await Promise.all([
		resolveUsagePromise(source.usage),
		resolveUsagePromise(source.totalUsage),
	]);

	return { lastStepUsage, totalUsage };
}

function maybeBackfillRecordUsageFromSegment(
	record: LlmStepTraceRecord,
	records: LlmStepTraceRecord[],
	usage: {
		lastStepUsage?: unknown;
		totalUsage?: unknown;
	},
): void {
	if (usage.lastStepUsage !== undefined) {
		record.sourceUsage = usage.lastStepUsage;
	}

	if (usage.totalUsage !== undefined) {
		record.sourceTotalUsage = usage.totalUsage;
	}

	if (record.usage !== undefined) {
		return;
	}

	const isLastRecord = records[records.length - 1] === record;
	if (isLastRecord && usage.lastStepUsage !== undefined) {
		record.usage = usage.lastStepUsage;
		return;
	}

	if (records.length === 1 && usage.totalUsage !== undefined) {
		record.usage = usage.totalUsage;
	}
}

function toTraceObject(value: unknown): Record<string, unknown> {
	if (isRecord(value)) {
		return value;
	}

	return { value };
}

function extractResponseMessages(value: unknown): unknown[] | undefined {
	return isRecord(value) && Array.isArray(value.messages) ? value.messages : undefined;
}

function extractTextParts(value: unknown): string[] {
	if (typeof value === 'string') {
		return [value];
	}

	if (Array.isArray(value)) {
		return value.flatMap((entry) => extractTextParts(entry));
	}

	if (!isRecord(value)) {
		return [];
	}

	if (value.type === 'text') {
		if (typeof value.text === 'string') {
			return [value.text];
		}

		if (isRecord(value.text) && typeof value.text.value === 'string') {
			return [value.text.value];
		}
	}

	if ('content' in value) {
		if (typeof value.content === 'string') {
			return [value.content];
		}

		if (Array.isArray(value.content)) {
			return value.content.flatMap((entry) => extractTextParts(entry));
		}
	}

	if (Array.isArray(value.parts)) {
		return value.parts.flatMap((entry) => extractTextParts(entry));
	}

	return [];
}

function extractTraceToolCallsFromMessage(message: unknown): Array<Record<string, unknown>> {
	if (!isRecord(message)) {
		return [];
	}

	const toolCalls: Array<Record<string, unknown>> = [];
	const pushToolCall = (value: unknown) => {
		if (!isRecord(value)) {
			return;
		}

		toolCalls.push({
			...(typeof value.toolCallId === 'string' ? { toolCallId: value.toolCallId } : {}),
			...(typeof value.toolName === 'string' ? { toolName: value.toolName } : {}),
		});
	};

	if (Array.isArray(message.tool_calls)) {
		for (const toolCall of message.tool_calls) {
			pushToolCall(toolCall);
		}
	}

	const content = message.content;
	if (Array.isArray(content)) {
		for (const part of content) {
			if (!isRecord(part)) {
				continue;
			}

			if (part.type === 'tool-call') {
				pushToolCall(part);
			}
		}
	}

	if (isRecord(content) && Array.isArray(content.parts)) {
		for (const part of content.parts) {
			if (isRecord(part) && part.type === 'tool-invocation' && isRecord(part.toolInvocation)) {
				pushToolCall(part.toolInvocation);
			}
		}
	}

	return toolCalls;
}

function summarizeRequestedTools(
	toolCalls: Array<Record<string, unknown>>,
): Array<Record<string, unknown>> | undefined {
	const summaries = toolCalls
		.map((toolCall) => ({
			...(typeof toolCall.toolCallId === 'string' ? { toolCallId: toolCall.toolCallId } : {}),
			...(typeof toolCall.toolName === 'string' ? { toolName: toolCall.toolName } : {}),
		}))
		.filter((toolCall) => Object.keys(toolCall).length > 0);

	return summaries.length > 0 ? summaries : undefined;
}

function buildToolSummaryText(toolCalls: Array<Record<string, unknown>>): string | undefined {
	const toolNames = [
		...new Set(
			toolCalls
				.map((toolCall) => (typeof toolCall.toolName === 'string' ? toolCall.toolName : undefined))
				.filter((toolName): toolName is string => toolName !== undefined),
		),
	];
	if (toolNames.length === 0) {
		return undefined;
	}

	return `Calling tools: ${toolNames.join(', ')}`;
}

function normalizeTraceMessage(message: unknown): Record<string, unknown> | undefined {
	if (!isRecord(message) || typeof message.role !== 'string') {
		return undefined;
	}

	if (message.role === 'tool') {
		return undefined;
	}

	const textContent = extractTextParts(message.content).join('').trim();
	const toolSummaryText = buildToolSummaryText(extractTraceToolCallsFromMessage(message));
	const content =
		textContent && toolSummaryText
			? `${textContent}\n\n[${toolSummaryText}]`
			: textContent || (toolSummaryText ? `[${toolSummaryText}]` : undefined);

	if (!content) {
		return undefined;
	}

	return {
		...(typeof message.id === 'string' ? { id: message.id } : {}),
		role: message.role,
		content,
	};
}

function normalizeTraceMessages(
	messages: unknown[] | undefined,
): Array<Record<string, unknown>> | undefined {
	if (!Array.isArray(messages)) {
		return undefined;
	}

	const normalized = messages
		.map((message) => normalizeTraceMessage(message))
		.filter((message): message is Record<string, unknown> => message !== undefined);

	return normalized.length > 0 ? normalized : undefined;
}

function buildAssistantChoice(
	responseMessages: unknown[] | undefined,
	record: LlmStepTraceRecord,
): Record<string, unknown> | undefined {
	const assistantMessage = responseMessages?.find(
		(message): message is Record<string, unknown> =>
			isRecord(message) && message.role === 'assistant',
	);

	if (assistantMessage) {
		return { message: assistantMessage };
	}

	const toolSummaryText = buildToolSummaryText(record.toolCalls);
	const content = record.textParts.join('');
	if (!content && !toolSummaryText) {
		return undefined;
	}

	const message: Record<string, unknown> = { role: 'assistant' };
	if (content && toolSummaryText) {
		message.content = `${content}\n\n[${toolSummaryText}]`;
	} else if (content) {
		message.content = content;
	} else if (toolSummaryText) {
		message.content = `[${toolSummaryText}]`;
	}
	return { message };
}

function buildLlmOutputs(
	record: LlmStepTraceRecord,
	stepResult?: StepResultLike,
): Record<string, unknown> {
	const rawResponseMessages =
		extractResponseMessages(stepResult?.response) ?? extractResponseMessages(record.response);
	const responseMessages = normalizeTraceMessages(rawResponseMessages);
	const usageMetadata = buildUsageMetadata(
		stepResult?.usage ?? record.usage,
		stepResult?.providerMetadata ?? record.providerMetadata,
	);
	const usageDebug = buildLlmUsageDebug(record, stepResult);
	const outputs: Record<string, unknown> = {};
	const choice = buildAssistantChoice(responseMessages, record);
	const messages =
		responseMessages ?? (choice && isRecord(choice.message) ? [choice.message] : undefined);

	if (choice) {
		outputs.choices = [choice];
	}
	if (messages) {
		outputs.messages = messages;
	}

	const requestedTools = summarizeRequestedTools(record.toolCalls);
	if (requestedTools) {
		outputs.requested_tools = requestedTools;
	}

	const reasoningText =
		record.reasoningParts.join('') ||
		(typeof stepResult?.reasoning === 'string'
			? stepResult.reasoning
			: Array.isArray(stepResult?.reasoning)
				? stepResult.reasoning
						.map((entry) =>
							isRecord(entry) && typeof entry.text === 'string' ? entry.text : undefined,
						)
						.filter((entry): entry is string => entry !== undefined)
						.join('')
				: undefined);
	if (reasoningText) {
		outputs.reasoning = reasoningText;
	}

	if (record.finishReason || stepResult?.finishReason) {
		outputs.finish_reason = stepResult?.finishReason ?? record.finishReason;
	}
	if (usageMetadata) {
		outputs.usage_metadata = usageMetadata;
	}
	if (usageDebug) {
		outputs.usage_debug = usageDebug;
	}

	return outputs;
}

function buildLlmMetadata(
	record: LlmStepTraceRecord,
	stepResult?: StepResultLike,
): Record<string, unknown> {
	const metadata: Record<string, unknown> = {
		step_message_id: record.messageId,
		final_status: 'completed',
		...(record.model.provider ? { ls_provider: record.model.provider } : {}),
		...(record.model.modelName ? { ls_model_name: record.model.modelName } : {}),
		...(record.finishReason || stepResult?.finishReason
			? { finish_reason: stepResult?.finishReason ?? record.finishReason }
			: {}),
	};

	const usageMetadata = buildUsageMetadata(
		stepResult?.usage ?? record.usage,
		stepResult?.providerMetadata ?? record.providerMetadata,
	);
	if (usageMetadata) {
		metadata.usage_metadata = usageMetadata;
	}

	return metadata;
}

async function finishRunTree(
	runTree: RunTree,
	options: {
		outputs?: Record<string, unknown>;
		metadata?: Record<string, unknown>;
		error?: string;
		endTime?: number;
	},
): Promise<void> {
	await runTree.end(
		options.outputs,
		options.error,
		options.endTime ?? Date.now(),
		options.metadata,
	);
	await runTree.patchRun();
}

function getChunkPayload(chunk: unknown): Record<string, unknown> | undefined {
	if (!isRecord(chunk)) {
		return undefined;
	}

	return isRecord(chunk.payload) ? chunk.payload : chunk;
}

function buildSyntheticToolInputs(
	toolCallId: string,
	_toolName: string,
	args: unknown,
): Record<string, unknown> {
	return sanitizeTracePayload({
		toolCallId,
		args,
	});
}

function shouldCreateSyntheticToolTrace(payload: Record<string, unknown>): boolean {
	const toolName = typeof payload.toolName === 'string' ? payload.toolName : '';
	return (
		toolName.startsWith('mastra_') ||
		SYNTHETIC_TOOL_TRACE_NAMES.has(toolName) ||
		payload.providerExecuted === true ||
		payload.dynamic === true
	);
}

async function startSyntheticToolTrace(
	chunk: unknown,
	records: Map<string, SyntheticToolTraceRecord>,
): Promise<void> {
	if (!isRecord(chunk) || chunk.type !== 'tool-call') {
		return;
	}

	const payload = getChunkPayload(chunk);
	if (!payload || !shouldCreateSyntheticToolTrace(payload)) {
		return;
	}

	const toolCallId = typeof payload.toolCallId === 'string' ? payload.toolCallId : '';
	const toolName = typeof payload.toolName === 'string' ? payload.toolName : '';
	if (!toolCallId || !toolName || records.has(toolCallId)) {
		return;
	}

	const parentRun = getTraceParentRun();
	if (!parentRun) {
		return;
	}

	const runTree = parentRun.createChild({
		name: `tool:${toolName}`,
		run_type: 'tool',
		tags: dedupeTags([
			...(parentRun.tags ?? []),
			'tool',
			...(toolName.startsWith('mastra_') ? ['native-tool'] : []),
		]),
		metadata: {
			...(parentRun.metadata ?? {}),
			tool_name: toolName,
			synthetic_tool_trace: true,
			...(payload.providerExecuted === true ? { provider_executed: true } : {}),
			...(payload.dynamic === true ? { dynamic_tool: true } : {}),
		},
		inputs: buildSyntheticToolInputs(toolCallId, toolName, payload.args),
	});
	await runTree.postRun();

	records.set(toolCallId, {
		toolCallId,
		toolName,
		runTree,
		finished: false,
	});
}

async function finishSyntheticToolTrace(
	chunk: unknown,
	records: Map<string, SyntheticToolTraceRecord>,
): Promise<void> {
	if (!isRecord(chunk) || (chunk.type !== 'tool-result' && chunk.type !== 'tool-error')) {
		return;
	}

	const payload = getChunkPayload(chunk);
	if (!payload) {
		return;
	}

	const toolCallId = typeof payload.toolCallId === 'string' ? payload.toolCallId : '';
	if (!toolCallId) {
		return;
	}

	if (!records.has(toolCallId)) {
		if (!shouldCreateSyntheticToolTrace(payload)) {
			return;
		}

		await startSyntheticToolTrace(
			{
				type: 'tool-call',
				payload,
			},
			records,
		);
	}

	const record = records.get(toolCallId);
	if (!record || record.finished) {
		return;
	}

	record.finished = true;
	await finishRunTree(record.runTree, {
		outputs: sanitizeTracePayload({
			result: payload.result,
		}),
		...(payload.isError === true
			? {
					error:
						typeof payload.result === 'string'
							? payload.result
							: typeof payload.error === 'string'
								? payload.error
								: 'Tool execution failed',
				}
			: {}),
		metadata: {
			final_status: payload.isError === true ? 'error' : 'completed',
		},
	});
}

async function finalizeSyntheticToolTraces(
	records: Map<string, SyntheticToolTraceRecord>,
	options?: { status?: TraceStatus; error?: string },
): Promise<void> {
	for (const record of records.values()) {
		if (record.finished) {
			continue;
		}

		record.finished = true;
		await finishRunTree(record.runTree, {
			outputs: sanitizeTracePayload({
				status: options?.status ?? 'completed',
			}),
			...(options?.error ? { error: options.error } : {}),
			metadata: {
				final_status: options?.status ?? 'completed',
			},
		});
	}
}

async function startLlmStepTrace(
	parentRun: RunTree | undefined,
	messageId: string,
	request: unknown,
	stepNumber?: number,
): Promise<LlmStepTraceRecord | undefined> {
	const resolvedParentRun = parentRun ?? getTraceParentRun();
	if (!resolvedParentRun) {
		return undefined;
	}

	const inputs = buildLlmInputPayload(request);
	const model = normalizeModelMetadata(resolvedParentRun.metadata?.model_id);
	const runTree = resolvedParentRun.createChild({
		name: formatLlmRunName(model),
		run_type: 'llm',
		tags: dedupeTags([...(resolvedParentRun.tags ?? []), 'llm']),
		metadata: {
			...(resolvedParentRun.metadata ?? {}),
			step_message_id: messageId,
			...(typeof stepNumber === 'number' ? { step_number: stepNumber + 1 } : {}),
			...(model.provider ? { ls_provider: model.provider } : {}),
			...(model.modelName ? { ls_model_name: model.modelName } : {}),
		},
		inputs,
	});
	await runTree.postRun();

	return {
		messageId,
		stepNumber,
		runTree,
		model,
		inputs,
		textParts: [],
		reasoningParts: [],
		toolCalls: [],
		toolResults: [],
		request,
		recordedFirstToken: false,
		finished: false,
	};
}

function findActiveStepRecord(
	records: LlmStepTraceRecord[],
	messageId?: string,
): LlmStepTraceRecord | undefined {
	if (messageId) {
		return records.find((record) => record.messageId === messageId && !record.finished);
	}

	for (let index = records.length - 1; index >= 0; index--) {
		if (!records[index].finished) {
			return records[index];
		}
	}

	return undefined;
}

function recordFirstTokenEvent(record: LlmStepTraceRecord): void {
	if (record.recordedFirstToken) {
		return;
	}

	record.runTree.addEvent({ name: 'new_token', time: new Date().toISOString() });
	record.recordedFirstToken = true;
}

function updateStepRecordFromChunk(
	chunk: unknown,
	records: LlmStepTraceRecord[],
): LlmStepTraceRecord | undefined {
	if (!isRecord(chunk) || typeof chunk.type !== 'string') {
		return undefined;
	}

	if (chunk.type === 'step-start' && typeof chunk.messageId === 'string') {
		return undefined;
	}

	const record = findActiveStepRecord(records);
	if (!record) {
		return undefined;
	}

	const payload = isRecord(chunk.payload) ? chunk.payload : chunk;
	if ((chunk.type === 'text-delta' || chunk.type === 'text') && typeof payload.text === 'string') {
		record.textParts.push(payload.text);
		recordFirstTokenEvent(record);
	}

	if (
		(chunk.type === 'reasoning-delta' || chunk.type === 'reasoning') &&
		typeof payload.text === 'string'
	) {
		record.reasoningParts.push(payload.text);
	}

	if (chunk.type === 'tool-call' && isRecord(payload)) {
		record.toolCalls.push(toTraceObject(payload));
	}

	if ((chunk.type === 'tool-result' || chunk.type === 'tool-error') && isRecord(payload)) {
		record.toolResults.push(toTraceObject(payload));
	}

	return record;
}

function applyStepFinishChunk(
	chunk: unknown,
	records: LlmStepTraceRecord[],
): LlmStepTraceRecord | undefined {
	if (!isRecord(chunk) || chunk.type !== 'step-finish') {
		return undefined;
	}

	const payload = getChunkPayload(chunk);
	const messageId = typeof payload?.messageId === 'string' ? payload.messageId : undefined;
	const record = findActiveStepRecord(records, messageId);
	if (!record) {
		return undefined;
	}

	const output = isRecord(payload?.output) ? payload.output : undefined;
	const stepResult = isRecord(payload?.stepResult) ? payload.stepResult : undefined;
	const metadata = isRecord(payload?.metadata) ? payload.metadata : undefined;

	record.finishReason =
		(stepResult && typeof stepResult.reason === 'string' ? stepResult.reason : undefined) ??
		(payload && typeof payload.finishReason === 'string' ? payload.finishReason : undefined) ??
		record.finishReason;
	const usage = output?.usage ?? payload?.usage;
	if (usage !== undefined) {
		record.usage = usage;
	}
	if (payload?.response !== undefined) {
		record.response = payload.response;
	}
	const request = metadata?.request ?? payload?.request;
	if (request !== undefined) {
		record.request = request;
	}
	const providerMetadata = metadata?.providerMetadata ?? payload?.providerMetadata;
	if (providerMetadata !== undefined) {
		record.providerMetadata = providerMetadata;
	}
	record.warnings =
		(stepResult && Array.isArray(stepResult.warnings) ? stepResult.warnings : undefined) ??
		payload?.warnings ??
		record.warnings;
	record.isContinued =
		stepResult?.isContinued === true ? true : payload?.isContinued === true || record.isContinued;

	if (output && typeof output.text === 'string') {
		record.textParts = output.text.length > 0 ? [output.text] : [];
	}

	if (output && Array.isArray(output.toolCalls)) {
		record.toolCalls = output.toolCalls.map((entry) => toTraceObject(entry));
	}

	if (output && Array.isArray(output.toolResults)) {
		record.toolResults = output.toolResults.map((entry) => toTraceObject(entry));
	}

	const responseModelId =
		payload && isRecord(payload.response) && typeof payload.response.modelId === 'string'
			? payload.response.modelId
			: undefined;
	if (responseModelId) {
		const model = normalizeModelMetadata(responseModelId);
		record.model = {
			provider: model.provider ?? record.model.provider,
			modelName: model.modelName ?? responseModelId,
		};
		record.runTree.name = formatLlmRunName(record.model);
		record.runTree.metadata = {
			...(record.runTree.metadata ?? {}),
			...(record.model.provider ? { ls_provider: record.model.provider } : {}),
			...(record.model.modelName ? { ls_model_name: record.model.modelName } : {}),
		};
	}

	return record;
}

function isStepResultLike(value: unknown): value is StepResultLike {
	return isRecord(value);
}

function toStepResultLike(value: unknown): StepResultLike | undefined {
	return isStepResultLike(value) ? value : undefined;
}

function toStepStartLike(value: unknown): StepStartLike | undefined {
	return isRecord(value) ? value : undefined;
}

function getSyntheticStepMessageId(stepResult: StepResultLike, index: number): string {
	const messages = extractResponseMessages(stepResult.response);
	const messageId = messages?.find(
		(message): message is Record<string, unknown> =>
			isRecord(message) && typeof message.id === 'string',
	)?.id;

	return typeof messageId === 'string' ? messageId : `step-${index + 1}`;
}

async function createFallbackStepTrace(
	parentRun: RunTree | undefined,
	stepResult: StepResultLike,
	index: number,
): Promise<LlmStepTraceRecord | undefined> {
	const record = await startLlmStepTrace(
		parentRun,
		getSyntheticStepMessageId(stepResult, index),
		stepResult.request,
		stepResult.stepNumber ?? index,
	);
	if (!record) {
		return undefined;
	}

	if (typeof stepResult.text === 'string' && stepResult.text.length > 0) {
		record.textParts.push(stepResult.text);
		recordFirstTokenEvent(record);
	}

	if (typeof stepResult.reasoning === 'string' && stepResult.reasoning.length > 0) {
		record.reasoningParts.push(stepResult.reasoning);
	} else if (Array.isArray(stepResult.reasoning)) {
		record.reasoningParts.push(
			...stepResult.reasoning
				.map((entry) =>
					isRecord(entry) && typeof entry.text === 'string' ? entry.text : undefined,
				)
				.filter((entry): entry is string => entry !== undefined),
		);
	}

	if (Array.isArray(stepResult.toolCalls)) {
		record.toolCalls.push(...stepResult.toolCalls.map((entry) => toTraceObject(entry)));
	}

	if (Array.isArray(stepResult.toolResults)) {
		record.toolResults.push(...stepResult.toolResults.map((entry) => toTraceObject(entry)));
	}

	record.finishReason = stepResult.finishReason;
	if (stepResult.usage !== undefined) {
		record.usage = stepResult.usage;
	}
	if (stepResult.request !== undefined) {
		record.request = stepResult.request;
	}
	if (stepResult.response !== undefined) {
		record.response = stepResult.response;
	}
	if (stepResult.providerMetadata !== undefined) {
		record.providerMetadata = stepResult.providerMetadata;
	}

	const responseModelId =
		isRecord(stepResult.response) && typeof stepResult.response.modelId === 'string'
			? stepResult.response.modelId
			: undefined;
	if (responseModelId) {
		const model = normalizeModelMetadata(responseModelId);
		record.model = {
			provider: model.provider ?? record.model.provider,
			modelName: model.modelName ?? responseModelId,
		};
		record.runTree.name = formatLlmRunName(record.model);
	}

	return record;
}

function applyStepResultToRecord(record: LlmStepTraceRecord, stepResult: StepResultLike): void {
	if (typeof stepResult.text === 'string') {
		record.textParts = stepResult.text.length > 0 ? [stepResult.text] : [];
	}

	if (typeof stepResult.reasoning === 'string') {
		record.reasoningParts = stepResult.reasoning.length > 0 ? [stepResult.reasoning] : [];
	} else if (Array.isArray(stepResult.reasoning)) {
		record.reasoningParts = stepResult.reasoning
			.map((entry) => (isRecord(entry) && typeof entry.text === 'string' ? entry.text : undefined))
			.filter((entry): entry is string => entry !== undefined);
	}

	if (Array.isArray(stepResult.toolCalls)) {
		record.toolCalls = stepResult.toolCalls.map((entry) => toTraceObject(entry));
	}

	if (Array.isArray(stepResult.toolResults)) {
		record.toolResults = stepResult.toolResults.map((entry) => toTraceObject(entry));
	}

	if (typeof stepResult.finishReason === 'string') {
		record.finishReason = stepResult.finishReason;
	}
	if (stepResult.usage !== undefined) {
		record.usage = stepResult.usage;
	}
	if (stepResult.request !== undefined) {
		record.request = stepResult.request;
	}
	if (stepResult.response !== undefined) {
		record.response = stepResult.response;
	}
	if (stepResult.providerMetadata !== undefined) {
		record.providerMetadata = stepResult.providerMetadata;
	}

	const responseModelId =
		isRecord(stepResult.response) && typeof stepResult.response.modelId === 'string'
			? stepResult.response.modelId
			: undefined;
	if (responseModelId) {
		const model = normalizeModelMetadata(responseModelId);
		record.model = {
			provider: model.provider ?? record.model.provider,
			modelName: model.modelName ?? responseModelId,
		};
		record.runTree.name = formatLlmRunName(record.model);
	}
}

export function createLlmStepTraceHooks(
	explicitParentRun?: RunTree,
): LlmStepTraceHooks | undefined {
	const activeParentRun = explicitParentRun ?? getTraceParentRun();
	if (!activeParentRun) {
		return undefined;
	}

	const records: LlmStepTraceRecord[] = [];
	const recordsByStepNumber = new Map<number, LlmStepTraceRecord>();
	const getActiveRecord = (): LlmStepTraceRecord | undefined => {
		for (let index = records.length - 1; index >= 0; index--) {
			const record = records[index];
			if (!record.finished) {
				return record;
			}
		}

		return undefined;
	};
	const restoreTraceParent = () => {
		setTraceParentOverride(activeParentRun);
	};
	restoreTraceParent();

	const patchFinishedRecordIfNeeded = async (
		record: LlmStepTraceRecord,
		stepResult: StepResultLike | undefined,
		options?: { status?: TraceStatus; error?: string },
	): Promise<void> => {
		const metadata = {
			...(record.runTree.metadata ?? {}),
			...buildLlmMetadata(record, stepResult),
			...(options?.status && options.status !== 'completed'
				? { final_status: options.status }
				: {}),
		};
		record.runTree.inputs = record.inputs;
		record.runTree.name = formatLlmRunName(record.model);
		record.runTree.metadata = metadata;

		const endTimeValue = Reflect.get(record.runTree, 'end_time');
		const endTime = typeof endTimeValue === 'number' ? endTimeValue : undefined;

		await finishRunTree(record.runTree, {
			outputs: buildLlmOutputs(record, stepResult),
			metadata,
			...(options?.error ? { error: options.error } : {}),
			...(endTime !== undefined ? { endTime } : {}),
		});
	};

	const startStepTrace = async (options: unknown): Promise<LlmStepTraceRecord | undefined> => {
		const stepStart = toStepStartLike(options);
		if (typeof stepStart?.stepNumber !== 'number') {
			return undefined;
		}

		const existingRecord = recordsByStepNumber.get(stepStart.stepNumber);
		if (existingRecord && !existingRecord.finished) {
			setTraceParentOverride(existingRecord.runTree);
			return existingRecord;
		}

		const record = await startLlmStepTrace(
			activeParentRun,
			`step-${stepStart.stepNumber + 1}`,
			{
				messages: Array.isArray(stepStart.messages) ? stepStart.messages : [],
			},
			stepStart.stepNumber,
		);
		if (!record) {
			return undefined;
		}

		const stepModelId = stepStart.model?.modelId;
		if (typeof stepModelId === 'string' && stepModelId.length > 0) {
			record.model = {
				provider: stepStart.model?.provider ?? record.model.provider,
				modelName: normalizeModelMetadata(stepModelId).modelName ?? stepModelId,
			};
			record.runTree.name = formatLlmRunName(record.model);
			record.runTree.metadata = {
				...(record.runTree.metadata ?? {}),
				...(record.model.provider ? { ls_provider: record.model.provider } : {}),
				...(record.model.modelName ? { ls_model_name: record.model.modelName } : {}),
			};
		}

		recordsByStepNumber.set(stepStart.stepNumber, record);
		records.push(record);
		setTraceParentOverride(record.runTree);
		return record;
	};

	const prepareStep = async (options: unknown): Promise<undefined> => {
		await startStepTrace(options);
		return undefined;
	};

	const onStepStart = async (options: unknown): Promise<void> => {
		await startStepTrace(options);
	};

	const onStepFinish = async (stepResultValue: unknown): Promise<void> => {
		const stepResult = toStepResultLike(stepResultValue);
		if (!stepResult) {
			return;
		}

		const stepNumber =
			typeof stepResult.stepNumber === 'number' ? stepResult.stepNumber : undefined;
		const record = stepNumber !== undefined ? recordsByStepNumber.get(stepNumber) : undefined;
		if (!record || record.finished) {
			// Resumed streams can replay already-finished step results before the next real
			// step starts. Those events do not represent a new LLM invocation, so ignore them
			// instead of creating a synthetic 1ms fallback span.
			return;
		}

		applyStepResultToRecord(record, stepResult);

		record.runTree.inputs = record.inputs;
		record.runTree.name = formatLlmRunName(record.model);
		record.runTree.metadata = {
			...(record.runTree.metadata ?? {}),
			...buildLlmMetadata(record, stepResult),
		};

		await finishRunTree(record.runTree, {
			outputs: buildLlmOutputs(record, stepResult),
			metadata: record.runTree.metadata,
		});
		record.finished = true;
		if (stepNumber !== undefined) {
			recordsByStepNumber.delete(stepNumber);
		}
		restoreTraceParent();
	};

	return {
		executionOptions: {
			prepareStep,
			experimental_prepareStep: prepareStep,
			experimental_onStepStart: onStepStart,
			onStepFinish,
			// Disable Vercel AI SDK's built-in LangSmith tracing — we manage traces ourselves
			experimental_telemetry: { isEnabled: false },
		},
		onStreamChunk: (chunk) => {
			updateStepRecordFromChunk(chunk, records);
			applyStepFinishChunk(chunk, records);
		},
		startSegment: () => {
			for (const [stepNumber, record] of recordsByStepNumber.entries()) {
				if (record.finished) {
					recordsByStepNumber.delete(stepNumber);
				}
			}

			const activeRecord = getActiveRecord();
			if (activeRecord) {
				setTraceParentOverride(activeRecord.runTree);
				return;
			}

			restoreTraceParent();
		},
		finalize: async (source, options) => {
			const resolvedSteps = await source.steps?.then(
				(steps) => steps,
				() => undefined,
			);
			const segmentUsage = await resolveSegmentUsage(source);
			const stepResults = Array.isArray(resolvedSteps)
				? resolvedSteps
						.map((stepValue) => toStepResultLike(stepValue))
						.filter((stepResult): stepResult is StepResultLike => stepResult !== undefined)
				: [];
			const stepResultsByStepNumber = new Map<number, StepResultLike>();
			for (const stepResult of stepResults) {
				if (typeof stepResult.stepNumber === 'number') {
					stepResultsByStepNumber.set(stepResult.stepNumber, stepResult);
				}
			}

			for (const [index, record] of records.entries()) {
				const stepResult =
					(typeof record.stepNumber === 'number'
						? stepResultsByStepNumber.get(record.stepNumber)
						: undefined) ?? stepResults[index];
				const hadUsageMetadata = buildUsageMetadata(record.usage, record.providerMetadata);
				const hadUsageMetadataJson = hadUsageMetadata
					? JSON.stringify(hadUsageMetadata)
					: undefined;
				const hadResponse = record.response !== undefined;
				const hadFinishReason = record.finishReason !== undefined;

				if (stepResult) {
					applyStepResultToRecord(record, stepResult);
				}
				maybeBackfillRecordUsageFromSegment(record, records, segmentUsage);

				if (record.finished) {
					const hasUsageMetadata = buildUsageMetadata(record.usage, record.providerMetadata);
					const hasUsageMetadataJson = hasUsageMetadata
						? JSON.stringify(hasUsageMetadata)
						: undefined;
					const hasResponse = record.response !== undefined;
					const hasFinishReason = record.finishReason !== undefined;

					if (
						hadUsageMetadataJson !== hasUsageMetadataJson ||
						(!hadResponse && hasResponse) ||
						(!hadFinishReason && hasFinishReason)
					) {
						await patchFinishedRecordIfNeeded(record, stepResult, options);
					}
					continue;
				}

				record.runTree.inputs = record.inputs;
				record.runTree.name = formatLlmRunName(record.model);
				record.runTree.metadata = {
					...(record.runTree.metadata ?? {}),
					...buildLlmMetadata(record, stepResult),
					...(options?.status && options.status !== 'completed'
						? { final_status: options.status }
						: {}),
				};

				await finishRunTree(record.runTree, {
					outputs: buildLlmOutputs(record, stepResult),
					metadata: record.runTree.metadata,
					...(options?.error ? { error: options.error } : {}),
				});
				record.finished = true;
			}

			restoreTraceParent();
			recordsByStepNumber.clear();
		},
	};
}

async function finalizeLlmStepTraces(
	source: ResumableStreamSource,
	records: LlmStepTraceRecord[],
	options?: { status?: TraceStatus; error?: string },
): Promise<void> {
	const parentRun = getTraceParentRun();
	const resolvedSteps = await source.steps?.then(
		(steps) => steps,
		() => undefined,
	);
	const segmentUsage = await resolveSegmentUsage(source);
	const stepResults = Array.isArray(resolvedSteps)
		? resolvedSteps
				.map((stepValue) => toStepResultLike(stepValue))
				.filter((stepResult): stepResult is StepResultLike => stepResult !== undefined)
		: [];
	const stepResultsByStepNumber = new Map<number, StepResultLike>();
	for (const stepResult of stepResults) {
		if (typeof stepResult.stepNumber === 'number') {
			stepResultsByStepNumber.set(stepResult.stepNumber, stepResult);
		}
	}

	if (records.length === 0 && stepResults.length > 0) {
		for (const [index, stepResult] of stepResults.entries()) {
			const fallbackRecord = await createFallbackStepTrace(parentRun, stepResult, index);
			if (fallbackRecord) {
				records.push(fallbackRecord);
			}
		}
	}

	if (records.length === 0) {
		return;
	}

	for (const [index, record] of records.entries()) {
		if (record.finished) {
			continue;
		}

		const stepResult =
			(typeof record.stepNumber === 'number'
				? stepResultsByStepNumber.get(record.stepNumber)
				: undefined) ?? stepResults[index];
		if (stepResult) {
			applyStepResultToRecord(record, stepResult);
		}
		maybeBackfillRecordUsageFromSegment(record, records, segmentUsage);
		record.runTree.inputs = record.inputs;
		record.runTree.name = formatLlmRunName(record.model);
		record.runTree.metadata = {
			...(record.runTree.metadata ?? {}),
			...buildLlmMetadata(record, stepResult),
			...(options?.status && options.status !== 'completed'
				? { final_status: options.status }
				: {}),
		};

		await finishRunTree(record.runTree, {
			outputs: buildLlmOutputs(record, stepResult),
			metadata: record.runTree.metadata,
			...(options?.error ? { error: options.error } : {}),
		});
		record.finished = true;
	}
}

export async function executeResumableStream(
	options: ExecuteResumableStreamOptions,
): Promise<ExecuteResumableStreamResult> {
	let activeSource = options.stream;
	let activeStream = options.stream.fullStream;
	let activeMastraRunId = options.stream.runId ?? options.initialMastraRunId ?? '';
	let text = options.stream.text;
	const workSummaryAccumulator = new WorkSummaryAccumulator();

	let currentResponseId: string | undefined;

	while (true) {
		let suspension: SuspensionInfo | undefined;
		let hasError = false;
		let pendingConfirmation: Promise<Record<string, unknown>> | undefined;
		let confirmationEvent: ConfirmationRequestEvent | undefined;
		let confirmationEventPublished = false;
		const llmStepRecords: LlmStepTraceRecord[] = [];
		const syntheticToolRecords = new Map<string, SyntheticToolTraceRecord>();
		options.llmStepTraceHooks?.startSegment();

		for await (const chunk of activeStream) {
			if (options.context.signal.aborted) {
				if (options.llmStepTraceHooks) {
					await options.llmStepTraceHooks.finalize(activeSource, {
						status: 'cancelled',
						error: 'Run cancelled while streaming',
					});
				} else {
					await finalizeLlmStepTraces(activeSource, llmStepRecords, {
						status: 'cancelled',
						error: 'Run cancelled while streaming',
					});
				}
				await finalizeSyntheticToolTraces(syntheticToolRecords, {
					status: 'cancelled',
					error: 'Run cancelled while streaming',
				});
				return {
					status: 'cancelled',
					mastraRunId: activeMastraRunId,
					text,
					workSummary: workSummaryAccumulator.toSummary(),
				};
			}

			await startSyntheticToolTrace(chunk, syntheticToolRecords);
			await finishSyntheticToolTrace(chunk, syntheticToolRecords);

			options.llmStepTraceHooks?.onStreamChunk(chunk);

			// Always capture responseId from step-start, regardless of trace hook path.
			if (isRecord(chunk) && chunk.type === 'step-start') {
				const stepPayload = getChunkPayload(chunk);
				const stepMessageId =
					typeof stepPayload?.messageId === 'string' ? stepPayload.messageId : undefined;
				currentResponseId = stepMessageId;
			}

			if (options.llmStepTraceHooks) {
				// Step lifecycle is handled by prepareStep/onStepFinish callbacks.
			} else if (isRecord(chunk) && chunk.type === 'step-start') {
				const payload = getChunkPayload(chunk);
				const messageId = typeof payload?.messageId === 'string' ? payload.messageId : undefined;
				const request = payload?.request;
				const stepTrace =
					typeof messageId === 'string'
						? await startLlmStepTrace(undefined, messageId, request)
						: undefined;
				if (stepTrace) {
					llmStepRecords.push(stepTrace);
				}
			} else {
				updateStepRecordFromChunk(chunk, llmStepRecords);
				applyStepFinishChunk(chunk, llmStepRecords);
			}

			const parsedSuspension = parseSuspension(chunk);
			if (parsedSuspension) {
				if (!suspension) {
					suspension = parsedSuspension;
					if (options.control.mode === 'auto') {
						options.control.onSuspension?.(parsedSuspension);
						pendingConfirmation = options.control.waitForConfirmation(parsedSuspension.requestId);
					}
				} else if (!isSameSuspension(parsedSuspension, suspension)) {
					options.context.logger.warn(
						'Additional HITL suspension encountered before resume; deferring',
						{
							threadId: options.context.threadId,
							runId: options.context.runId,
							activeRequestId: suspension.requestId,
							deferredRequestId: parsedSuspension.requestId,
							activeToolCallId: suspension.toolCallId,
							deferredToolCallId: parsedSuspension.toolCallId,
						},
					);
				}
			}

			if (isErrorChunk(chunk)) {
				hasError = true;
			}

			const event = mapMastraChunkToEvent(
				options.context.runId,
				options.context.agentId,
				chunk,
				currentResponseId,
			);
			if (event) {
				workSummaryAccumulator.observe(event);
				let shouldPublishEvent = true;

				if (event.type === 'confirmation-request') {
					const isPrimarySuspension =
						suspension !== undefined &&
						event.payload.requestId === suspension.requestId &&
						event.payload.toolCallId === suspension.toolCallId;
					if (!isPrimarySuspension || confirmationEventPublished || confirmationEvent) {
						shouldPublishEvent = false;
					}

					if (shouldPublishEvent && options.control.mode === 'manual') {
						confirmationEvent = event;
						shouldPublishEvent = false;
					}

					if (shouldPublishEvent) {
						confirmationEventPublished = true;
					}
				}

				if (shouldPublishEvent) {
					options.context.eventBus.publish(options.context.threadId, event);
				}
			}

			if (options.control.mode === 'auto' && options.control.drainCorrections) {
				publishCorrections(options.context, options.control.drainCorrections());
			}
		}

		const traceStatus = suspension ? 'suspended' : hasError ? 'errored' : 'completed';
		if (options.llmStepTraceHooks) {
			await options.llmStepTraceHooks.finalize(activeSource, {
				status: traceStatus,
			});
		} else {
			await finalizeLlmStepTraces(activeSource, llmStepRecords, {
				status: traceStatus,
			});
		}
		await finalizeSyntheticToolTraces(syntheticToolRecords, {
			status: traceStatus,
		});

		if (options.context.signal.aborted) {
			return {
				status: 'cancelled',
				mastraRunId: activeMastraRunId,
				text,
				workSummary: workSummaryAccumulator.toSummary(),
			};
		}

		if (!suspension) {
			return {
				status: hasError ? 'errored' : 'completed',
				mastraRunId: activeMastraRunId,
				text,
				workSummary: workSummaryAccumulator.toSummary(),
			};
		}

		if (options.control.mode === 'manual') {
			return {
				status: 'suspended',
				mastraRunId: activeMastraRunId,
				text,
				suspension,
				workSummary: workSummaryAccumulator.toSummary(),
				...(confirmationEvent ? { confirmationEvent } : {}),
			};
		}

		const confirmationPromise =
			pendingConfirmation ?? options.control.waitForConfirmation(suspension.requestId);
		const resumeData = await waitForConfirmationOrCorrection(
			options.context.signal,
			confirmationPromise,
			options.control,
			options.context,
		);
		const resumeOptions = options.control.buildResumeOptions?.({
			mastraRunId: activeMastraRunId,
			suspension,
		}) ?? {
			runId: activeMastraRunId,
			toolCallId: suspension.toolCallId,
		};
		const resumed = await asResumable(options.agent).resumeStream(resumeData, {
			...resumeOptions,
			...(options.llmStepTraceHooks?.executionOptions ?? {}),
		});

		activeMastraRunId =
			(typeof resumed.runId === 'string' ? resumed.runId : '') || activeMastraRunId;
		activeSource = resumed;
		activeStream = resumed.fullStream;
		text = resumed.text;
	}
}

function publishCorrections(context: ResumableStreamContext, corrections: string[]): void {
	for (const correction of corrections) {
		context.eventBus.publish(context.threadId, {
			type: 'text-delta',
			runId: context.runId,
			agentId: context.agentId,
			payload: { text: `\n[USER CORRECTION]: ${correction}\n` },
		});
	}
}

function isErrorChunk(chunk: unknown): boolean {
	return (
		chunk !== null &&
		typeof chunk === 'object' &&
		(chunk as Record<string, unknown>).type === 'error'
	);
}

async function waitForConfirmation(
	signal: AbortSignal,
	confirmationPromise: Promise<Record<string, unknown>>,
): Promise<Record<string, unknown>> {
	if (signal.aborted) {
		throw new Error('Run cancelled while waiting for confirmation');
	}

	let abortHandler: (() => void) | undefined;

	try {
		return await Promise.race([
			confirmationPromise,
			new Promise<never>((_, reject) => {
				abortHandler = () => reject(new Error('Run cancelled while waiting for confirmation'));
				signal.addEventListener('abort', abortHandler, { once: true });
			}),
		]);
	} finally {
		if (abortHandler) {
			signal.removeEventListener('abort', abortHandler);
		}
	}
}

/**
 * Race the HITL confirmation promise against an incoming user correction.
 * When a correction arrives first, auto-confirm the suspended tool call with
 * override data so the builder can resume and incorporate the correction.
 */
async function waitForConfirmationOrCorrection(
	signal: AbortSignal,
	confirmationPromise: Promise<Record<string, unknown>>,
	control: AutoResumeControl,
	context: ResumableStreamContext,
): Promise<Record<string, unknown>> {
	if (!control.waitForCorrection) {
		return await waitForConfirmation(signal, confirmationPromise);
	}

	const correctionSentinel = Object.freeze({ __correctionOverride: true });
	const raced = Promise.race([
		confirmationPromise,
		control.waitForCorrection().then(() => correctionSentinel as Record<string, unknown>),
	]);

	const result = await waitForConfirmation(signal, raced);

	if (result === correctionSentinel) {
		const corrections = control.drainCorrections?.() ?? [];
		publishCorrections(context, corrections);
		return {
			__correctionOverride: true,
			message:
				'The user sent a correction while this tool was waiting for confirmation. ' +
				'The confirmation has been skipped. Apply the correction and continue.',
			corrections,
		};
	}

	return result;
}

function isSameSuspension(left: SuspensionInfo, right: SuspensionInfo): boolean {
	return left.requestId === right.requestId && left.toolCallId === right.toolCallId;
}

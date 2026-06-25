import {
	redactText,
	SUPPORTED_PII_CATEGORIES,
	type AttributeValue,
	type RedactionOptions,
	type RuntimeSkillRegistry,
} from '@n8n/agents';
import { isRecord } from '@n8n/utils';
import { createHash } from 'node:crypto';

import {
	DOMAIN_TOOL_IDS,
	ORCHESTRATION_TOOL_IDS,
	ORCHESTRATION_TOOL_NAMES,
	WORKSPACE_TOOL_IDS,
} from '../tools/tool-ids';
import type { InstanceAiToolRegistry } from '../types';
import { formatAgentRoleLabel, formatTraceLabel } from './trace-labels';

const MAX_TRACE_DEPTH = 4;
const MAX_PROMPT_SCHEMA_TRACE_DEPTH = 12;
const MAX_TOOL_IO_TRACE_DEPTH = 8;
const MAX_TRACE_STRING_LENGTH = 2_000;
const MAX_TOOL_ACTION_DISPLAY_LENGTH = 64;
const MAX_TRACE_ARRAY_ITEMS = 20;
const MAX_TRACE_OBJECT_KEYS = 30;
const SENSITIVE_TELEMETRY_KEY_PATTERN =
	/(api[_-]?key|authorization|bearer|cookie|credentials?|password|secret|access[_-]?token|refresh[_-]?token|id[_-]?token|session[_-]?token|auth[_-]?token|(?:^|[._-])token$)/i;

/**
 * LangSmith structural identifier attributes. These carry the run/trace/span IDs
 * and dotted-order path used to reconstruct the trace hierarchy — never user
 * content. They must bypass PII/secret scrubbing: the redactor otherwise mangles
 * the zero-prefixed UUIDs (e.g. `00000000-0000-0000-...`) into `[REDACTED]-...`,
 * which LangSmith rejects with HTTP 422 ("invalid UUID received for
 * parent_run_id"), silently dropping every child span.
 */
const STRUCTURAL_TELEMETRY_ID_KEYS = new Set<string>([
	'langsmith.span.id',
	'langsmith.span.parent_id',
	'langsmith.trace.id',
	'langsmith.span.dotted_order',
	'langsmith.traceable_parent_otel_span_id',
]);

/**
 * Correlation identifiers carried in trace metadata, e.g. `langsmith_root_run_id`,
 * `langsmith_actor_run_id`, `continued_from_run_id`, `spawned_by_span_id` — and
 * their `langsmith.metadata.`-prefixed attribute forms. Like the structural keys
 * above these are internally generated run/trace/span IDs, several of which are
 * zero-prefixed UUIDs that the scrubber would otherwise corrupt into
 * `[REDACTED]-...`.
 */
const CORRELATION_ID_KEY_PATTERN = /(?:^|[._])(?:run|trace|span|activation)_id$/;

/** True for run/trace/span identifier attributes that must skip content scrubbing. */
function isStructuralTelemetryIdKey(key: string): boolean {
	return STRUCTURAL_TELEMETRY_ID_KEYS.has(key) || CORRELATION_ID_KEY_PATTERN.test(key);
}

/**
 * Telemetry/tracing redaction policy. Deliberately stricter than the
 * user-facing output policy `DEFAULT_OUTPUT_REDACTION_OPTIONS`.
 */
export const DEFAULT_TELEMETRY_REDACTION_OPTIONS: RedactionOptions = {
	secrets: true,
	detect: SUPPORTED_PII_CATEGORIES,
};

/** Redact secrets + all PII from a free-text telemetry value before it egresses. */
function scrubTelemetryText(value: string): string {
	return redactText(value, DEFAULT_TELEMETRY_REDACTION_OPTIONS).text;
}

const LANGSMITH_TRACE_NAME = 'langsmith.trace.name';
const LANGSMITH_SPAN_KIND = 'langsmith.span.kind';
const LANGSMITH_USAGE_METADATA = 'langsmith.usage_metadata';
export const GEN_AI_PROMPT = 'gen_ai.prompt';
export const GEN_AI_COMPLETION = 'gen_ai.completion';
const GEN_AI_OPERATION_NAME = 'gen_ai.operation.name';
const GEN_AI_USAGE_INPUT_TOKENS = 'gen_ai.usage.input_tokens';
const GEN_AI_USAGE_OUTPUT_TOKENS = 'gen_ai.usage.output_tokens';
const GEN_AI_USAGE_TOTAL_TOKENS = 'gen_ai.usage.total_tokens';
const GEN_AI_USAGE_INPUT_TOKEN_DETAILS = 'gen_ai.usage.input_token_details';
const AI_OPERATION_ID = 'ai.operationId';
const LLM_AI_SDK_OPERATION_IDS = new Set([
	'ai.generateText.doGenerate',
	'ai.streamText.doStream',
	'ai.generateObject.doGenerate',
	'ai.streamObject.doStream',
]);

export interface AgentTraceInputOptions {
	systemPrompt?: string;
	tools?: InstanceAiToolRegistry;
	deferredTools?: InstanceAiToolRegistry;
	runtimeTools?: InstanceAiToolRegistry;
	runtimeSkills?: RuntimeSkillRegistry;
	modelId?: unknown;
	memory?: unknown;
	toolSearchEnabled?: boolean;
	inputProcessors?: string[];
}

function truncateString(value: string): string {
	if (value.length <= MAX_TRACE_STRING_LENGTH) {
		return value;
	}

	return `${value.slice(0, MAX_TRACE_STRING_LENGTH)}...`;
}

export function toTelemetryAttributeValue(value: unknown): AttributeValue | undefined {
	if (value === undefined || value === null) {
		return undefined;
	}

	if (typeof value === 'string') {
		return truncateString(value);
	}

	if (typeof value === 'number' || typeof value === 'boolean') {
		return value;
	}

	if (Array.isArray(value)) {
		if (value.every((entry): entry is string => typeof entry === 'string')) {
			return value.map((entry) => truncateString(entry));
		}
		if (value.every((entry): entry is number => typeof entry === 'number')) {
			return value;
		}
		if (value.every((entry): entry is boolean => typeof entry === 'boolean')) {
			return value;
		}
		return value.map((entry) => truncateString(String(sanitizeTraceValue(entry))));
	}

	const sanitized = sanitizeTraceValue(value);
	if (typeof sanitized === 'string') {
		return sanitized;
	}
	if (typeof sanitized === 'number' || typeof sanitized === 'boolean') {
		return sanitized;
	}
	return truncateString(JSON.stringify(sanitized));
}

export function toTelemetryMetadata(
	...records: Array<Record<string, unknown> | undefined>
): Record<string, AttributeValue> {
	const metadata: Record<string, AttributeValue> = {};

	for (const record of records) {
		if (!record) continue;

		for (const [key, value] of Object.entries(record)) {
			if (key.startsWith('langsmith.metadata.')) {
				continue;
			}
			const attributeValue = toTelemetryAttributeValue(value);
			if (attributeValue !== undefined) {
				metadata[key] = attributeValue;
			}
		}
	}

	return metadata;
}

function redactTelemetryJsonValue(
	value: unknown,
	keyHint?: string,
	depth = 0,
	maxDepth = MAX_TRACE_DEPTH,
): unknown {
	if (depth > maxDepth) {
		return '[redacted-depth-limit]';
	}

	if (keyHint && SENSITIVE_TELEMETRY_KEY_PATTERN.test(keyHint)) {
		return '[redacted]';
	}

	if (typeof value === 'string') {
		return scrubTelemetryText(value);
	}

	if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
		return value;
	}

	if (Array.isArray(value)) {
		return value.map((entry) => redactTelemetryJsonValue(entry, keyHint, depth + 1, maxDepth));
	}

	if (isRecord(value)) {
		const redacted: Record<string, unknown> = {};
		for (const [key, entryValue] of Object.entries(value)) {
			redacted[key] = redactTelemetryJsonValue(entryValue, key, depth + 1, maxDepth);
		}
		return redacted;
	}

	return sanitizeTraceValue(value);
}

function maxRedactionDepthForAttribute(key: string): number {
	if (key === 'ai.prompt.messages' || key === GEN_AI_PROMPT) {
		return MAX_PROMPT_SCHEMA_TRACE_DEPTH;
	}

	if (key === 'ai.toolCall.args' || key === 'ai.toolCall.result' || key === GEN_AI_COMPLETION) {
		return MAX_TOOL_IO_TRACE_DEPTH;
	}

	return MAX_TRACE_DEPTH;
}

function redactTelemetryAttribute(key: string, value: unknown): unknown {
	// Structural run/trace/span identifiers must pass through untouched — scrubbing
	// them corrupts the IDs, breaking LangSmith ingestion (422) and run correlation.
	if (isStructuralTelemetryIdKey(key)) {
		return value;
	}

	if (SENSITIVE_TELEMETRY_KEY_PATTERN.test(key)) {
		return '[redacted]';
	}

	const maxDepth = maxRedactionDepthForAttribute(key);

	if (typeof value !== 'string') {
		return redactTelemetryJsonValue(value, key, 0, maxDepth);
	}

	const trimmed = value.trim();
	if (
		(trimmed.startsWith('{') && trimmed.endsWith('}')) ||
		(trimmed.startsWith('[') && trimmed.endsWith(']'))
	) {
		try {
			const parsed: unknown = JSON.parse(trimmed);
			return JSON.stringify(redactTelemetryJsonValue(parsed, key, 0, maxDepth));
		} catch {
			return scrubTelemetryText(value);
		}
	}

	return scrubTelemetryText(value);
}

function parseTelemetryJson(value: unknown): unknown {
	if (typeof value !== 'string') {
		return undefined;
	}

	try {
		const parsed: unknown = JSON.parse(value);
		return parsed;
	} catch {
		return undefined;
	}
}

function parseTelemetryTools(value: unknown): unknown[] | undefined {
	if (!Array.isArray(value)) {
		const parsed = parseTelemetryJson(value);
		return Array.isArray(parsed) ? parseTelemetryTools(parsed) : undefined;
	}

	const entries: readonly unknown[] = value;
	const tools: unknown[] = [];
	for (const entry of entries) {
		tools.push(typeof entry === 'string' ? (parseTelemetryJson(entry) ?? entry) : entry);
	}

	return tools.length > 0 ? tools : undefined;
}

function readToolCallPayload(part: Record<string, unknown>): unknown {
	if ('input' in part) return part.input;
	if ('args' in part) return part.args;
	if ('arguments' in part) return part.arguments;
	return {};
}

function readToolResultPayload(part: Record<string, unknown>): unknown {
	if ('output' in part) return part.output;
	if ('result' in part) return part.result;
	if ('content' in part) return part.content;
	return '';
}

function stringifyToolPayload(value: unknown): string {
	if (value === undefined || value === null) {
		return '';
	}

	if (typeof value === 'string') {
		return value;
	}

	try {
		return JSON.stringify(value) ?? '';
	} catch {
		return '[unserializable]';
	}
}

function extractAssistantToolCall(
	part: Record<string, unknown>,
): Record<string, unknown> | undefined {
	const toolCallId =
		typeof part.toolCallId === 'string'
			? part.toolCallId
			: typeof part.id === 'string'
				? part.id
				: undefined;
	const toolName =
		typeof part.toolName === 'string'
			? part.toolName
			: typeof part.name === 'string'
				? part.name
				: undefined;
	if (!toolCallId || !toolName) return undefined;

	return {
		id: toolCallId,
		type: 'function',
		function: {
			name: toolName,
			arguments: stringifyToolPayload(readToolCallPayload(part)),
		},
	};
}

function normalizeAssistantMessageForLangSmith(message: Record<string, unknown>): unknown {
	const content = message.content;
	if (!Array.isArray(content)) {
		return message;
	}

	const textParts: string[] = [];
	const toolCalls: Array<Record<string, unknown>> = [];

	for (const part of content) {
		if (!isRecord(part)) continue;

		if (part.type === 'text' && typeof part.text === 'string') {
			textParts.push(part.text);
			continue;
		}

		if (part.type !== 'tool-call') continue;

		const toolCall = extractAssistantToolCall(part);
		if (toolCall) toolCalls.push(toolCall);
	}

	if (toolCalls.length === 0) {
		return message;
	}

	return {
		role: 'assistant',
		content: textParts.join('\n'),
		tool_calls: toolCalls,
	};
}

function normalizeToolMessageForLangSmith(message: Record<string, unknown>): unknown[] {
	const content = message.content;
	if (!Array.isArray(content)) {
		return [message];
	}

	const normalizedMessages: unknown[] = [];
	for (const part of content) {
		if (!isRecord(part) || part.type !== 'tool-result') {
			continue;
		}

		const toolCallId =
			typeof part.toolCallId === 'string'
				? part.toolCallId
				: typeof part.id === 'string'
					? part.id
					: undefined;
		const toolName =
			typeof part.toolName === 'string'
				? part.toolName
				: typeof part.name === 'string'
					? part.name
					: undefined;
		if (!toolCallId) continue;

		normalizedMessages.push({
			role: 'tool',
			tool_call_id: toolCallId,
			...(toolName ? { name: toolName } : {}),
			content: stringifyToolPayload(readToolResultPayload(part)),
		});
	}

	return normalizedMessages.length > 0 ? normalizedMessages : [message];
}

function normalizeMessagesForLangSmith(messages: unknown[]): unknown[] {
	const normalizedMessages: unknown[] = [];

	for (const message of messages) {
		if (!isRecord(message) || typeof message.role !== 'string') {
			normalizedMessages.push(message);
			continue;
		}

		if (message.role === 'assistant') {
			normalizedMessages.push(normalizeAssistantMessageForLangSmith(message));
			continue;
		}

		if (message.role === 'tool') {
			normalizedMessages.push(...normalizeToolMessageForLangSmith(message));
			continue;
		}

		normalizedMessages.push(message);
	}

	return normalizedMessages;
}

function stableStringify(value: unknown): string {
	if (Array.isArray(value)) {
		return `[${value.map((entry) => stableStringify(entry)).join(',')}]`;
	}

	if (isRecord(value)) {
		const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
		return `{${entries
			.map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`)
			.join(',')}}`;
	}

	return JSON.stringify(value);
}

function stableHash(value: unknown): string {
	return createHash('sha256').update(stableStringify(value)).digest('hex');
}

function toolNameFromDefinition(tool: unknown): string | undefined {
	if (!isRecord(tool)) return undefined;
	if (typeof tool.name === 'string') return tool.name;
	if (typeof tool.id === 'string') return tool.id;
	if (isRecord(tool.function) && typeof tool.function.name === 'string') {
		return tool.function.name;
	}
	return undefined;
}

function enrichLangSmithToolAttributes(attributes: Record<string, unknown>): unknown[] | undefined {
	const tools = parseTelemetryTools(attributes['ai.prompt.tools']);
	if (!tools) {
		return undefined;
	}

	const redactedTools = redactTelemetryJsonValue(
		tools,
		undefined,
		0,
		MAX_PROMPT_SCHEMA_TRACE_DEPTH,
	);
	const normalizedTools: unknown[] = Array.isArray(redactedTools) ? redactedTools : tools;
	const toolNames = normalizedTools
		.map(toolNameFromDefinition)
		.filter((name): name is string => name !== undefined);
	const serializedTools = JSON.stringify(normalizedTools);
	const schemaHash = stableHash(normalizedTools);

	attributes['llm.available_tool_count'] = normalizedTools.length;
	attributes['llm.available_tool_names'] = toolNames;
	attributes['llm.tool_manifest_ref'] = schemaHash;
	attributes['llm.tool_schema_hash'] = schemaHash;
	attributes.tools = serializedTools;
	attributes['invocation_params.tools'] = serializedTools;

	const toolChoice = parseTelemetryJson(attributes['ai.prompt.toolChoice']);
	if (toolChoice !== undefined) {
		const redactedToolChoice = redactTelemetryJsonValue(
			toolChoice,
			undefined,
			0,
			MAX_PROMPT_SCHEMA_TRACE_DEPTH,
		);
		attributes['llm.tool_choice'] = JSON.stringify(redactedToolChoice);
		attributes['invocation_params.tool_choice'] = JSON.stringify(redactedToolChoice);
	}

	return normalizedTools;
}

function enrichLangSmithPromptAttribute(attributes: Record<string, unknown>): void {
	const tools = enrichLangSmithToolAttributes(attributes);

	if (attributes['gen_ai.prompt'] !== undefined) {
		return;
	}

	const messages = parseTelemetryJson(attributes['ai.prompt.messages']);
	if (!Array.isArray(messages)) {
		return;
	}

	const toolChoice = parseTelemetryJson(attributes['ai.prompt.toolChoice']);
	if (!tools && toolChoice === undefined) {
		return;
	}

	const prompt: Record<string, unknown> = { input: normalizeMessagesForLangSmith(messages) };
	if (tools) {
		prompt.tools = tools;
	}

	if (toolChoice !== undefined) {
		prompt.tool_choice = toolChoice;
	}

	attributes['gen_ai.prompt'] = JSON.stringify(
		redactTelemetryJsonValue(prompt, undefined, 0, MAX_PROMPT_SCHEMA_TRACE_DEPTH),
	);
}

function numberFromAttribute(value: unknown): number | undefined {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value;
	}
	if (typeof value === 'string' && value.trim()) {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : undefined;
	}
	return undefined;
}

function readTokenDetail(details: unknown, keys: string[]): number | undefined {
	const parsedDetails = typeof details === 'string' ? parseTelemetryJson(details) : details;
	if (!isRecord(parsedDetails)) {
		return undefined;
	}

	for (const key of keys) {
		const value = numberFromAttribute(parsedDetails[key]);
		if (value !== undefined) {
			return value;
		}
	}
	return undefined;
}

function readNestedRecord(
	record: Record<string, unknown>,
	keys: string[],
): Record<string, unknown> {
	let current: unknown = record;
	for (const key of keys) {
		if (!isRecord(current)) {
			return {};
		}
		current = current[key];
	}
	return isRecord(current) ? current : {};
}

function readProviderAnthropicUsage(attributes: Record<string, unknown>): Record<string, unknown> {
	const providerMetadata = parseTelemetryJson(attributes['ai.response.providerMetadata']);
	return isRecord(providerMetadata)
		? readNestedRecord(providerMetadata, ['anthropic', 'usage'])
		: {};
}

function firstNumberAttribute(
	attributes: Record<string, unknown>,
	keys: string[],
): number | undefined {
	for (const key of keys) {
		const value = numberFromAttribute(attributes[key]);
		if (value !== undefined) {
			return value;
		}
	}
	return undefined;
}

function calculateInputTokenAccounting(
	inputTokens: number | undefined,
	cacheReadTokens: number,
	cacheCreationTokens: number,
): { regularInputTokens: number; totalInputTokens: number } {
	const cachedInputTokens = cacheReadTokens + cacheCreationTokens;
	const observedInputTokens = inputTokens ?? 0;
	const regularInputTokens =
		observedInputTokens >= cachedInputTokens
			? Math.max(0, observedInputTokens - cachedInputTokens)
			: observedInputTokens;

	return {
		regularInputTokens,
		totalInputTokens: regularInputTokens + cachedInputTokens,
	};
}

function readCacheReadTokens(
	attributes: Record<string, unknown>,
	providerAnthropicUsage: Record<string, unknown>,
	inputDetails: unknown,
): number {
	return (
		firstNumberAttribute(attributes, [
			'ai.usage.inputTokenDetails.cacheReadTokens',
			'ai.usage.cachedInputTokens',
			'ai.usage.cacheReadInputTokens',
		]) ??
		firstNumberAttribute(providerAnthropicUsage, ['cache_read_input_tokens']) ??
		readTokenDetail(inputDetails, [
			'cache_read',
			'cache_read_tokens',
			'cache_read_input_tokens',
			'cached_tokens',
		]) ??
		0
	);
}

function readCacheCreationTokens(
	attributes: Record<string, unknown>,
	providerAnthropicUsage: Record<string, unknown>,
	inputDetails: unknown,
): number {
	return (
		firstNumberAttribute(attributes, [
			'ai.usage.inputTokenDetails.cacheCreationTokens',
			'ai.usage.cacheCreationInputTokens',
			'ai.usage.inputTokenDetails.cacheWriteTokens',
			'ai.usage.cacheWriteInputTokens',
		]) ??
		firstNumberAttribute(providerAnthropicUsage, [
			'cache_creation_input_tokens',
			'cache_write_input_tokens',
		]) ??
		readTokenDetail(inputDetails, [
			'cache_creation',
			'cache_creation_tokens',
			'cache_creation_input_tokens',
			'cache_write',
			'cache_write_tokens',
			'cache_write_input_tokens',
		]) ??
		0
	);
}

function buildLangSmithUsageMetadata(
	attributes: Record<string, unknown>,
): Record<string, unknown> | undefined {
	const inputTokens = firstNumberAttribute(attributes, [
		GEN_AI_USAGE_INPUT_TOKENS,
		'ai.usage.inputTokens',
		'ai.usage.promptTokens',
	]);

	const outputTokens =
		firstNumberAttribute(attributes, [
			GEN_AI_USAGE_OUTPUT_TOKENS,
			'ai.usage.outputTokens',
			'ai.usage.completionTokens',
		]) ?? 0;
	if (inputTokens === undefined && outputTokens === 0) {
		return;
	}

	const providerAnthropicUsage = readProviderAnthropicUsage(attributes);
	const inputDetails = attributes[GEN_AI_USAGE_INPUT_TOKEN_DETAILS];
	const cacheReadTokens = readCacheReadTokens(attributes, providerAnthropicUsage, inputDetails);
	const cacheCreationTokens = readCacheCreationTokens(
		attributes,
		providerAnthropicUsage,
		inputDetails,
	);

	const { totalInputTokens } = calculateInputTokenAccounting(
		inputTokens,
		cacheReadTokens,
		cacheCreationTokens,
	);
	const inputTokenDetails: Record<string, number> = {};
	if (cacheReadTokens > 0) {
		inputTokenDetails.cache_read = cacheReadTokens;
	}
	if (cacheCreationTokens > 0) {
		inputTokenDetails.cache_creation = cacheCreationTokens;
		inputTokenDetails.ephemeral_5m_input_tokens = cacheCreationTokens;
	}

	return {
		input_tokens: totalInputTokens,
		output_tokens: outputTokens,
		total_tokens: totalInputTokens + outputTokens,
		...(Object.keys(inputTokenDetails).length > 0
			? { input_token_details: inputTokenDetails }
			: {}),
	};
}

function applyLangSmithUsageAttributes(
	attributes: Record<string, unknown>,
	usageMetadata: Record<string, unknown>,
	tokens: {
		inputTokens: number | undefined;
		totalInputTokens: number;
		outputTokens: number;
		regularInputTokens: number;
		cacheReadTokens: number;
		cacheCreationTokens: number;
	},
): void {
	const {
		inputTokens,
		totalInputTokens,
		outputTokens,
		regularInputTokens,
		cacheReadTokens,
		cacheCreationTokens,
	} = tokens;
	attributes[GEN_AI_USAGE_INPUT_TOKENS] = totalInputTokens;
	attributes[GEN_AI_USAGE_OUTPUT_TOKENS] = outputTokens;
	attributes[GEN_AI_USAGE_TOTAL_TOKENS] = totalInputTokens + outputTokens;
	attributes['ai.usage.inputTokens'] = totalInputTokens;
	attributes[LANGSMITH_USAGE_METADATA] = JSON.stringify(usageMetadata);
	if (inputTokens !== undefined) {
		attributes['langsmith.metadata.original_input_tokens'] = inputTokens;
		attributes['langsmith.metadata.anthropic_original_input_tokens'] = inputTokens;
	}
	attributes['langsmith.metadata.total_input_tokens'] = totalInputTokens;
	attributes['langsmith.metadata.regular_input_tokens'] = regularInputTokens;
	attributes['langsmith.metadata.cache_read_input_tokens'] = cacheReadTokens;
	attributes['langsmith.metadata.cache_creation_input_tokens'] = cacheCreationTokens;
	attributes['langsmith.metadata.anthropic_total_input_tokens'] = totalInputTokens;
	attributes['langsmith.metadata.anthropic_regular_input_tokens'] = regularInputTokens;
	attributes['langsmith.metadata.anthropic_cache_read_input_tokens'] = cacheReadTokens;
	attributes['langsmith.metadata.anthropic_cache_creation_input_tokens'] = cacheCreationTokens;
	attributes[GEN_AI_USAGE_INPUT_TOKEN_DETAILS] = JSON.stringify({
		cache_read: cacheReadTokens,
		cache_creation: cacheCreationTokens,
		regular: regularInputTokens,
		...(inputTokens !== undefined ? { original_input_tokens: inputTokens } : {}),
	});
}

function normalizeUsageForLangSmith(attributes: Record<string, unknown>): void {
	const usageMetadata = buildLangSmithUsageMetadata(attributes);
	if (!usageMetadata) {
		return;
	}

	const inputTokens = firstNumberAttribute(attributes, [
		GEN_AI_USAGE_INPUT_TOKENS,
		'ai.usage.inputTokens',
		'ai.usage.promptTokens',
	]);
	const outputTokens = numberFromAttribute(usageMetadata.output_tokens) ?? 0;
	const inputTokenDetails = isRecord(usageMetadata.input_token_details)
		? usageMetadata.input_token_details
		: {};
	const cacheReadTokens = numberFromAttribute(inputTokenDetails.cache_read) ?? 0;
	const cacheCreationTokens =
		numberFromAttribute(inputTokenDetails.cache_creation) ??
		numberFromAttribute(inputTokenDetails.ephemeral_5m_input_tokens) ??
		0;
	const totalInputTokens = numberFromAttribute(usageMetadata.input_tokens) ?? 0;
	const { regularInputTokens } = calculateInputTokenAccounting(
		inputTokens,
		cacheReadTokens,
		cacheCreationTokens,
	);

	applyLangSmithUsageAttributes(attributes, usageMetadata, {
		inputTokens,
		totalInputTokens,
		outputTokens,
		regularInputTokens,
		cacheReadTokens,
		cacheCreationTokens,
	});
}

function readStringAttribute(
	attributes: Record<string, unknown>,
	keys: string[],
): string | undefined {
	for (const key of keys) {
		const value = attributes[key];
		if (typeof value === 'string' && value.length > 0) {
			return value;
		}
	}
	return undefined;
}

function inferNativeLlmRole(attributes: Record<string, unknown>): string | undefined {
	return readStringAttribute(attributes, [
		'ai.telemetry.metadata.agent_role',
		'langsmith.metadata.agent_role',
		'agent_role',
	]);
}

function displayNameForNativeLlmSpan(attributes: Record<string, unknown>): string {
	const role = inferNativeLlmRole(attributes);
	if (role === 'thread_title') {
		return 'llm: title';
	}

	if (role) {
		return `llm: ${formatAgentRoleLabel(role)}`;
	}

	const functionId = readStringAttribute(attributes, [
		'ai.telemetry.functionId',
		'resource.name',
		'operation.name',
	]);
	if (functionId) {
		return `llm: ${formatAgentRoleLabel(functionId.replace(/^instance-ai[._-]?/, ''))}`;
	}

	return 'llm';
}

function parseTelemetryObject(value: unknown): Record<string, unknown> | undefined {
	const parsed = typeof value === 'string' ? parseTelemetryJson(value) : value;
	return isRecord(parsed) ? parsed : undefined;
}

function sanitizeToolActionForDisplay(action: string): string | undefined {
	const sanitized = action
		.trim()
		.slice(0, MAX_TOOL_ACTION_DISPLAY_LENGTH)
		.replace(/[^\w.-]+/g, '_')
		.replace(/^_+|_+$/g, '');

	return sanitized.length > 0 ? sanitized : undefined;
}

function toolActionForNativeToolSpan(attributes: Record<string, unknown>): string | undefined {
	const args = parseTelemetryObject(attributes['ai.toolCall.args']);
	if (!args || typeof args.action !== 'string') {
		return undefined;
	}

	return sanitizeToolActionForDisplay(args.action);
}

function setLangSmithMetadataAttribute(
	attributes: Record<string, unknown>,
	key: string,
	value: unknown,
): void {
	attributes[key] = value;
	if (!key.startsWith('langsmith.metadata.')) {
		attributes[`langsmith.metadata.${key}`] = value;
	}
}

function renameNativeLlmSpanForLangSmith(
	span: Record<string, unknown>,
	attributes: Record<string, unknown>,
): void {
	const operationId = readStringAttribute(attributes, [AI_OPERATION_ID]);
	if (!operationId || !LLM_AI_SDK_OPERATION_IDS.has(operationId)) {
		return;
	}

	const displayName = displayNameForNativeLlmSpan(attributes);
	span.name = displayName;
	attributes[LANGSMITH_TRACE_NAME] = displayName;
	attributes[LANGSMITH_SPAN_KIND] = 'llm';
	attributes[GEN_AI_OPERATION_NAME] = 'chat';
	const displayGroup = inferNativeLlmRole(attributes);
	setLangSmithMetadataAttribute(attributes, 'display_name', displayName);
	setLangSmithMetadataAttribute(attributes, 'display_kind', 'llm');
	setLangSmithMetadataAttribute(
		attributes,
		'display_group',
		displayGroup ? formatAgentRoleLabel(displayGroup) : 'llm',
	);
	const executionMode = readStringAttribute(attributes, [
		'ai.telemetry.metadata.execution_mode',
		'langsmith.metadata.execution_mode',
		'execution_mode',
	]);
	if (executionMode) {
		setLangSmithMetadataAttribute(attributes, 'display_phase', formatTraceLabel(executionMode));
	}
	setLangSmithMetadataAttribute(attributes, 'ai_sdk.operation', operationId);
	setLangSmithMetadataAttribute(attributes, 'instance_ai.display_name', displayName);
	setLangSmithMetadataAttribute(attributes, 'instance_ai.canonical_name', operationId);
	setLangSmithMetadataAttribute(attributes, 'instance_ai.run_name', operationId);
	delete attributes[AI_OPERATION_ID];
}

function renameNativeToolSpanForLangSmith(
	span: Record<string, unknown>,
	attributes: Record<string, unknown>,
): void {
	const toolName = readStringAttribute(attributes, ['ai.toolCall.name']);
	if (!toolName) {
		return;
	}

	const operationId = readStringAttribute(attributes, [AI_OPERATION_ID]);
	if (operationId && operationId !== 'ai.toolCall') {
		return;
	}

	const action = toolActionForNativeToolSpan(attributes);
	const displayName = action ? `${toolName}[${action}]` : toolName;
	span.name = displayName;
	attributes[LANGSMITH_TRACE_NAME] = displayName;
	attributes[LANGSMITH_SPAN_KIND] = 'tool';
	attributes['ai.toolCall.display_name'] = displayName;
	if (action) {
		attributes['ai.toolCall.action'] = action;
		setLangSmithMetadataAttribute(attributes, 'display_action', action);
	}
	setLangSmithMetadataAttribute(attributes, 'display_name', displayName);
	setLangSmithMetadataAttribute(attributes, 'display_kind', 'tool');
	setLangSmithMetadataAttribute(attributes, 'display_group', toolName);
	setLangSmithMetadataAttribute(attributes, 'ai_sdk.operation', operationId ?? 'ai.toolCall');
	attributes['langsmith.metadata.ls_run_name'] = displayName;
	setLangSmithMetadataAttribute(attributes, 'instance_ai.display_name', displayName);
	setLangSmithMetadataAttribute(attributes, 'instance_ai.canonical_name', toolName);
	setLangSmithMetadataAttribute(attributes, 'instance_ai.run_name', displayName);
}

function isLangSmithLlmSpan(attributes: Record<string, unknown>): boolean {
	const operationId = readStringAttribute(attributes, [AI_OPERATION_ID]);
	return (
		attributes[LANGSMITH_SPAN_KIND] === 'llm' ||
		attributes.display_kind === 'llm' ||
		(typeof operationId === 'string' && LLM_AI_SDK_OPERATION_IDS.has(operationId))
	);
}

function isCountedUsageAttribute(key: string): boolean {
	return (
		key === LANGSMITH_USAGE_METADATA ||
		key === 'usage_metadata' ||
		key === 'prompt_tokens' ||
		key === 'completion_tokens' ||
		key === 'total_tokens' ||
		key === 'input_tokens' ||
		key === 'output_tokens' ||
		key.startsWith('gen_ai.usage.') ||
		key.startsWith('ai.usage.') ||
		key.startsWith('llm.usage.')
	);
}

function neutralUsageAttributeKey(key: string): string {
	return `instance_ai.usage.${key}`;
}

function moveNonLlmUsageAttributes(attributes: Record<string, unknown>): void {
	if (isLangSmithLlmSpan(attributes)) {
		return;
	}

	for (const key of Object.keys(attributes)) {
		if (!isCountedUsageAttribute(key)) {
			continue;
		}

		attributes[neutralUsageAttributeKey(key)] = attributes[key];
		delete attributes[key];
	}
}

export function redactLangSmithTelemetrySpan(span: unknown): unknown {
	if (!isRecord(span) || !isRecord(span.attributes)) {
		return span;
	}

	const attributes: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(span.attributes)) {
		attributes[key] = redactTelemetryAttribute(key, value);
	}
	enrichLangSmithPromptAttribute(attributes);
	normalizeUsageForLangSmith(attributes);
	renameNativeLlmSpanForLangSmith(span, attributes);
	renameNativeToolSpanForLangSmith(span, attributes);
	moveNonLlmUsageAttributes(attributes);
	span.attributes = attributes;
	return span;
}

function splitTraceText(value: string): string[] {
	if (value.length <= MAX_TRACE_STRING_LENGTH) {
		return [value];
	}

	const chunks: string[] = [];
	let remaining = value;

	while (remaining.length > MAX_TRACE_STRING_LENGTH) {
		const candidate = remaining.slice(0, MAX_TRACE_STRING_LENGTH);
		const splitIndex = candidate.lastIndexOf('\n');
		const chunkEnd =
			splitIndex >= MAX_TRACE_STRING_LENGTH / 2 ? splitIndex + 1 : MAX_TRACE_STRING_LENGTH;
		chunks.push(remaining.slice(0, chunkEnd));
		remaining = remaining.slice(chunkEnd);
	}

	if (remaining.length > 0) {
		chunks.push(remaining);
	}

	return chunks;
}

function serializeTraceText(value: string): string | Record<string, string> {
	const chunks = splitTraceText(value);
	if (chunks.length === 1) {
		return chunks[0];
	}

	return Object.fromEntries(
		chunks.map((chunk, index) => [`part_${String(index + 1).padStart(2, '0')}`, chunk]),
	);
}

function summarizeToolDescription(tool: unknown): string | undefined {
	if (!isRecord(tool)) {
		return undefined;
	}

	return typeof tool.description === 'string' ? tool.description : undefined;
}

function classifyToolSource(name: string, toolRecord: Record<string, unknown>): string {
	if (toolRecord.mcpTool === true) {
		return typeof toolRecord.mcpServerName === 'string' &&
			toolRecord.mcpServerName.toLowerCase().includes('local')
			? 'local-mcp'
			: 'mcp';
	}

	if (
		name.startsWith('workspace_') ||
		name === WORKSPACE_TOOL_IDS.WRITE_FILE ||
		name === ORCHESTRATION_TOOL_IDS.APPLY_WORKFLOW_CREDENTIALS
	) {
		return 'workspace';
	}

	if (ORCHESTRATION_TOOL_NAMES.has(name)) {
		return 'orchestration';
	}

	return 'domain';
}

function classifyToolCategory(name: string): string {
	if (name.includes('credential')) return 'credential';
	if (name.includes('browser')) return 'browser';
	if (name.includes('data-table')) return 'data-table';
	if (name.includes('workflow')) {
		return 'workflow';
	}
	if (name === DOMAIN_TOOL_IDS.NODES || name === 'materialize-node-type') return 'node';
	if (name === DOMAIN_TOOL_IDS.EXECUTIONS) return 'execution';
	if (name.includes('research')) return 'research';
	if (name.includes('plan') || name === ORCHESTRATION_TOOL_IDS.CREATE_TASKS) {
		return 'planning';
	}
	if (name.startsWith('workspace_')) return 'workspace';
	if (name.includes('file') || name.includes('filesystem')) return 'filesystem';
	return 'other';
}

function classifyToolSideEffect(name: string): string {
	if (name.includes('browser')) return 'browser';
	if (name.includes('research')) return 'network';
	if (name === DOMAIN_TOOL_IDS.EXECUTIONS || name.includes('execute') || name.includes('run')) {
		return 'execute';
	}
	if (
		name.includes('write') ||
		name.includes('submit') ||
		name.includes('apply') ||
		name.includes('build') ||
		name.includes('create') ||
		name.includes('update') ||
		name.includes('delete') ||
		name.includes('remove') ||
		name.includes('complete')
	) {
		return 'write';
	}
	if (name.includes(DOMAIN_TOOL_IDS.ASK_USER) || name.includes('pause-for-user')) return 'none';
	return 'read';
}

function getToolInputSchema(tool: unknown): unknown {
	if (!isRecord(tool)) {
		return undefined;
	}

	const inputSchema = tool.inputSchema;
	if (inputSchema === undefined) {
		return undefined;
	}

	const toJSONSchema = isRecord(inputSchema) ? inputSchema.toJSONSchema : undefined;
	if (typeof toJSONSchema === 'function' && toJSONSchema.length === 0) {
		try {
			const schema: unknown = Reflect.apply(toJSONSchema, inputSchema, []);
			return schema;
		} catch {
			return { type: 'zod', conversion: 'failed' };
		}
	}

	if (isRecord(inputSchema) && typeof inputSchema.safeParse === 'function') {
		return { type: 'zod' };
	}

	return inputSchema;
}

function summarizeToolForManifest(name: string, tool: unknown): Record<string, unknown> {
	const schema = getToolInputSchema(tool);
	const redactedSchema =
		schema === undefined
			? undefined
			: redactTelemetryJsonValue(schema, undefined, 0, MAX_PROMPT_SCHEMA_TRACE_DEPTH);
	const toolRecord = isRecord(tool) ? tool : {};
	const description = summarizeToolDescription(tool);
	const providerOptions = isRecord(toolRecord.providerOptions)
		? redactTelemetryJsonValue(toolRecord.providerOptions)
		: undefined;

	return {
		name,
		...(description ? { description } : {}),
		kind: toolRecord.mcpTool === true ? 'mcp' : 'local',
		source: classifyToolSource(name, toolRecord),
		category: classifyToolCategory(name),
		side_effect: classifyToolSideEffect(name),
		...(typeof toolRecord.mcpServerName === 'string'
			? { mcp_server_name: toolRecord.mcpServerName }
			: {}),
		approval: {
			default_approval: toolRecord.withDefaultApproval === true,
			suspend: toolRecord.suspendSchema !== undefined,
			resume: toolRecord.resumeSchema !== undefined,
		},
		...(redactedSchema !== undefined ? { input_schema: redactedSchema } : {}),
		...(providerOptions !== undefined ? { provider_options: providerOptions } : {}),
	};
}

function summarizeToolSet(
	fieldPrefix: 'loaded' | 'deferred' | 'runtime',
	tools: InstanceAiToolRegistry | undefined,
): Record<string, unknown> {
	if (!tools || tools.size === 0) {
		return {};
	}

	const toolEntries = Array.from(tools);
	const summaries = toolEntries.map(([name, tool]) => summarizeToolForManifest(name, tool));
	const manifestHash = stableHash(summaries);
	const toolNames = toolEntries.map(([name]) => name);
	if (fieldPrefix === 'loaded') {
		return {
			assigned_tool_count: summaries.length,
			assigned_tool_names: toolNames,
			assigned_tool_schema_hash: manifestHash,
		};
	}
	return {
		[`${fieldPrefix}_tool_count`]: summaries.length,
		[`${fieldPrefix}_tool_names`]: toolNames,
		[`${fieldPrefix}_tool_schema_hash`]: manifestHash,
	};
}

function summarizeMemoryBinding(memory: unknown): Record<string, unknown> {
	if (!isRecord(memory)) {
		return {};
	}

	return {
		memory_enabled: true,
		...(typeof memory.resource === 'string' ? { memory_resource_id: memory.resource } : {}),
		...(typeof memory.thread === 'string' ? { memory_thread_id: memory.thread } : {}),
	};
}

function summarizeRuntimeSkillRegistry(
	registry: RuntimeSkillRegistry | undefined,
): Record<string, unknown> {
	if (!registry || registry.skills.length === 0) {
		return {};
	}

	const categories = Array.from(
		new Set(
			registry.skills
				.map((skill) => skill.category)
				.filter((category): category is string => typeof category === 'string'),
		),
	).sort();

	return {
		runtime_skill_count: registry.skills.length,
		runtime_skill_names: registry.skills.map((skill) => skill.name),
		runtime_skill_registry_hash: registry.skillsHash,
		...(categories.length > 0 ? { runtime_skill_categories: categories } : {}),
	};
}

const NOT_SCALAR = Symbol('not-scalar');

/** Sanitize scalar/leaf values; returns NOT_SCALAR for arrays/objects the caller must recurse into. */
function sanitizeTraceScalar(value: unknown): unknown {
	if (value === null || value === undefined) return value;
	if (typeof value === 'string') return truncateString(value);
	if (typeof value === 'number' || typeof value === 'boolean') return value;
	if (typeof value === 'bigint') return value.toString();
	if (typeof value === 'function') return `[function ${value.name || 'anonymous'}]`;
	if (value instanceof Date) return value.toISOString();
	if (value instanceof Error) return { name: value.name, message: truncateString(value.message) };
	if (value instanceof Uint8Array) return `[binary ${value.byteLength} bytes]`;
	if (typeof value === 'symbol') return value.toString();
	return NOT_SCALAR;
}

export function sanitizeTraceValue(value: unknown, depth = 0): unknown {
	const scalar = sanitizeTraceScalar(value);
	if (scalar !== NOT_SCALAR) {
		return scalar;
	}

	if (Array.isArray(value)) {
		if (depth >= MAX_TRACE_DEPTH) {
			return `[array(${value.length})]`;
		}

		return value
			.slice(0, MAX_TRACE_ARRAY_ITEMS)
			.map((entry) => sanitizeTraceValue(entry, depth + 1));
	}

	if (isRecord(value)) {
		if (depth >= MAX_TRACE_DEPTH) {
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

	return truncateString(Object.prototype.toString.call(value));
}

export function sanitizeTracePayload(value: unknown): Record<string, unknown> {
	if (isRecord(value)) {
		const sanitized: Record<string, unknown> = {};
		for (const [key, entryValue] of Object.entries(value)) {
			sanitized[key] = sanitizeTraceValue(entryValue);
		}
		return sanitized;
	}

	if (value === undefined) {
		return {};
	}

	return { value: sanitizeTraceValue(value) };
}

export function serializeModelIdForTrace(modelId: unknown): unknown {
	if (typeof modelId === 'string' && modelId.length > 0) {
		return truncateString(modelId);
	}

	if (isRecord(modelId) && typeof modelId.id === 'string') {
		return truncateString(modelId.id);
	}

	return sanitizeTraceValue(modelId);
}

export function mergeTraceInputs(
	baseInputs: unknown,
	inputs: Record<string, unknown> | undefined,
): Record<string, unknown> {
	const existingInputs =
		isRecord(baseInputs) && !Array.isArray(baseInputs) ? { ...baseInputs } : {};

	return {
		...existingInputs,
		...(inputs ?? {}),
	};
}

export function buildAgentTraceInputs(options: AgentTraceInputOptions): Record<string, unknown> {
	return sanitizeTracePayload({
		...(options.systemPrompt ? { system_prompt: serializeTraceText(options.systemPrompt) } : {}),
		...(options.modelId !== undefined ? { model: serializeModelIdForTrace(options.modelId) } : {}),
		...(options.toolSearchEnabled !== undefined
			? { tool_search_enabled: options.toolSearchEnabled }
			: {}),
		...(options.inputProcessors?.length ? { input_processors: options.inputProcessors } : {}),
		...summarizeMemoryBinding(options.memory),
		...summarizeToolSet('loaded', options.tools),
		...summarizeToolSet('deferred', options.deferredTools),
		...summarizeToolSet('runtime', options.runtimeTools),
		...summarizeRuntimeSkillRegistry(options.runtimeSkills),
	});
}

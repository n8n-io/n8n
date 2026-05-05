import {
	LangSmithTelemetry,
	type AttributeValue,
	type BuiltTool,
	type InterruptibleToolContext,
	type Telemetry,
	type ToolContext,
} from '@n8n/agents';
import { Client, RunTree } from 'langsmith';
import { getCurrentRunTree, withRunTree as withLangSmithRunTree } from 'langsmith/traceable';
import { AsyncLocalStorage } from 'node:async_hooks';

import type {
	InstanceAiToolTraceOptions,
	InstanceAiTelemetryOptions,
	InstanceAiTraceContext,
	InstanceAiTraceRun,
	InstanceAiTraceRunFinishOptions,
	InstanceAiTraceRunInit,
	InstanceAiToolRegistry,
	ServiceProxyConfig,
} from '../types';
import type { IdRemapper, TraceIndex, TraceWriter } from './trace-replay';
import { PURE_REPLAY_TOOLS } from './trace-replay';
import { isRecord } from '../utils/stream-helpers';

const DEFAULT_PROJECT_NAME = 'instance-ai';
const DEFAULT_TAGS = ['instance-ai'];
const MAX_TRACE_DEPTH = 4;
const MAX_PROMPT_SCHEMA_TRACE_DEPTH = 12;
const MAX_TRACE_STRING_LENGTH = 2_000;
const MAX_TRACE_ARRAY_ITEMS = 20;
const MAX_TRACE_OBJECT_KEYS = 30;
const SENSITIVE_TELEMETRY_KEY_PATTERN =
	/(api[_-]?key|authorization|bearer|cookie|credentials?|password|secret|access[_-]?token|refresh[_-]?token|id[_-]?token|session[_-]?token|auth[_-]?token|(?:^|[._-])token$)/i;
const LOCAL_TOOL_TRACE_NAMES = new Set([
	'ask-user',
	'pause-for-user',
	'workspace',
	'write-file',
	'build-workflow',
	'submit-workflow',
	'apply-workflow-credentials',
	'verify-built-workflow',
	'report-verification-verdict',
	'task-control',
	'complete-checkpoint',
]);
const traceParentOverrideStorage = new AsyncLocalStorage<{ current: RunTree | null }>();

// Per-request proxy auth headers, isolated via AsyncLocalStorage.
// The proxy Client is cached per deployment URL; each concurrent request
// wraps its agent execution in proxyHeaderStore.run(headers, fn) so
// the shared Client's custom fetch reads the correct per-request
// Authorization header without any shared mutable state.
const proxyHeaderStore = new AsyncLocalStorage<Record<string, string>>();

// Module-level map associating traceIds with proxy clients so that
// hydrateRunTree() (which reconstructs RunTree from serialized state)
// can use the correct proxy client for its HTTP calls.
const traceClients = new Map<string, Client>();

/**
 * Fetch wrapper for LangSmith clients:
 * - Forces gzip encoding to avoid brotli decompressors (8.6 MB native memory each).
 * - Treats 409 Conflict as success — LangSmith returns 409 "payloads already received"
 *   when a patchRun retry arrives after the first attempt already landed. The data is
 *   persisted; the SDK's internal catch(console.error) is just noise.
 */
const gzipFetch: typeof globalThis.fetch = async (input, init) => {
	const headers = new Headers(init?.headers);
	if (!headers.has('Accept-Encoding')) {
		headers.set('Accept-Encoding', 'gzip, deflate');
	}
	const response = await globalThis.fetch(input, { ...init, headers });
	if (response.status === 409) {
		return new Response(null, { status: 200, statusText: 'OK (409 suppressed)' });
	}
	return response;
};

let cachedProxyClient: { client: Client; apiUrl: string } | null = null;
let cachedDirectClient: Client | null = null;

/** Get a LangSmith Client that uses gzip encoding (no brotli). */
function getOrCreateDirectClient(): Client {
	if (cachedDirectClient) return cachedDirectClient;
	cachedDirectClient = new Client({
		autoBatchTracing: false,
		fetchImplementation: gzipFetch,
	});
	return cachedDirectClient;
}

function getOrCreateProxyClient(proxyConfig: ServiceProxyConfig): Client {
	if (cachedProxyClient?.apiUrl === proxyConfig.apiUrl) return cachedProxyClient.client;

	const proxyFetch: typeof globalThis.fetch = async (input, init) => {
		const merged = new Headers(init?.headers);
		const contextHeaders = proxyHeaderStore.getStore();
		if (contextHeaders) {
			for (const [key, value] of Object.entries(contextHeaders)) {
				merged.set(key, value);
			}
		}
		return await gzipFetch(input, { ...init, headers: merged });
	};

	const client = new Client({
		apiUrl: proxyConfig.apiUrl,
		apiKey: '-', // proxy manages auth
		autoBatchTracing: false,
		fetchImplementation: proxyFetch,
	});
	cachedProxyClient = { client, apiUrl: proxyConfig.apiUrl };
	return client;
}

interface CreateInstanceAiTraceContextOptions {
	projectName?: string;
	threadId: string;
	conversationId?: string;
	messageGroupId?: string;
	messageId: string;
	runId: string;
	userId: string;
	modelId?: unknown;
	input: unknown;
	metadata?: Record<string, unknown>;
	/** When set, traces are routed through the AI service proxy instead of directly to LangSmith. */
	proxyConfig?: ServiceProxyConfig;
}

interface CreateDetachedSubAgentTraceContextOptions extends CreateInstanceAiTraceContextOptions {
	agentId: string;
	role: string;
	kind: string;
	taskId?: string;
	plannedTaskId?: string;
	workItemId?: string;
	spawnedByTraceId?: string;
	spawnedByRunId?: string;
	spawnedByAgentId?: string;
}

interface CurrentTraceSpanOptions<T = unknown> {
	name: string;
	runType?: string;
	tags?: string[];
	metadata?: Record<string, unknown>;
	inputs?: unknown;
	processOutputs?: (result: T) => unknown;
}

interface AgentTraceInputOptions {
	systemPrompt?: string;
	tools?: InstanceAiToolRegistry;
	deferredTools?: InstanceAiToolRegistry;
	modelId?: unknown;
	memory?: unknown;
	toolSearchEnabled?: boolean;
	inputProcessors?: string[];
}

type NativeToolContext = ToolContext | InterruptibleToolContext;
type TraceableNativeTool = BuiltTool & { handler: NonNullable<BuiltTool['handler']> };

interface NormalizedModelMetadata {
	provider?: string;
	modelName?: string;
}

function isLangSmithTracingEnabled(proxyAvailable?: boolean): boolean {
	const tracingFlag =
		process.env.LANGCHAIN_TRACING_V2 ?? process.env.LANGSMITH_TRACING ?? undefined;
	if (tracingFlag?.toLowerCase() === 'false') {
		return false;
	}

	if (proxyAvailable) {
		return true;
	}

	return Boolean(
		process.env.LANGSMITH_API_KEY ??
			process.env.LANGCHAIN_API_KEY ??
			process.env.LANGSMITH_ENDPOINT ??
			process.env.LANGCHAIN_ENDPOINT ??
			tracingFlag?.toLowerCase() === 'true',
	);
}

function ensureLangSmithTracingEnv(): void {
	process.env.LANGCHAIN_TRACING_V2 ??= 'true';
	process.env.LANGSMITH_TRACING ??= 'true';
}

function normalizeErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

function normalizeTags(...tagGroups: Array<string[] | undefined>): string[] | undefined {
	const merged = tagGroups.flatMap((group) => group ?? []).filter(Boolean);
	if (merged.length === 0) return undefined;
	return [...new Set(merged)];
}

function mergeMetadata(
	...records: Array<Record<string, unknown> | undefined>
): Record<string, unknown> | undefined {
	const merged: Record<string, unknown> = {};
	for (const record of records) {
		if (!record) continue;
		for (const [key, value] of Object.entries(record)) {
			if (value !== undefined) {
				merged[key] =
					key === 'model_id' ? serializeModelIdForTrace(value) : sanitizeTraceValue(value);
			}
		}
	}
	return Object.keys(merged).length > 0 ? merged : undefined;
}

function truncateString(value: string): string {
	if (value.length <= MAX_TRACE_STRING_LENGTH) {
		return value;
	}

	return `${value.slice(0, MAX_TRACE_STRING_LENGTH)}...`;
}

function toTelemetryAttributeValue(value: unknown): AttributeValue | undefined {
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

function toTelemetryMetadata(
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

function formatTelemetryFunctionId(agentRole: string): string {
	if (agentRole.startsWith('instance-ai.')) {
		return agentRole;
	}

	return `instance-ai.${agentRole.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '')}`;
}

function redactSecretString(value: string): string {
	return value
		.replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/g, 'Bearer [redacted]')
		.replace(/(api[_-]?key|authorization|password|secret|token)=([^&\s]+)/gi, '$1=[redacted]');
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
		return redactSecretString(value);
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

function redactTelemetryAttribute(key: string, value: unknown): unknown {
	if (SENSITIVE_TELEMETRY_KEY_PATTERN.test(key)) {
		return '[redacted]';
	}

	if (typeof value !== 'string') {
		return redactTelemetryJsonValue(value, key);
	}

	const trimmed = value.trim();
	if (
		(trimmed.startsWith('{') && trimmed.endsWith('}')) ||
		(trimmed.startsWith('[') && trimmed.endsWith(']'))
	) {
		try {
			const parsed: unknown = JSON.parse(trimmed);
			return JSON.stringify(redactTelemetryJsonValue(parsed, key));
		} catch {
			return redactSecretString(value);
		}
	}

	return redactSecretString(value);
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

function enrichLangSmithPromptAttribute(attributes: Record<string, unknown>): void {
	if (attributes['gen_ai.prompt'] !== undefined) {
		return;
	}

	const messages = parseTelemetryJson(attributes['ai.prompt.messages']);
	if (!Array.isArray(messages)) {
		return;
	}

	const tools = parseTelemetryTools(attributes['ai.prompt.tools']);
	const toolChoice = parseTelemetryJson(attributes['ai.prompt.toolChoice']);
	if (!tools && toolChoice === undefined) {
		return;
	}

	const prompt: Record<string, unknown> = { input: messages };
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

export function redactLangSmithTelemetrySpan(span: unknown): unknown {
	if (!isRecord(span) || !isRecord(span.attributes)) {
		return span;
	}

	const attributes: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(span.attributes)) {
		attributes[key] = redactTelemetryAttribute(key, value);
	}
	enrichLangSmithPromptAttribute(attributes);
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

function summarizeToolSet(
	fieldPrefix: 'loaded' | 'deferred',
	tools: InstanceAiToolRegistry | undefined,
): Record<string, unknown> {
	if (!tools || Object.keys(tools).length === 0) {
		return {};
	}

	const summaries = Object.entries(tools).map(([name, tool]) => ({
		name,
		...(summarizeToolDescription(tool) ? { description: summarizeToolDescription(tool) } : {}),
	}));
	const catalogText = summaries
		.map((tool) =>
			typeof tool.description === 'string' ? `${tool.name}: ${tool.description}` : tool.name,
		)
		.join('\n');

	return {
		[`${fieldPrefix}_tool_count`]: summaries.length,
		[`${fieldPrefix}_tools`]: summaries,
		[`${fieldPrefix}_tool_catalog`]: serializeTraceText(catalogText),
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

function sanitizeTraceValue(value: unknown, depth = 0): unknown {
	if (value === null || value === undefined) {
		return value;
	}

	if (typeof value === 'string') {
		return truncateString(value);
	}

	if (typeof value === 'number' || typeof value === 'boolean') {
		return value;
	}

	if (typeof value === 'bigint') {
		return value.toString();
	}

	if (typeof value === 'function') {
		return `[function ${value.name || 'anonymous'}]`;
	}

	if (value instanceof Date) {
		return value.toISOString();
	}

	if (value instanceof Error) {
		return {
			name: value.name,
			message: truncateString(value.message),
		};
	}

	if (value instanceof Uint8Array) {
		return `[binary ${value.byteLength} bytes]`;
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

	if (typeof value === 'symbol') {
		return value.toString();
	}

	return truncateString(Object.prototype.toString.call(value));
}

function sanitizeTracePayload(value: unknown): Record<string, unknown> {
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

export function serializeModelIdForTrace(modelId: unknown): unknown {
	if (typeof modelId === 'string' && modelId.length > 0) {
		return truncateString(modelId);
	}

	if (isRecord(modelId) && typeof modelId.id === 'string') {
		return truncateString(modelId.id);
	}

	return sanitizeTraceValue(modelId);
}

function mergeRunTreeMetadata(
	baseMetadata: Record<string, unknown> | undefined,
	metadata: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
	return mergeMetadata(baseMetadata, metadata);
}

function mergeRunTreeInputs(
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

/**
 * Unconditionally remove the cached LangSmith Client for a trace.
 * Call after run finalization (success or failure) so the Client and
 * its RunTree hierarchy can be garbage-collected.
 */
export function releaseTraceClient(traceId: string): void {
	traceClients.delete(traceId);
}

export interface SubmitLangsmithUserFeedbackOptions {
	langsmithRunId: string;
	langsmithTraceId: string;
	key: string;
	score?: number;
	value?: string | number | boolean;
	comment?: string;
	feedbackId?: string;
	sourceInfo?: Record<string, unknown>;
	proxyConfig?: ServiceProxyConfig;
}

/**
 * Submit a feedback record against a LangSmith run. Returns `false` if LangSmith
 * tracing is disabled (no client available); otherwise returns `true` on success.
 * Callers are responsible for deciding what to do with network errors — this
 * helper surfaces them so the caller can log without branching on client setup.
 */
export async function submitLangsmithUserFeedback(
	options: SubmitLangsmithUserFeedbackOptions,
): Promise<boolean> {
	if (!isLangSmithTracingEnabled(!!options.proxyConfig)) {
		return false;
	}

	const client = options.proxyConfig
		? getOrCreateProxyClient(options.proxyConfig)
		: getOrCreateDirectClient();

	const call = async () => {
		await client.createFeedback(options.langsmithRunId, options.key, {
			score: options.score,
			value: options.value,
			comment: options.comment,
			feedbackId: options.feedbackId,
			sourceInfo: options.sourceInfo,
			feedbackSourceType: 'api',
		});
	};

	if (options.proxyConfig) {
		const headers = await options.proxyConfig.getAuthHeaders();
		await proxyHeaderStore.run(headers, call);
	} else {
		await call();
	}
	return true;
}

export function getTraceParentRun(): RunTree | undefined {
	const overrideRun = traceParentOverrideStorage.getStore()?.current;
	if (overrideRun) {
		return overrideRun;
	}

	try {
		return getCurrentRunTree() ?? undefined;
	} catch {
		return undefined;
	}
}

export function setTraceParentOverride(parentRun: RunTree | null | undefined): void {
	const store = traceParentOverrideStorage.getStore();
	if (store) {
		store.current = parentRun ?? null;
	} else if (parentRun) {
		// No ALS context yet — bootstrap one for the current async chain.
		// Safe: each withTraceParentContext call creates its own nested context,
		// so this only affects code that skips our context setup (e.g. tests).
		traceParentOverrideStorage.enterWith({ current: parentRun });
	}
}

export function mergeCurrentTraceMetadata(metadata: Record<string, unknown>): void {
	const currentRun = getTraceParentRun();
	if (!currentRun) {
		return;
	}

	const mergedMetadata = mergeRunTreeMetadata(currentRun.metadata, metadata);
	if (mergedMetadata) {
		currentRun.metadata = mergedMetadata;
	}
}

export function mergeTraceRunInputs(
	run: InstanceAiTraceRun | undefined,
	inputs: Record<string, unknown>,
): void {
	if (!run) {
		return;
	}

	const mergedInputs = sanitizeTracePayload(mergeRunTreeInputs(run.inputs, inputs));
	run.inputs = mergedInputs;

	const currentRun = getTraceParentRun();
	if (currentRun?.id === run.id) {
		currentRun.inputs = mergedInputs;
	}
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
	});
}

export async function withTraceParentContext<T>(
	parentRun: RunTree | undefined,
	fn: () => Promise<T>,
): Promise<T> {
	// Always create a new nested ALS context. Mutating an existing store.current
	// is not safe when concurrent background tasks inherit the same parent context.
	return await traceParentOverrideStorage.run({ current: parentRun ?? null }, fn);
}

async function postChildRun(
	parentRun: RunTree,
	options: InstanceAiTraceRunInit & { tags?: string[] },
): Promise<RunTree> {
	const childRun = parentRun.createChild({
		name: options.name,
		run_type: options.runType ?? 'chain',
		tags: normalizeTags(DEFAULT_TAGS, parentRun.tags, options.tags),
		metadata: mergeRunTreeMetadata(parentRun.metadata, options.metadata),
		inputs: sanitizeTracePayload(options.inputs),
	});
	childRun.parent_run_id ??= parentRun.id;
	await childRun.postRun();
	return childRun;
}

async function finishRunTree(
	runTree: RunTree,
	options?: InstanceAiTraceRunFinishOptions,
): Promise<void> {
	await runTree.end(
		options?.outputs !== undefined ? sanitizeTracePayload(options.outputs) : undefined,
		options?.error,
		Date.now(),
		mergeMetadata(options?.metadata),
	);
	await runTree.patchRun();
}

export async function withCurrentTraceSpan<T>(
	options: CurrentTraceSpanOptions<T>,
	fn: () => Promise<T>,
): Promise<T> {
	const parentRun = getTraceParentRun();
	if (!parentRun) {
		return await fn();
	}

	const spanRun = await postChildRun(parentRun, {
		name: options.name,
		runType: options.runType ?? 'chain',
		tags: options.tags,
		metadata: options.metadata,
		inputs: options.inputs,
	});

	try {
		const result = await withLangSmithRunTree(spanRun, fn);
		await finishRunTree(spanRun, {
			...(options.processOutputs ? { outputs: options.processOutputs(result) } : {}),
			metadata: { final_status: 'completed' },
		});
		return result;
	} catch (error) {
		await finishRunTree(spanRun, {
			error: normalizeErrorMessage(error),
			metadata: { final_status: 'error' },
		});
		throw error;
	}
}

async function startHitlChildRun(
	parentRun: RunTree,
	name: string,
	inputs: unknown,
	metadata?: Record<string, unknown>,
): Promise<void> {
	const hitlRun = await postChildRun(parentRun, {
		name,
		runType: 'chain',
		tags: ['hitl'],
		metadata,
		inputs,
	});
	await finishRunTree(hitlRun, {
		outputs: inputs,
		metadata: { final_status: 'completed' },
	});
}

function buildSuspendMetadata(
	toolName: string,
	suspendPayload: unknown,
): Record<string, unknown> | undefined {
	if (!isRecord(suspendPayload)) {
		return { tool_name: toolName };
	}

	return {
		tool_name: toolName,
		...(typeof suspendPayload.requestId === 'string'
			? { request_id: suspendPayload.requestId }
			: {}),
		...(typeof suspendPayload.inputType === 'string'
			? { input_type: suspendPayload.inputType }
			: {}),
		...(typeof suspendPayload.severity === 'string' ? { severity: suspendPayload.severity } : {}),
	};
}

function isInterruptibleToolContext(
	context: NativeToolContext,
): context is InterruptibleToolContext {
	return isRecord(context) && typeof context.suspend === 'function';
}

async function traceSuspendableToolExecute(
	tool: TraceableNativeTool,
	options: InstanceAiToolTraceOptions | undefined,
	input: unknown,
	context: NativeToolContext,
): Promise<unknown> {
	const parentRun = getTraceParentRun();
	if (!parentRun) {
		return await tool.handler(input, context);
	}

	const resumeData = isInterruptibleToolContext(context) ? context.resumeData : undefined;
	const toolRun = await postChildRun(parentRun, {
		name:
			resumeData !== undefined && resumeData !== null
				? `tool:${tool.name}:resume`
				: `tool:${tool.name}`,
		runType: 'tool',
		tags: normalizeTags(['tool'], options?.tags),
		metadata: mergeMetadata(options?.metadata, {
			tool_name: tool.name,
			...(options?.agentRole ? { agent_role: options.agentRole } : {}),
			phase: resumeData !== undefined && resumeData !== null ? 'resume' : 'initial',
			...(resumeData !== undefined && resumeData !== null
				? mergeMetadata(buildSuspendMetadata(tool.name, resumeData), {
						approved: isRecord(resumeData) ? resumeData.approved : undefined,
					})
				: {}),
		}),
		inputs: { input },
	});

	let toolRunFinished = false;
	const finishToolRun = async (finishOptions?: InstanceAiTraceRunFinishOptions) => {
		if (toolRunFinished) return;
		toolRunFinished = true;
		await finishRunTree(toolRun, finishOptions);
	};

	const originalSuspend = isInterruptibleToolContext(context) ? context.suspend : undefined;
	const wrappedContext: NativeToolContext =
		typeof originalSuspend === 'function'
			? {
					...context,
					suspend: async (suspendPayload: unknown) => {
						await startHitlChildRun(
							toolRun,
							'hitl:suspend',
							suspendPayload,
							buildSuspendMetadata(tool.name, suspendPayload),
						);
						await finishToolRun({
							outputs: {
								status: 'suspended',
								suspendPayload,
							},
							metadata: mergeMetadata(buildSuspendMetadata(tool.name, suspendPayload), {
								final_status: 'suspended',
							}),
						});
						return await originalSuspend(suspendPayload);
					},
				}
			: context;

	try {
		const result = await withLangSmithRunTree(toolRun, async () => {
			return await tool.handler(input, wrappedContext);
		});
		await finishToolRun({
			outputs: result,
			metadata: { final_status: 'completed' },
		});
		return result;
	} catch (error) {
		await finishToolRun({
			error: normalizeErrorMessage(error),
			metadata: { final_status: 'error' },
		});
		throw error;
	}
}

async function traceToolExecute(
	tool: TraceableNativeTool,
	options: InstanceAiToolTraceOptions | undefined,
	input: unknown,
	context: NativeToolContext,
): Promise<unknown> {
	const parentRun = getTraceParentRun();
	if (!parentRun) {
		return await tool.handler(input, context);
	}

	const toolRun = await postChildRun(parentRun, {
		name: `tool:${tool.name}`,
		runType: 'tool',
		tags: normalizeTags(['tool'], options?.tags),
		metadata: mergeMetadata(options?.metadata, {
			tool_name: tool.name,
			...(options?.agentRole ? { agent_role: options.agentRole } : {}),
			...normalizeModelMetadata(options?.metadata?.model_id),
		}),
		inputs: { input },
	});

	try {
		const result = await withLangSmithRunTree(
			toolRun,
			async () => await tool.handler(input, context),
		);
		await finishRunTree(toolRun, {
			outputs: result,
			metadata: { final_status: 'completed' },
		});
		return result;
	} catch (error) {
		await finishRunTree(toolRun, {
			error: normalizeErrorMessage(error),
			metadata: { final_status: 'error' },
		});
		throw error;
	}
}

function createTraceContext(
	projectName: string,
	traceKind: InstanceAiTraceContext['traceKind'],
	rootRun: InstanceAiTraceRun,
	actorRun: InstanceAiTraceRun,
	getProxyHeaders?: () => Promise<Record<string, string>>,
	telemetryFactory?: (options: InstanceAiTelemetryOptions) => Telemetry,
): InstanceAiTraceContext {
	const withProxy = async <T>(fn: () => Promise<T>): Promise<T> => {
		if (!getProxyHeaders) return await fn();
		const headers = await getProxyHeaders();
		return await proxyHeaderStore.run(headers, fn);
	};

	const startChildRun = async (
		parentRun: InstanceAiTraceRun,
		init: InstanceAiTraceRunInit,
	): Promise<InstanceAiTraceRun> =>
		await withProxy(async () => await createChildRun(parentRun, init));

	const withRunTree = async <T>(run: InstanceAiTraceRun, fn: () => Promise<T>): Promise<T> =>
		await withProxy(async () => await withSerializedRunTree(run, fn));

	const finishRun = async (
		run: InstanceAiTraceRun,
		finishOptions?: InstanceAiTraceRunFinishOptions,
	): Promise<void> => {
		await withProxy(async () => await finishTraceRun(run, finishOptions));
		// Clean up traceClients when root run finishes
		if (!run.parentRunId) {
			traceClients.delete(run.traceId);
		}
	};

	const failRun = async (
		run: InstanceAiTraceRun,
		error: unknown,
		metadata?: Record<string, unknown>,
	): Promise<void> => {
		await withProxy(
			async () =>
				await finishTraceRun(run, {
					error: normalizeErrorMessage(error),
					metadata,
				}),
		);
		if (!run.parentRunId) {
			traceClients.delete(run.traceId);
		}
	};

	const ctx: InstanceAiTraceContext = {
		projectName,
		traceKind,
		rootRun,
		actorRun,
		messageRun: rootRun,
		orchestratorRun: actorRun,
		startChildRun,
		withRunTree,
		finishRun,
		failRun,
		toHeaders: (run) => hydrateRunTree(run).toHeaders(),
		...(telemetryFactory ? { getTelemetry: telemetryFactory } : {}),
		wrapTools: (tools, traceOptions) => {
			if (ctx.replayMode === 'replay' && ctx.traceIndex && ctx.idRemapper) {
				return replayWrapTools(tools, ctx.traceIndex, ctx.idRemapper, traceOptions);
			}
			if (ctx.replayMode === 'record' && ctx.traceWriter) {
				return recordWrapTools(tools, ctx.traceWriter, traceOptions);
			}
			return wrapTools(tools, traceOptions);
		},
		replayMode: 'off',
	};

	return ctx;
}

function createRunStateFromTree(tree: RunTree): InstanceAiTraceRun {
	const parentRunId = tree.parent_run?.id ?? tree.parent_run_id;

	return {
		id: tree.id,
		name: tree.name,
		runType: tree.run_type,
		projectName: tree.project_name,
		startTime: tree.start_time,
		...(tree.end_time ? { endTime: tree.end_time } : {}),
		traceId: tree.trace_id,
		dottedOrder: tree.dotted_order,
		executionOrder: tree.execution_order,
		childExecutionOrder: tree.child_execution_order,
		...(parentRunId ? { parentRunId } : {}),
		...(tree.tags ? { tags: [...tree.tags] } : {}),
		...(tree.metadata ? { metadata: { ...tree.metadata } } : {}),
		...(tree.inputs ? { inputs: sanitizeTracePayload(tree.inputs) } : {}),
		...(tree.outputs ? { outputs: sanitizeTracePayload(tree.outputs) } : {}),
		...(tree.error ? { error: tree.error } : {}),
	};
}

function syncRunState(state: InstanceAiTraceRun, tree: RunTree): void {
	Object.assign(state, createRunStateFromTree(tree));
}

function hydrateRunTree(state: InstanceAiTraceRun): RunTree {
	const client = traceClients.get(state.traceId);
	return new RunTree({
		id: state.id,
		name: state.name,
		run_type: state.runType,
		project_name: state.projectName,
		start_time: state.startTime,
		end_time: state.endTime,
		parent_run_id: state.parentRunId,
		execution_order: state.executionOrder,
		child_execution_order: state.childExecutionOrder,
		trace_id: state.traceId,
		dotted_order: state.dottedOrder,
		tags: state.tags,
		metadata: state.metadata,
		inputs: state.inputs,
		outputs: state.outputs,
		error: state.error,
		serialized: {},
		client: client ?? getOrCreateDirectClient(),
	});
}

function isTraceableNativeTool(value: unknown): value is TraceableNativeTool {
	return (
		isRecord(value) &&
		typeof value.name === 'string' &&
		typeof value.description === 'string' &&
		typeof value.handler === 'function'
	);
}

function wrapToolHandler(
	tool: TraceableNativeTool,
	options: InstanceAiToolTraceOptions | undefined,
): TraceableNativeTool {
	if (tool.suspendSchema !== undefined || tool.resumeSchema !== undefined) {
		return {
			...tool,
			handler: async (input, context) =>
				await traceSuspendableToolExecute(tool, options, input, context),
		};
	}

	return {
		...tool,
		handler: async (input, context) => await traceToolExecute(tool, options, input, context),
	};
}

function shouldTraceLocalToolExecution(tool: TraceableNativeTool): boolean {
	return (
		tool.suspendSchema !== undefined ||
		tool.resumeSchema !== undefined ||
		LOCAL_TOOL_TRACE_NAMES.has(tool.name) ||
		tool.name.startsWith('workspace_')
	);
}

function wrapTools(
	tools: InstanceAiToolRegistry,
	options?: InstanceAiToolTraceOptions,
): InstanceAiToolRegistry {
	const wrapped: InstanceAiToolRegistry = {};
	const entries: Array<[string, unknown]> = Object.entries(tools);

	for (const [name, tool] of entries) {
		const originalTool = tools[name];
		wrapped[name] =
			isTraceableNativeTool(tool) && shouldTraceLocalToolExecution(tool)
				? wrapToolHandler(tool, options)
				: originalTool;
	}

	return wrapped;
}

// ── Replay wrappers ─────────────────────────────────────────────────────────

/**
 * Tier 1: Real execution + ID remapping.
 * Executes the tool for real with remapped input, then learns new ID mappings
 * by comparing the recorded output against the actual output.
 */
function replayWrapTool(
	tool: TraceableNativeTool,
	traceIndex: TraceIndex,
	idRemapper: IdRemapper,
	agentRole: string,
): TraceableNativeTool {
	return {
		...tool,
		handler: async (input, context) => {
			const event = traceIndex.nextMatching(agentRole, tool.name);
			const remappedInput: unknown = idRemapper.remapInput(input);
			const realOutput = await tool.handler(remappedInput, context);
			if (event) {
				idRemapper.learn(event.output, realOutput as Record<string, unknown>);
			}
			return realOutput;
		},
	};
}

/**
 * Tier 2: Pure replay — for tools that need external services (web, MCP).
 * Returns the recorded output (with IDs remapped to current-run values).
 */
function pureReplayWrapTool(
	tool: TraceableNativeTool,
	traceIndex: TraceIndex,
	idRemapper: IdRemapper,
	agentRole: string,
): TraceableNativeTool {
	return {
		...tool,
		handler: async (_input, _context) => {
			const event = traceIndex.nextMatching(agentRole, tool.name);
			if (!event) {
				throw new Error(
					`No recorded output for pure-replay tool "${tool.name}" in role "${agentRole}"`,
				);
			}
			return await Promise.resolve(idRemapper.remapOutput(event.output));
		},
	};
}

function replayWrapTools(
	tools: InstanceAiToolRegistry,
	traceIndex: TraceIndex,
	idRemapper: IdRemapper,
	options?: InstanceAiToolTraceOptions,
): InstanceAiToolRegistry {
	const agentRole = options?.agentRole ?? 'orchestrator';
	const wrapped: InstanceAiToolRegistry = {};
	const entries: Array<[string, unknown]> = Object.entries(tools);

	for (const [name, tool] of entries) {
		if (!isTraceableNativeTool(tool)) {
			wrapped[name] = tools[name];
			continue;
		}

		if (PURE_REPLAY_TOOLS.has(tool.name)) {
			wrapped[name] = pureReplayWrapTool(tool, traceIndex, idRemapper, agentRole);
		} else {
			wrapped[name] = replayWrapTool(tool, traceIndex, idRemapper, agentRole);
		}
	}

	return wrapped;
}

// ── Recording wrappers ──────────────────────────────────────────────────────

/**
 * Wraps a tool to record its I/O to a TraceWriter. Replay records stable
 * Instance AI events and intentionally does not depend on LangSmith run shape.
 */
function recordWrapTool(
	tool: TraceableNativeTool,
	traceWriter: TraceWriter,
	agentRole: string,
): TraceableNativeTool {
	return {
		...tool,
		handler: async (input, context) => {
			const resumeData = isInterruptibleToolContext(context) ? context.resumeData : undefined;
			const inputRecord = (input ?? {}) as Record<string, unknown>;

			const result = await tool.handler(input, context);
			const outputRecord = (result ?? {}) as Record<string, unknown>;

			if (resumeData !== undefined && resumeData !== null) {
				traceWriter.recordToolResume(
					agentRole,
					tool.name,
					inputRecord,
					outputRecord,
					resumeData as Record<string, unknown>,
				);
			} else if (isInterruptibleToolContext(context) && outputRecord.denied === true) {
				// Tool returned {denied: true} — it suspended
				traceWriter.recordToolSuspend(
					agentRole,
					tool.name,
					inputRecord,
					outputRecord,
					{}, // suspendPayload is internal to the tool
				);
			} else {
				traceWriter.recordToolCall(agentRole, tool.name, inputRecord, outputRecord);
			}

			return result;
		},
	};
}

function recordWrapTools(
	tools: InstanceAiToolRegistry,
	traceWriter: TraceWriter,
	options?: InstanceAiToolTraceOptions,
): InstanceAiToolRegistry {
	const agentRole = options?.agentRole ?? 'orchestrator';
	const wrapped: InstanceAiToolRegistry = {};
	const entries: Array<[string, unknown]> = Object.entries(tools);

	for (const [name, tool] of entries) {
		if (!isTraceableNativeTool(tool)) {
			wrapped[name] = tools[name];
			continue;
		}
		wrapped[name] = recordWrapTool(tool, traceWriter, agentRole);
	}

	return wrapped;
}

/**
 * Creates a minimal InstanceAiTraceContext that only supports trace replay/record
 * wrapping — no LangSmith integration. Used when E2E_TESTS is
 * set but LangSmith isn't configured.
 */
export function createTraceReplayOnlyContext(): InstanceAiTraceContext {
	const stubRun: InstanceAiTraceRun = {
		id: 'stub',
		name: 'stub',
		runType: 'chain',
		projectName: '',
		startTime: Date.now(),
		traceId: 'stub',
		dottedOrder: '',
		executionOrder: 0,
		childExecutionOrder: 0,
	};

	const ctx: InstanceAiTraceContext = {
		projectName: '',
		traceKind: 'message_turn',
		rootRun: stubRun,
		actorRun: stubRun,
		messageRun: stubRun,
		orchestratorRun: stubRun,
		startChildRun: async () => await Promise.resolve(stubRun),
		withRunTree: async (_run, fn) => await fn(),
		finishRun: async () => {},
		failRun: async () => {},
		toHeaders: () => ({}),
		wrapTools: (tools, traceOptions) => {
			if (ctx.replayMode === 'replay' && ctx.traceIndex && ctx.idRemapper) {
				return replayWrapTools(tools, ctx.traceIndex, ctx.idRemapper, traceOptions);
			}
			if (ctx.replayMode === 'record' && ctx.traceWriter) {
				return recordWrapTools(tools, ctx.traceWriter, traceOptions);
			}
			return tools;
		},
		replayMode: 'off',
	};

	return ctx;
}

async function createRun(options: {
	projectName: string;
	name: string;
	runType?: string;
	tags?: string[];
	metadata?: Record<string, unknown>;
	inputs?: unknown;
	client?: Client;
}): Promise<InstanceAiTraceRun> {
	const runTree = new RunTree({
		name: options.name,
		run_type: options.runType ?? 'chain',
		project_name: options.projectName,
		tags: normalizeTags(DEFAULT_TAGS, options.tags),
		metadata: mergeMetadata(options.metadata),
		inputs: sanitizeTracePayload(options.inputs),
		client: options.client ?? getOrCreateDirectClient(),
	});
	await runTree.postRun();

	if (options.client) {
		traceClients.set(runTree.trace_id, options.client);
	}

	return createRunStateFromTree(runTree);
}

async function createChildRun(
	parentState: InstanceAiTraceRun,
	options: InstanceAiTraceRunInit,
): Promise<InstanceAiTraceRun> {
	const parentRun = hydrateRunTree(parentState);
	const childRun = parentRun.createChild({
		name: options.name,
		run_type: options.runType ?? 'chain',
		tags: normalizeTags(DEFAULT_TAGS, parentState.tags, options.tags),
		metadata: mergeMetadata(parentRun.metadata, options.metadata),
		inputs: sanitizeTracePayload(options.inputs),
	});
	syncRunState(parentState, parentRun);
	await childRun.postRun();
	return createRunStateFromTree(childRun);
}

async function finishTraceRun(
	runState: InstanceAiTraceRun,
	options?: InstanceAiTraceRunFinishOptions,
): Promise<void> {
	const runTree = hydrateRunTree(runState);
	await runTree.end(
		options?.outputs !== undefined ? sanitizeTracePayload(options.outputs) : undefined,
		options?.error,
		Date.now(),
		mergeMetadata(options?.metadata),
	);
	await runTree.patchRun();
	syncRunState(runState, runTree);
}

async function withSerializedRunTree<T>(
	runState: InstanceAiTraceRun,
	fn: () => Promise<T>,
): Promise<T> {
	const runTree = hydrateRunTree(runState);
	try {
		return await withTraceParentContext(
			runTree,
			async () => await withLangSmithRunTree(runTree, fn),
		);
	} finally {
		syncRunState(runState, runTree);
	}
}

function buildBaseMetadata(options: CreateInstanceAiTraceContextOptions): Record<string, unknown> {
	return {
		thread_id: options.threadId,
		'langsmith.metadata.thread_id': options.threadId,
		conversation_id: options.conversationId ?? options.threadId,
		message_group_id: options.messageGroupId,
		message_id: options.messageId,
		run_id: options.runId,
		user_id: options.userId,
		...(options.modelId !== undefined
			? { model_id: serializeModelIdForTrace(options.modelId) }
			: {}),
		...options.metadata,
	};
}

function createTelemetryFactory(options: {
	projectName: string;
	traceKind: InstanceAiTraceContext['traceKind'];
	rootRun: InstanceAiTraceRun;
	actorRun: InstanceAiTraceRun;
	baseMetadata: Record<string, unknown>;
	proxyConfig?: ServiceProxyConfig;
}): (telemetryOptions: InstanceAiTelemetryOptions) => Telemetry {
	return (telemetryOptions) => {
		const agentRole = telemetryOptions.agentRole;
		const executionMode =
			telemetryOptions.executionMode ??
			(options.traceKind === 'detached_subagent' ? 'detached_subagent' : 'foreground');
		const metadata = toTelemetryMetadata(options.baseMetadata, telemetryOptions.metadata, {
			agent_role: agentRole,
			execution_mode: executionMode,
			trace_kind: options.traceKind,
			langsmith_trace_id: options.rootRun.traceId,
			langsmith_root_run_id: options.rootRun.id,
			langsmith_actor_run_id: options.actorRun.id,
		});
		const functionId = telemetryOptions.functionId ?? formatTelemetryFunctionId(agentRole);

		return new LangSmithTelemetry({
			project: options.projectName,
			transformExportedSpan: redactLangSmithTelemetrySpan,
			...(options.proxyConfig
				? {
						apiKey: '-',
						endpoint: options.proxyConfig.apiUrl,
						headers: options.proxyConfig.getAuthHeaders,
					}
				: {}),
		})
			.functionId(functionId)
			.metadata(metadata)
			.recordInputs(true)
			.recordOutputs(true);
	};
}

export async function createInstanceAiTraceContext(
	options: CreateInstanceAiTraceContextOptions,
): Promise<InstanceAiTraceContext | undefined> {
	if (!isLangSmithTracingEnabled(!!options.proxyConfig)) {
		return undefined;
	}

	ensureLangSmithTracingEnv();

	const client = options.proxyConfig ? getOrCreateProxyClient(options.proxyConfig) : undefined;
	const projectName = options.projectName ?? DEFAULT_PROJECT_NAME;
	const baseMetadata = buildBaseMetadata(options);

	const createTraceRuns = async () => {
		const messageRun = await createRun({
			projectName,
			name: 'message_turn',
			tags: ['message-turn'],
			metadata: mergeMetadata(baseMetadata, { agent_role: 'message_turn' }),
			inputs: options.input,
			client,
		});
		const orchestratorRun = await createChildRun(messageRun, {
			name: 'orchestrator',
			tags: ['orchestrator'],
			metadata: mergeMetadata(baseMetadata, { agent_role: 'orchestrator' }),
			inputs: options.input,
		});

		return createTraceContext(
			projectName,
			'message_turn',
			messageRun,
			orchestratorRun,
			options.proxyConfig?.getAuthHeaders,
			createTelemetryFactory({
				projectName,
				traceKind: 'message_turn',
				rootRun: messageRun,
				actorRun: orchestratorRun,
				baseMetadata,
				...(options.proxyConfig ? { proxyConfig: options.proxyConfig } : {}),
			}),
		);
	};

	if (options.proxyConfig) {
		const headers = await options.proxyConfig.getAuthHeaders();
		return await proxyHeaderStore.run(headers, createTraceRuns);
	}
	return await createTraceRuns();
}

export async function continueInstanceAiTraceContext(
	existingContext: InstanceAiTraceContext,
	options: CreateInstanceAiTraceContextOptions,
): Promise<InstanceAiTraceContext> {
	const baseMetadata = buildBaseMetadata(options);

	const createContinuation = async () => {
		const orchestratorRun = await createChildRun(existingContext.messageRun, {
			name: 'orchestrator',
			tags: ['orchestrator'],
			metadata: mergeMetadata(baseMetadata, { agent_role: 'orchestrator' }),
			inputs: options.input,
		});

		return createTraceContext(
			existingContext.projectName,
			'message_turn',
			existingContext.rootRun,
			orchestratorRun,
			options.proxyConfig?.getAuthHeaders,
			createTelemetryFactory({
				projectName: existingContext.projectName,
				traceKind: 'message_turn',
				rootRun: existingContext.rootRun,
				actorRun: orchestratorRun,
				baseMetadata,
				...(options.proxyConfig ? { proxyConfig: options.proxyConfig } : {}),
			}),
		);
	};

	if (options.proxyConfig) {
		const headers = await options.proxyConfig.getAuthHeaders();
		return await proxyHeaderStore.run(headers, createContinuation);
	}
	return await createContinuation();
}

export async function createDetachedSubAgentTraceContext(
	options: CreateDetachedSubAgentTraceContextOptions,
): Promise<InstanceAiTraceContext | undefined> {
	if (!isLangSmithTracingEnabled(!!options.proxyConfig)) {
		return undefined;
	}

	ensureLangSmithTracingEnv();

	const client = options.proxyConfig ? getOrCreateProxyClient(options.proxyConfig) : undefined;
	const projectName = options.projectName ?? DEFAULT_PROJECT_NAME;
	const baseMetadata = buildBaseMetadata(options);

	const createDetachedRuns = async () => {
		const rootRun = await createRun({
			projectName,
			name: `subagent:${options.role}`,
			tags: normalizeTags(
				['sub-agent', 'background'],
				options.plannedTaskId ? ['planned'] : undefined,
			),
			metadata: mergeMetadata(baseMetadata, {
				agent_role: options.role,
				agent_id: options.agentId,
				task_kind: options.kind,
				...(options.taskId ? { task_id: options.taskId } : {}),
				...(options.plannedTaskId ? { planned_task_id: options.plannedTaskId } : {}),
				...(options.workItemId ? { work_item_id: options.workItemId } : {}),
				...(options.spawnedByTraceId ? { spawned_by_trace_id: options.spawnedByTraceId } : {}),
				...(options.spawnedByRunId ? { spawned_by_run_id: options.spawnedByRunId } : {}),
				...(options.spawnedByAgentId ? { spawned_by_agent_id: options.spawnedByAgentId } : {}),
			}),
			inputs: options.input,
			client,
		});

		return createTraceContext(
			projectName,
			'detached_subagent',
			rootRun,
			rootRun,
			options.proxyConfig?.getAuthHeaders,
			createTelemetryFactory({
				projectName,
				traceKind: 'detached_subagent',
				rootRun,
				actorRun: rootRun,
				baseMetadata:
					mergeMetadata(baseMetadata, {
						agent_role: options.role,
						agent_id: options.agentId,
						task_kind: options.kind,
						...(options.taskId ? { task_id: options.taskId } : {}),
						...(options.plannedTaskId ? { planned_task_id: options.plannedTaskId } : {}),
						...(options.workItemId ? { work_item_id: options.workItemId } : {}),
						...(options.spawnedByTraceId ? { spawned_by_trace_id: options.spawnedByTraceId } : {}),
						...(options.spawnedByRunId ? { spawned_by_run_id: options.spawnedByRunId } : {}),
						...(options.spawnedByAgentId ? { spawned_by_agent_id: options.spawnedByAgentId } : {}),
					}) ?? baseMetadata,
				...(options.proxyConfig ? { proxyConfig: options.proxyConfig } : {}),
			}),
		);
	};

	if (options.proxyConfig) {
		const headers = await options.proxyConfig.getAuthHeaders();
		return await proxyHeaderStore.run(headers, createDetachedRuns);
	}
	return await createDetachedRuns();
}

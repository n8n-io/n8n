import {
	LangSmithTelemetry,
	Telemetry,
	type AttributeValue,
	type BuiltTelemetry,
	type BuiltTool,
	type InterruptibleToolContext,
	type ToolContext,
} from '@n8n/agents';
import {
	ROOT_CONTEXT,
	SpanStatusCode,
	context as otelContext,
	trace as otelTrace,
} from '@opentelemetry/api';
import type { Context as OtelContext, Span as OtelApiSpan } from '@opentelemetry/api';
import { Client } from 'langsmith';
import { AsyncLocalStorage } from 'node:async_hooks';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

import { createToolRegistry } from '../tool-registry';
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
const productTraceStorage = new AsyncLocalStorage<{
	runtime: ProductOtelTraceRuntime;
	currentRun: InstanceAiTraceRun;
}>();

// Per-request proxy auth headers, isolated via AsyncLocalStorage.
// The proxy Client is cached per deployment URL; each concurrent request
// wraps its agent execution in proxyHeaderStore.run(headers, fn) so
// the shared Client's custom fetch reads the correct per-request
// Authorization header without any shared mutable state.
const proxyHeaderStore = new AsyncLocalStorage<Record<string, string>>();

const otelTraceRuntimes = new Map<string, ProductOtelTraceRuntime>();
const hostRequire = createRequire(__filename);

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

const OTEL_TRACE_VERSION = 'otel-v2';
const LANGSMITH_TRACEABLE = 'langsmith.traceable';
const LANGSMITH_TRACE_NAME = 'langsmith.trace.name';
const LANGSMITH_SPAN_KIND = 'langsmith.span.kind';
const LANGSMITH_SPAN_TAGS = 'langsmith.span.tags';
const LANGSMITH_USAGE_METADATA = 'langsmith.usage_metadata';
const GEN_AI_PROMPT = 'gen_ai.prompt';
const GEN_AI_COMPLETION = 'gen_ai.completion';
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

interface ProductOtelTraceRuntime {
	telemetry: BuiltTelemetry;
	spans: Map<string, OtelApiSpan>;
	contexts: Map<string, OtelContext>;
}

interface OTelTracer {
	startSpan(
		name: string,
		options?: { attributes?: Record<string, AttributeValue> },
		context?: OtelContext,
	): OtelApiSpan;
}

function isOtelTracer(value: unknown): value is OTelTracer {
	return (
		value !== null &&
		typeof value === 'object' &&
		typeof Reflect.get(value, 'startSpan') === 'function'
	);
}

function langsmithTraceIdFromOtelTraceId(traceId: string): string {
	return `${traceId.substring(0, 8)}-${traceId.substring(8, 12)}-${traceId.substring(
		12,
		16,
	)}-${traceId.substring(16, 20)}-${traceId.substring(20, 32)}`;
}

function langsmithRunIdFromOtelSpanId(spanId: string): string {
	const paddedHex = spanId.padStart(16, '0');
	return `00000000-0000-0000-${paddedHex.substring(0, 4)}-${paddedHex.substring(4, 16)}`;
}

function stableDottedOrder(parentRun: InstanceAiTraceRun | undefined, runId: string): string {
	return parentRun?.dottedOrder ? `${parentRun.dottedOrder}.${runId}` : runId;
}

function formatTraceLabel(value: string): string {
	return value
		.trim()
		.replace(/[._\s]+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-+|-+$/g, '');
}

function formatAgentRoleLabel(role: string): string {
	return formatTraceLabel(role.replace(/^instance-ai[._-]?/, ''));
}

function formatResumeReasonLabel(reason: unknown): string {
	if (typeof reason !== 'string' || reason.trim().length === 0) {
		return 'checkpoint';
	}

	return reason
		.trim()
		.replace(/[._-]+/g, ' ')
		.replace(/\s+/g, ' ');
}

function formatInternalOperationLabel(operationName: string): string {
	return formatAgentRoleLabel(operationName);
}

function inferDisplayKind(name: string): string {
	if (name === 'turn') return 'turn';
	if (name.startsWith('agent:')) return 'agent';
	if (name.startsWith('llm:')) return 'llm';
	if (name.startsWith('tool:')) return 'tool';
	if (name.startsWith('prepare:')) return 'prepare';
	if (name.startsWith('resume:')) return 'resume';
	if (name.startsWith('background task:')) return 'background_task';
	if (name.startsWith('hitl:')) return 'hitl';
	if (name.startsWith('internal:')) return 'internal';
	return 'operation';
}

function inferDisplayGroup(
	metadata: Record<string, unknown> | undefined,
	name: string,
): string | undefined {
	const role =
		typeof metadata?.agent_role === 'string'
			? metadata.agent_role
			: typeof metadata?.subagent_role === 'string'
				? metadata.subagent_role
				: undefined;
	if (role) {
		return formatAgentRoleLabel(role);
	}

	if (name.startsWith('prepare:')) return 'preparation';
	if (name.startsWith('hitl:')) return 'human-in-the-loop';
	if (name === 'turn') return 'conversation';
	return undefined;
}

function inferDisplayPhase(metadata: Record<string, unknown> | undefined): string | undefined {
	return typeof metadata?.execution_mode === 'string'
		? formatTraceLabel(metadata.execution_mode)
		: undefined;
}

function buildProductSpanMetadata(options: {
	name: string;
	canonicalName?: string;
	metadata?: Record<string, unknown>;
}): Record<string, unknown> {
	const canonicalName = options.canonicalName ?? options.name;
	const displayGroup = inferDisplayGroup(options.metadata, options.name);
	const displayPhase = inferDisplayPhase(options.metadata);
	const displayDefaults = {
		trace_version: OTEL_TRACE_VERSION,
		'instance_ai.trace_version': OTEL_TRACE_VERSION,
		display_kind: inferDisplayKind(options.name),
		...(displayGroup ? { display_group: displayGroup } : {}),
		...(displayPhase ? { display_phase: displayPhase } : {}),
	};

	return (
		mergeMetadata(displayDefaults, options.metadata, {
			display_name: options.name,
			'instance_ai.display_name': options.name,
			'instance_ai.canonical_name': canonicalName,
			'instance_ai.run_name': canonicalName,
		}) ?? {}
	);
}

function buildProductSpanAttributes(options: {
	name: string;
	canonicalName?: string;
	runType?: string;
	tags?: string[];
	metadata?: Record<string, unknown>;
	inputs?: unknown;
}): Record<string, AttributeValue> {
	const attributes: Record<string, AttributeValue> = {
		[LANGSMITH_TRACEABLE]: 'true',
		[LANGSMITH_TRACE_NAME]: options.name,
		[LANGSMITH_SPAN_KIND]: options.runType ?? 'chain',
		'instance_ai.trace_version': OTEL_TRACE_VERSION,
	};

	const tags = normalizeTags(DEFAULT_TAGS, options.tags);
	if (tags?.length) {
		attributes[LANGSMITH_SPAN_TAGS] = tags;
	}

	const metadata = buildProductSpanMetadata(options);
	for (const [key, value] of Object.entries(metadata ?? {})) {
		const attributeValue = toTelemetryAttributeValue(value);
		if (attributeValue === undefined) continue;
		attributes[key] = attributeValue;
		if (!key.startsWith('langsmith.metadata.')) {
			attributes[`langsmith.metadata.${key}`] = attributeValue;
		}
	}

	const inputs = options.inputs === undefined ? undefined : stringifyTracePayload(options.inputs);
	if (inputs !== undefined) {
		attributes[GEN_AI_PROMPT] = inputs;
	}

	return attributes;
}

function stringifyTracePayload(value: unknown): string | undefined {
	try {
		return JSON.stringify(sanitizeTracePayload(value));
	} catch {
		return undefined;
	}
}

function startProductSpan(
	runtime: ProductOtelTraceRuntime,
	options: {
		projectName: string;
		name: string;
		canonicalName?: string;
		runType?: string;
		tags?: string[];
		metadata?: Record<string, unknown>;
		inputs?: unknown;
		parentRun?: InstanceAiTraceRun;
		parentContext?: OtelContext;
		root?: boolean;
	},
): InstanceAiTraceRun {
	if (!isOtelTracer(runtime.telemetry.tracer)) {
		throw new Error('Instance AI tracing requires an OpenTelemetry tracer');
	}

	const spanMetadata = buildProductSpanMetadata(options);
	const parentContext = options.root
		? ROOT_CONTEXT
		: (options.parentContext ??
			(options.parentRun ? runtime.contexts.get(options.parentRun.id) : undefined) ??
			otelContext.active());
	const span = runtime.telemetry.tracer.startSpan(
		options.name,
		{
			attributes: buildProductSpanAttributes(options),
		},
		parentContext,
	);
	const spanContext = span.spanContext();
	const traceId = langsmithTraceIdFromOtelTraceId(spanContext.traceId);
	const runId = langsmithRunIdFromOtelSpanId(spanContext.spanId);
	const spanContextWithSpan = otelTrace.setSpan(parentContext ?? otelContext.active(), span);
	const parentRun = options.parentRun;
	const runMetadata = mergeMetadata(parentRun?.metadata, spanMetadata);
	const run: InstanceAiTraceRun = {
		id: runId,
		name: options.name,
		runType: options.runType ?? 'chain',
		projectName: options.projectName,
		startTime: Date.now(),
		traceId,
		otelTraceId: spanContext.traceId,
		otelSpanId: spanContext.spanId,
		dottedOrder: stableDottedOrder(parentRun, runId),
		executionOrder: parentRun ? parentRun.childExecutionOrder + 1 : 0,
		childExecutionOrder: 0,
		...(parentRun ? { parentRunId: parentRun.id } : {}),
		...(options.tags ? { tags: normalizeTags(DEFAULT_TAGS, parentRun?.tags, options.tags) } : {}),
		...(runMetadata ? { metadata: runMetadata } : {}),
		...(options.inputs !== undefined ? { inputs: sanitizeTracePayload(options.inputs) } : {}),
	};

	if (parentRun) {
		parentRun.childExecutionOrder += 1;
	}

	runtime.spans.set(run.id, span);
	runtime.contexts.set(run.id, spanContextWithSpan);
	return run;
}

async function finishProductSpan(
	runtime: ProductOtelTraceRuntime,
	run: InstanceAiTraceRun,
	options?: InstanceAiTraceRunFinishOptions,
): Promise<void> {
	const span = runtime.spans.get(run.id);
	if (!span) return;

	const metadata = mergeMetadata(options?.metadata);
	const attributes: Record<string, AttributeValue> = {};
	for (const [key, value] of Object.entries(metadata ?? {})) {
		const attributeValue = toTelemetryAttributeValue(value);
		if (attributeValue === undefined) continue;
		attributes[key] = attributeValue;
		attributes[`langsmith.metadata.${key}`] = attributeValue;
	}

	if (options?.outputs !== undefined) {
		const completion = stringifyTracePayload(options.outputs);
		if (completion !== undefined) {
			attributes[GEN_AI_COMPLETION] = completion;
		}
		run.outputs = sanitizeTracePayload(options.outputs);
	}

	run.endTime = Date.now();
	run.metadata = mergeMetadata(run.metadata, metadata);

	try {
		if (Object.keys(attributes).length > 0) {
			span.setAttributes(attributes);
		}

		if (options?.error) {
			span.recordException(new Error(options.error));
			span.setStatus({ code: SpanStatusCode.ERROR, message: options.error });
			run.error = options.error;
		} else {
			span.setStatus({ code: SpanStatusCode.OK });
		}

		span.end();
	} finally {
		runtime.spans.delete(run.id);
		runtime.contexts.delete(run.id);
	}

	await Telemetry.forceFlush(runtime.telemetry);
}

async function finishProductSpanBestEffort(
	runtime: ProductOtelTraceRuntime,
	run: InstanceAiTraceRun,
	options?: InstanceAiTraceRunFinishOptions,
): Promise<void> {
	try {
		await finishProductSpan(runtime, run, options);
	} catch {
		// Product tracing is best-effort and must not fail or mask agent execution.
	}
}

async function withProductSpanContext<T>(
	runtime: ProductOtelTraceRuntime,
	run: InstanceAiTraceRun,
	fn: () => Promise<T>,
): Promise<T> {
	const spanContext = runtime.contexts.get(run.id);
	if (!spanContext) {
		return await fn();
	}

	return await productTraceStorage.run(
		{ runtime, currentRun: run },
		async () => await otelContext.with(spanContext, fn),
	);
}

async function withProductSpanContextBestEffort<T>(
	runtime: ProductOtelTraceRuntime,
	run: InstanceAiTraceRun,
	fn: () => Promise<T>,
): Promise<T> {
	let callbackStarted = false;
	try {
		return await withProductSpanContext(runtime, run, async () => {
			callbackStarted = true;
			return await fn();
		});
	} catch (error) {
		if (!callbackStarted) {
			return await fn();
		}
		throw error;
	}
}

function createFallbackChildRun(
	projectName: string,
	parentRun: InstanceAiTraceRun,
	init: InstanceAiTraceRunInit,
): InstanceAiTraceRun {
	const executionOrder = parentRun.childExecutionOrder + 1;
	const id = `${parentRun.id}:child:${executionOrder}`;
	const metadata = mergeMetadata(parentRun.metadata, init.metadata);
	parentRun.childExecutionOrder = executionOrder;

	return {
		id,
		name: init.name,
		runType: init.runType ?? 'chain',
		projectName,
		startTime: Date.now(),
		traceId: parentRun.traceId,
		dottedOrder: stableDottedOrder(parentRun, id),
		executionOrder,
		childExecutionOrder: 0,
		parentRunId: parentRun.id,
		...(init.tags ? { tags: normalizeTags(DEFAULT_TAGS, parentRun.tags, init.tags) } : {}),
		...(metadata ? { metadata } : {}),
		...(init.inputs !== undefined ? { inputs: sanitizeTracePayload(init.inputs) } : {}),
	};
}

function getCurrentProductTrace():
	| { runtime: ProductOtelTraceRuntime; currentRun: InstanceAiTraceRun }
	| undefined {
	return productTraceStorage.getStore();
}

function getActiveOtelContextWithSpan(): OtelContext | undefined {
	const activeContext = otelContext.active();
	return otelTrace.getSpan(activeContext) ? activeContext : undefined;
}

function spanMetadataAttributes(
	metadata: Record<string, unknown> | undefined,
): Record<string, AttributeValue> {
	const attributes: Record<string, AttributeValue> = {};
	for (const [key, value] of Object.entries(metadata ?? {})) {
		const attributeValue = toTelemetryAttributeValue(value);
		if (attributeValue === undefined) continue;
		attributes[key] = attributeValue;
		if (!key.startsWith('langsmith.metadata.')) {
			attributes[`langsmith.metadata.${key}`] = attributeValue;
		}
	}
	return attributes;
}

function updateProductRunMetadata(
	runtime: ProductOtelTraceRuntime,
	run: InstanceAiTraceRun,
	metadata: Record<string, unknown>,
): void {
	const mergedMetadata = mergeMetadata(run.metadata, metadata);
	if (!mergedMetadata) return;

	run.metadata = mergedMetadata;
	const attributes = spanMetadataAttributes(metadata);
	if (Object.keys(attributes).length > 0) {
		try {
			runtime.spans.get(run.id)?.setAttributes(attributes);
		} catch {
			// Product tracing is best-effort and must not fail agent execution.
		}
	}
}

function updateProductRunInputs(
	runtime: ProductOtelTraceRuntime,
	run: InstanceAiTraceRun,
	inputs: Record<string, unknown>,
): void {
	const mergedInputs = sanitizeTracePayload(mergeTraceInputs(run.inputs, inputs));
	run.inputs = mergedInputs;

	const prompt = stringifyTracePayload(mergedInputs);
	if (prompt !== undefined) {
		try {
			runtime.spans.get(run.id)?.setAttributes({ [GEN_AI_PROMPT]: prompt });
		} catch {
			// Product tracing is best-effort and must not fail agent execution.
		}
	}
}

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
	n8nVersion?: string;
	workflowSdkVersion?: string;
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
	spawnedBySpanId?: string;
	spawnedByRunId?: string;
	spawnedByAgentId?: string;
	spawnedByAgentRole?: string;
	spawnedByToolCallId?: string;
}

interface CreateInternalOperationTraceContextOptions
	extends Omit<CreateInstanceAiTraceContextOptions, 'messageId'> {
	operationName: string;
	messageId?: string;
}

interface CurrentTraceSpanOptions<T = unknown> {
	name: string;
	canonicalName?: string;
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
	runtimeTools?: InstanceAiToolRegistry;
	modelId?: unknown;
	memory?: unknown;
	toolSearchEnabled?: boolean;
	inputProcessors?: string[];
}

type NativeToolContext = ToolContext | InterruptibleToolContext;
type TraceableNativeTool = BuiltTool & { handler: NonNullable<BuiltTool['handler']> };

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

function isInternalOperationTracingEnabled(): boolean {
	return (
		process.env.N8N_INSTANCE_AI_TRACE_INTERNAL === 'true' ||
		process.env.N8N_INSTANCE_AI_TRACE_INCLUDE_INTERNAL === 'true'
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

	const maxDepth =
		key === 'ai.prompt.messages' || key === GEN_AI_PROMPT
			? MAX_PROMPT_SCHEMA_TRACE_DEPTH
			: MAX_TRACE_DEPTH;

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
		if (!toolCallId || !toolName) continue;

		toolCalls.push({
			id: toolCallId,
			type: 'function',
			function: {
				name: toolName,
				arguments: stringifyToolPayload(readToolCallPayload(part)),
			},
		});
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
	const cacheReadTokens =
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
		0;
	const cacheCreationTokens =
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
		0;

	const regularInputTokens =
		inputTokens === undefined
			? 0
			: Math.max(0, inputTokens - cacheReadTokens - cacheCreationTokens);
	const inputTokenDetails: Record<string, number> = {};
	if (cacheReadTokens > 0) {
		inputTokenDetails.cache_read = cacheReadTokens;
	}
	if (cacheCreationTokens > 0) {
		inputTokenDetails.cache_creation = cacheCreationTokens;
		inputTokenDetails.ephemeral_5m_input_tokens = cacheCreationTokens;
	}

	return {
		input_tokens: regularInputTokens,
		output_tokens: outputTokens,
		total_tokens: regularInputTokens + outputTokens,
		...(Object.keys(inputTokenDetails).length > 0
			? { input_token_details: inputTokenDetails }
			: {}),
	};
}

function normalizeAnthropicUsageForLangSmith(attributes: Record<string, unknown>): void {
	const usageMetadata = buildLangSmithUsageMetadata(attributes);
	if (!usageMetadata) {
		return;
	}

	const inputTokens = firstNumberAttribute(attributes, [
		GEN_AI_USAGE_INPUT_TOKENS,
		'ai.usage.inputTokens',
		'ai.usage.promptTokens',
	]);
	const regularInputTokens = numberFromAttribute(usageMetadata.input_tokens) ?? 0;
	const outputTokens = numberFromAttribute(usageMetadata.output_tokens) ?? 0;
	const inputTokenDetails = isRecord(usageMetadata.input_token_details)
		? usageMetadata.input_token_details
		: {};
	const cacheReadTokens = numberFromAttribute(inputTokenDetails.cache_read) ?? 0;
	const cacheCreationTokens =
		numberFromAttribute(inputTokenDetails.cache_creation) ??
		numberFromAttribute(inputTokenDetails.ephemeral_5m_input_tokens) ??
		0;

	attributes[GEN_AI_USAGE_INPUT_TOKENS] = regularInputTokens;
	attributes[GEN_AI_USAGE_OUTPUT_TOKENS] = outputTokens;
	attributes[GEN_AI_USAGE_TOTAL_TOKENS] = regularInputTokens + outputTokens;
	attributes['ai.usage.inputTokens'] = regularInputTokens;
	attributes[LANGSMITH_USAGE_METADATA] = JSON.stringify(usageMetadata);
	if (inputTokens !== undefined) {
		attributes['langsmith.metadata.anthropic_original_input_tokens'] = inputTokens;
	}
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
	normalizeAnthropicUsageForLangSmith(attributes);
	renameNativeLlmSpanForLangSmith(span, attributes);
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
		name === 'write-file' ||
		name === 'submit-workflow' ||
		name === 'apply-workflow-credentials'
	) {
		return 'workspace';
	}

	if (
		[
			'plan',
			'submit-plan',
			'add-plan-item',
			'remove-plan-item',
			'create-tasks',
			'build-workflow-with-agent',
			'manage-data-tables-with-agent',
			'research-with-agent',
			'delegate',
			'browser-credential-setup',
			'complete-checkpoint',
			'verify-built-workflow',
			'report-verification-verdict',
		].includes(name)
	) {
		return 'orchestration';
	}

	return 'domain';
}

function classifyToolCategory(name: string): string {
	if (name.includes('credential')) return 'credential';
	if (name.includes('browser')) return 'browser';
	if (name.includes('data-table')) return 'data-table';
	if (name.includes('workflow') || name === 'build-workflow' || name === 'submit-workflow') {
		return 'workflow';
	}
	if (name === 'nodes' || name === 'materialize-node-type') return 'node';
	if (name === 'executions') return 'execution';
	if (name.includes('research')) return 'research';
	if (name === 'plan' || name.includes('plan') || name === 'create-tasks') return 'planning';
	if (name.startsWith('workspace_')) return 'workspace';
	if (name.includes('file') || name.includes('filesystem')) return 'filesystem';
	return 'other';
}

function classifyToolSideEffect(name: string): string {
	if (name.includes('browser')) return 'browser';
	if (name.includes('research')) return 'network';
	if (name === 'executions' || name.includes('execute') || name.includes('run')) return 'execute';
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
	if (name.includes('ask-user') || name.includes('pause-for-user')) return 'none';
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
		const definition = isRecord(inputSchema._def) ? inputSchema._def : undefined;
		return {
			type: 'zod',
			...(typeof definition?.typeName === 'string' ? { typeName: definition.typeName } : {}),
		};
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
	const providerOptions = isRecord(toolRecord.providerOptions)
		? redactTelemetryJsonValue(toolRecord.providerOptions)
		: undefined;

	return {
		name,
		...(summarizeToolDescription(tool) ? { description: summarizeToolDescription(tool) } : {}),
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

	const summaries = Array.from(tools, ([name, tool]) => summarizeToolForManifest(name, tool));
	const manifestHash = stableHash(summaries);
	const toolNames = summaries
		.map((tool) => (typeof tool.name === 'string' ? tool.name : undefined))
		.filter((name): name is string => name !== undefined);
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

export function serializeModelIdForTrace(modelId: unknown): unknown {
	if (typeof modelId === 'string' && modelId.length > 0) {
		return truncateString(modelId);
	}

	if (isRecord(modelId) && typeof modelId.id === 'string') {
		return truncateString(modelId.id);
	}

	return sanitizeTraceValue(modelId);
}

function mergeTraceInputs(
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
 * Call after run finalization (success or failure) so its OTel runtime can be
 * garbage-collected.
 */
export function releaseTraceClient(traceId: string): void {
	otelTraceRuntimes.delete(traceId);
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

export function getCurrentOtelSpanContext(): { traceId: string; spanId: string } | undefined {
	const activeSpanContext = otelTrace.getSpan(otelContext.active())?.spanContext();
	if (activeSpanContext) {
		return {
			traceId: activeSpanContext.traceId,
			spanId: activeSpanContext.spanId,
		};
	}

	const currentRun = getCurrentProductTrace()?.currentRun;
	if (currentRun?.otelTraceId && currentRun.otelSpanId) {
		return {
			traceId: currentRun.otelTraceId,
			spanId: currentRun.otelSpanId,
		};
	}

	return undefined;
}

export function getCurrentTraceToolCallId(): string | undefined {
	const metadata = getCurrentProductTrace()?.currentRun.metadata;
	return typeof metadata?.tool_call_id === 'string' ? metadata.tool_call_id : undefined;
}

export function mergeCurrentTraceMetadata(metadata: Record<string, unknown>): void {
	const currentProductTrace = getCurrentProductTrace();
	if (currentProductTrace) {
		updateProductRunMetadata(currentProductTrace.runtime, currentProductTrace.currentRun, metadata);
	}
}

export function appendRootRunMetadata(
	root: InstanceAiTraceRun,
	patch: Record<string, unknown>,
): void {
	const runtime = getCurrentProductTrace()?.runtime ?? otelTraceRuntimes.get(root.traceId);
	if (runtime) {
		updateProductRunMetadata(runtime, root, patch);
		return;
	}

	const mergedMetadata = mergeMetadata(root.metadata, patch);
	if (mergedMetadata) {
		root.metadata = mergedMetadata;
	}
}

export function appendGeneratedWorkflowIdToRootMetadata(
	root: InstanceAiTraceRun,
	workflowId: string,
): void {
	const generatedWorkflowIds = root.metadata?.generated_workflow_ids;
	const existing = Array.isArray(generatedWorkflowIds)
		? generatedWorkflowIds.filter((value): value is string => typeof value === 'string')
		: [];
	if (existing.includes(workflowId)) {
		return;
	}
	appendRootRunMetadata(root, { generated_workflow_ids: [...existing, workflowId] });
}

export function mergeTraceRunInputs(
	run: InstanceAiTraceRun | undefined,
	inputs: Record<string, unknown>,
): void {
	if (!run) {
		return;
	}

	const runtime = getCurrentProductTrace()?.runtime ?? otelTraceRuntimes.get(run.traceId);
	if (runtime) {
		updateProductRunInputs(runtime, run, inputs);
		return;
	}

	run.inputs = sanitizeTracePayload(mergeTraceInputs(run.inputs, inputs));
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
	});
}

export async function withCurrentTraceSpan<T>(
	options: CurrentTraceSpanOptions<T>,
	fn: () => Promise<T>,
): Promise<T> {
	const currentProductTrace = getCurrentProductTrace();
	if (!currentProductTrace) {
		return await fn();
	}

	const activeParentContext = getActiveOtelContextWithSpan();
	let spanRun: InstanceAiTraceRun;
	try {
		spanRun = startProductSpan(currentProductTrace.runtime, {
			projectName: currentProductTrace.currentRun.projectName,
			name: options.name,
			canonicalName: options.canonicalName,
			runType: options.runType ?? 'chain',
			tags: options.tags,
			metadata: options.metadata,
			inputs: options.inputs,
			parentRun: currentProductTrace.currentRun,
			...(activeParentContext ? { parentContext: activeParentContext } : {}),
		});
	} catch {
		return await fn();
	}

	try {
		const result = await withProductSpanContextBestEffort(currentProductTrace.runtime, spanRun, fn);
		await finishProductSpanBestEffort(currentProductTrace.runtime, spanRun, {
			...(options.processOutputs ? { outputs: options.processOutputs(result) } : {}),
			metadata: { final_status: 'completed' },
		});
		return result;
	} catch (error) {
		await finishProductSpanBestEffort(currentProductTrace.runtime, spanRun, {
			error: normalizeErrorMessage(error),
			metadata: { final_status: 'error' },
		});
		throw error;
	}
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

function getToolCallId(context: NativeToolContext): string | undefined {
	return isRecord(context) && typeof context.toolCallId === 'string'
		? context.toolCallId
		: undefined;
}

async function startAndFinishProductChildSpan(
	currentTrace: { runtime: ProductOtelTraceRuntime; currentRun: InstanceAiTraceRun },
	options: {
		name: string;
		canonicalName?: string;
		runType?: string;
		tags?: string[];
		metadata?: Record<string, unknown>;
		inputs?: unknown;
		outputs?: unknown;
		error?: string;
	},
): Promise<void> {
	const activeParentContext = getActiveOtelContextWithSpan();
	let childRun: InstanceAiTraceRun;
	try {
		childRun = startProductSpan(currentTrace.runtime, {
			projectName: currentTrace.currentRun.projectName,
			name: options.name,
			canonicalName: options.canonicalName,
			runType: options.runType ?? 'chain',
			tags: options.tags,
			metadata: options.metadata,
			inputs: options.inputs,
			parentRun: currentTrace.currentRun,
			...(activeParentContext ? { parentContext: activeParentContext } : {}),
		});
	} catch {
		return;
	}
	await finishProductSpanBestEffort(currentTrace.runtime, childRun, {
		...(options.outputs !== undefined ? { outputs: options.outputs } : {}),
		...(options.error ? { error: options.error } : {}),
		metadata: {
			final_status: options.error ? 'error' : 'completed',
		},
	});
}

async function traceProductSuspendableToolExecute(
	tool: TraceableNativeTool,
	input: unknown,
	context: NativeToolContext,
	currentTrace: { runtime: ProductOtelTraceRuntime; currentRun: InstanceAiTraceRun },
): Promise<unknown> {
	const resumeData = isInterruptibleToolContext(context) ? context.resumeData : undefined;
	const isResume = resumeData !== undefined && resumeData !== null;
	const toolCallId = getToolCallId(context);

	const originalSuspend = isInterruptibleToolContext(context) ? context.suspend : undefined;
	const wrappedContext: NativeToolContext =
		typeof originalSuspend === 'function'
			? {
					...context,
					suspend: async (suspendPayload: unknown) => {
						await startAndFinishProductChildSpan(currentTrace, {
							name: 'hitl: suspend',
							canonicalName: 'instance-ai.hitl.suspend',
							runType: 'chain',
							tags: ['hitl'],
							metadata: mergeMetadata(buildSuspendMetadata(tool.name, suspendPayload), {
								...(toolCallId ? { tool_call_id: toolCallId } : {}),
							}),
							inputs: suspendPayload,
							outputs: suspendPayload,
						});
						return await originalSuspend(suspendPayload);
					},
				}
			: context;

	if (isResume) {
		await startAndFinishProductChildSpan(currentTrace, {
			name: 'hitl: resume',
			canonicalName: 'instance-ai.hitl.resume',
			runType: 'chain',
			tags: ['hitl', 'resume'],
			metadata: mergeMetadata(buildSuspendMetadata(tool.name, resumeData), {
				approved: isRecord(resumeData) ? resumeData.approved : undefined,
				...(toolCallId ? { tool_call_id: toolCallId } : {}),
			}),
			inputs: resumeData,
			outputs: {
				status: 'resumed',
			},
		});
	}

	return await tool.handler(input, wrappedContext);
}

async function traceSuspendableToolExecute(
	tool: TraceableNativeTool,
	input: unknown,
	context: NativeToolContext,
): Promise<unknown> {
	const currentProductTrace = getCurrentProductTrace();
	if (!currentProductTrace) {
		return await tool.handler(input, context);
	}

	return await traceProductSuspendableToolExecute(tool, input, context, currentProductTrace);
}

function createTraceContext(
	projectName: string,
	traceKind: InstanceAiTraceContext['traceKind'],
	rootRun: InstanceAiTraceRun,
	actorRun: InstanceAiTraceRun,
	otelRuntime: ProductOtelTraceRuntime,
	proxyConfig?: ServiceProxyConfig,
	telemetryFactory?: (options: InstanceAiTelemetryOptions) => Telemetry | BuiltTelemetry,
): InstanceAiTraceContext {
	otelTraceRuntimes.set(rootRun.traceId, otelRuntime);

	const getProxyHeaders = proxyConfig?.getAuthHeaders;
	const withProxy = async <T>(fn: () => T | Promise<T>): Promise<T> => {
		if (!getProxyHeaders) return await fn();
		let headers: Record<string, string>;
		try {
			headers = await getProxyHeaders();
		} catch {
			return await fn();
		}
		return await proxyHeaderStore.run(headers, fn);
	};

	const startChildRun = async (
		parentRun: InstanceAiTraceRun,
		init: InstanceAiTraceRunInit,
	): Promise<InstanceAiTraceRun> =>
		await withProxy(() => {
			const activeParentContext = getActiveOtelContextWithSpan();
			try {
				return startProductSpan(otelRuntime, {
					projectName,
					name: init.name,
					canonicalName: init.canonicalName,
					runType: init.runType,
					tags: init.tags,
					metadata: mergeMetadata(parentRun.metadata, init.metadata),
					inputs: init.inputs,
					parentRun,
					...(activeParentContext ? { parentContext: activeParentContext } : {}),
				});
			} catch {
				return createFallbackChildRun(projectName, parentRun, init);
			}
		});

	const withActiveSpan = async <T>(run: InstanceAiTraceRun, fn: () => Promise<T>): Promise<T> =>
		await withProxy(async () => await withProductSpanContextBestEffort(otelRuntime, run, fn));
	const withRunTree = withActiveSpan;

	const finishRun = async (
		run: InstanceAiTraceRun,
		finishOptions?: InstanceAiTraceRunFinishOptions,
	): Promise<void> => {
		await withProxy(async () => await finishProductSpanBestEffort(otelRuntime, run, finishOptions));
		if (!run.parentRunId) {
			otelTraceRuntimes.delete(run.traceId);
		}
	};

	const failRun = async (
		run: InstanceAiTraceRun,
		error: unknown,
		metadata?: Record<string, unknown>,
	): Promise<void> => {
		await withProxy(
			async () =>
				await finishProductSpanBestEffort(otelRuntime, run, {
					error: normalizeErrorMessage(error),
					metadata,
				}),
		);
		if (!run.parentRunId) {
			otelTraceRuntimes.delete(run.traceId);
		}
	};

	const ctx: InstanceAiTraceContext = {
		projectName,
		traceKind,
		...(proxyConfig ? { proxyConfig } : {}),
		rootRun,
		actorRun,
		messageRun: rootRun,
		orchestratorRun: actorRun,
		startChildRun,
		withRunTree,
		withActiveSpan,
		toHeaders: () => ({}),
		finishRun,
		failRun,
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

function isTraceableNativeTool(value: unknown): value is TraceableNativeTool {
	return (
		isRecord(value) &&
		typeof value.name === 'string' &&
		typeof value.description === 'string' &&
		typeof value.handler === 'function'
	);
}

function wrapToolHandler(tool: TraceableNativeTool): TraceableNativeTool {
	return {
		...tool,
		handler: async (input, context) => await traceSuspendableToolExecute(tool, input, context),
	};
}

function shouldTraceLocalToolExecution(tool: TraceableNativeTool): boolean {
	return tool.suspendSchema !== undefined || tool.resumeSchema !== undefined;
}

function wrapTools(
	tools: InstanceAiToolRegistry,
	_options?: InstanceAiToolTraceOptions,
): InstanceAiToolRegistry {
	const wrapped = createToolRegistry();

	for (const [name, tool] of tools) {
		wrapped.set(
			name,
			isTraceableNativeTool(tool) && shouldTraceLocalToolExecution(tool)
				? wrapToolHandler(tool)
				: tool,
		);
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
	const wrapped = createToolRegistry();

	for (const [name, tool] of tools) {
		if (!isTraceableNativeTool(tool)) {
			wrapped.set(name, tool);
			continue;
		}

		if (PURE_REPLAY_TOOLS.has(tool.name)) {
			wrapped.set(name, pureReplayWrapTool(tool, traceIndex, idRemapper, agentRole));
		} else {
			wrapped.set(name, replayWrapTool(tool, traceIndex, idRemapper, agentRole));
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
	const wrapped = createToolRegistry();

	for (const [name, tool] of tools) {
		if (!isTraceableNativeTool(tool)) {
			wrapped.set(name, tool);
			continue;
		}
		wrapped.set(name, recordWrapTool(tool, traceWriter, agentRole));
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
		withActiveSpan: async (_run, fn) => await fn(),
		toHeaders: () => ({}),
		finishRun: async () => {},
		failRun: async () => {},
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

interface TraceRuntimeVersions {
	agents_version?: string;
	workflow_sdk_version?: string;
}

let traceRuntimeVersions: TraceRuntimeVersions | undefined;

function readPackageVersion(packageName: string): string | undefined {
	try {
		const packageJson = hostRequire(`${packageName}/package.json`) as { version?: unknown };
		return typeof packageJson.version === 'string' ? packageJson.version : undefined;
	} catch {
		return undefined;
	}
}

function getTraceRuntimeVersions(): TraceRuntimeVersions {
	if (!traceRuntimeVersions) {
		const agentsVersion = readPackageVersion('@n8n/agents');
		const workflowSdkVersion = readPackageVersion('@n8n/workflow-sdk');
		traceRuntimeVersions = {
			...(agentsVersion ? { agents_version: agentsVersion } : {}),
			...(workflowSdkVersion ? { workflow_sdk_version: workflowSdkVersion } : {}),
		};
	}

	return traceRuntimeVersions;
}

function buildBaseMetadata(options: CreateInstanceAiTraceContextOptions): Record<string, unknown> {
	return {
		thread_id: options.threadId,
		'langsmith.metadata.thread_id': options.threadId,
		conversation_id: options.conversationId ?? options.threadId,
		message_group_id: options.messageGroupId,
		message_id: options.messageId,
		run_id: options.runId,
		activation_id: options.runId,
		user_id: options.userId,
		'instance_ai.trace_version': OTEL_TRACE_VERSION,
		...getTraceRuntimeVersions(),
		...(options.n8nVersion !== undefined ? { n8n_version: options.n8nVersion } : {}),
		...(options.workflowSdkVersion !== undefined
			? { workflow_sdk_version: options.workflowSdkVersion }
			: {}),
		...(options.modelId !== undefined
			? { model_id: serializeModelIdForTrace(options.modelId) }
			: {}),
		...options.metadata,
	};
}

function buildDetachedSubAgentMetadata(
	options: CreateDetachedSubAgentTraceContextOptions,
	includeSpawnMetadata: boolean,
): Record<string, unknown> {
	return {
		agent_role: options.role,
		agent_id: options.agentId,
		execution_mode: 'background_subagent',
		trace_kind: 'background_subagent',
		task_kind: options.kind,
		...(options.taskId ? { task_id: options.taskId } : {}),
		...(options.plannedTaskId ? { planned_task_id: options.plannedTaskId } : {}),
		...(options.workItemId ? { work_item_id: options.workItemId } : {}),
		...(includeSpawnMetadata && options.spawnedByTraceId
			? { spawned_by_trace_id: options.spawnedByTraceId }
			: {}),
		...(includeSpawnMetadata && options.spawnedBySpanId
			? { spawned_by_span_id: options.spawnedBySpanId }
			: {}),
		...(includeSpawnMetadata && options.spawnedByRunId
			? { spawned_by_run_id: options.spawnedByRunId }
			: {}),
		...(includeSpawnMetadata && options.spawnedByAgentId
			? { spawned_by_agent_id: options.spawnedByAgentId }
			: {}),
		...(includeSpawnMetadata && options.spawnedByAgentRole
			? { spawned_by_agent_role: options.spawnedByAgentRole }
			: {}),
		...(includeSpawnMetadata && options.spawnedByToolCallId
			? { spawned_by_tool_call_id: options.spawnedByToolCallId }
			: {}),
		subagent_role: options.role,
	};
}

function buildInternalOperationMetadata(operationName: string): Record<string, unknown> {
	return {
		agent_role: operationName,
		execution_mode: 'internal',
		trace_kind: 'internal_operation',
		operation_name: operationName,
	};
}

function createTelemetryFactory(options: {
	projectName: string;
	traceKind: InstanceAiTraceContext['traceKind'];
	rootRun: InstanceAiTraceRun;
	actorRun: InstanceAiTraceRun;
	getActorRun?: () => InstanceAiTraceRun;
	baseMetadata: Record<string, unknown>;
	proxyConfig?: ServiceProxyConfig;
	baseTelemetry?: BuiltTelemetry;
}): (telemetryOptions: InstanceAiTelemetryOptions) => BuiltTelemetry | Telemetry {
	return (telemetryOptions) => {
		const actorRun = options.getActorRun?.() ?? options.actorRun;
		const agentRole = telemetryOptions.agentRole;
		const executionMode =
			telemetryOptions.executionMode ??
			(options.traceKind === 'background_subagent' ? 'background_subagent' : 'foreground');
		const metadata = toTelemetryMetadata(options.baseMetadata, telemetryOptions.metadata, {
			agent_role: agentRole,
			execution_mode: executionMode,
			trace_kind: options.traceKind,
			langsmith_trace_id: options.rootRun.traceId,
			langsmith_root_run_id: options.rootRun.id,
			langsmith_actor_run_id: actorRun.id,
		});
		const functionId = telemetryOptions.functionId ?? formatTelemetryFunctionId(agentRole);

		if (options.baseTelemetry) {
			return {
				...options.baseTelemetry,
				functionId,
				metadata,
				recordInputs: true,
				recordOutputs: true,
				runtimeRootSpanEnabled: false,
			};
		}

		return createLangSmithTelemetryBuilder(options.projectName, options.proxyConfig)
			.functionId(functionId)
			.metadata(metadata)
			.recordInputs(true)
			.recordOutputs(true)
			.runtimeRootSpan(false);
	};
}

function createLangSmithTelemetryBuilder(
	projectName: string,
	proxyConfig?: ServiceProxyConfig,
): LangSmithTelemetry {
	return new LangSmithTelemetry({
		project: projectName,
		transformExportedSpan: redactLangSmithTelemetrySpan,
		...(proxyConfig
			? {
					apiKey: '-',
					endpoint: proxyConfig.apiUrl,
					headers: proxyConfig.getAuthHeaders,
				}
			: {}),
	});
}

async function createProductOtelRuntime(
	projectName: string,
	proxyConfig?: ServiceProxyConfig,
): Promise<ProductOtelTraceRuntime> {
	const telemetry = await createLangSmithTelemetryBuilder(projectName, proxyConfig)
		.functionId('instance-ai.product')
		.metadata({})
		.recordInputs(true)
		.recordOutputs(true)
		.build();

	return {
		telemetry,
		spans: new Map(),
		contexts: new Map(),
	};
}

export async function createInstanceAiTraceContext(
	options: CreateInstanceAiTraceContextOptions,
): Promise<InstanceAiTraceContext | undefined> {
	if (!isLangSmithTracingEnabled(!!options.proxyConfig)) {
		return undefined;
	}

	ensureLangSmithTracingEnv();

	const projectName = options.projectName ?? DEFAULT_PROJECT_NAME;
	const baseMetadata = buildBaseMetadata(options);

	const createTraceRuns = async () => {
		const otelRuntime = await createProductOtelRuntime(projectName, options.proxyConfig);
		const traceContextRef: { current?: InstanceAiTraceContext } = {};
		const messageRun = startProductSpan(otelRuntime, {
			projectName,
			name: 'turn',
			canonicalName: 'instance-ai.message_turn',
			runType: 'chain',
			tags: ['message-turn'],
			metadata: mergeMetadata(baseMetadata, {
				agent_role: 'message_turn',
				execution_mode: 'foreground',
				trace_kind: 'message_turn',
			}),
			inputs: options.input,
			root: true,
		});
		const tracing = createTraceContext(
			projectName,
			'message_turn',
			messageRun,
			messageRun,
			otelRuntime,
			options.proxyConfig,
			createTelemetryFactory({
				projectName,
				traceKind: 'message_turn',
				rootRun: messageRun,
				actorRun: messageRun,
				getActorRun: () => traceContextRef.current?.actorRun ?? messageRun,
				baseMetadata,
				baseTelemetry: otelRuntime.telemetry,
				...(options.proxyConfig ? { proxyConfig: options.proxyConfig } : {}),
			}),
		);
		traceContextRef.current = tracing;
		return tracing;
	};

	try {
		if (options.proxyConfig) {
			const headers = await options.proxyConfig.getAuthHeaders();
			return await proxyHeaderStore.run(headers, createTraceRuns);
		}
		return await createTraceRuns();
	} catch {
		return undefined;
	}
}

export async function continueInstanceAiTraceContext(
	existingContext: InstanceAiTraceContext,
	options: CreateInstanceAiTraceContextOptions,
): Promise<InstanceAiTraceContext | undefined>;
export async function continueInstanceAiTraceContext(
	existingContext: InstanceAiTraceContext | undefined,
	options: CreateInstanceAiTraceContextOptions,
): Promise<InstanceAiTraceContext | undefined>;
export async function continueInstanceAiTraceContext(
	existingContext: InstanceAiTraceContext | undefined,
	options: CreateInstanceAiTraceContextOptions,
): Promise<InstanceAiTraceContext | undefined> {
	const proxyConfig = options.proxyConfig ?? existingContext?.proxyConfig;
	if (!existingContext && !isLangSmithTracingEnabled(!!proxyConfig)) {
		return undefined;
	}
	if (existingContext?.rootRun.traceId === 'stub' && !isLangSmithTracingEnabled(!!proxyConfig)) {
		return existingContext;
	}

	ensureLangSmithTracingEnv();

	const baseMetadata = buildBaseMetadata(options);
	const projectName = existingContext?.projectName ?? options.projectName ?? DEFAULT_PROJECT_NAME;
	const continuedMetadata =
		existingContext && existingContext.rootRun.traceId !== 'stub'
			? {
					continued_from_trace_id:
						existingContext.rootRun.otelTraceId ?? existingContext.rootRun.traceId,
					continued_from_run_id: existingContext.rootRun.id,
					resumed_from_trace_id:
						existingContext.rootRun.otelTraceId ?? existingContext.rootRun.traceId,
					...(existingContext.actorRun.otelSpanId
						? { resumed_from_span_id: existingContext.actorRun.otelSpanId }
						: {}),
					resumed_from_activation_id: existingContext.actorRun.id,
				}
			: {};

	const createContinuation = async () => {
		const otelRuntime = await createProductOtelRuntime(projectName, proxyConfig);
		const rootRun = startProductSpan(otelRuntime, {
			projectName,
			name: `resume: ${formatResumeReasonLabel(options.metadata?.resume_reason)}`,
			canonicalName: 'instance-ai.orchestrator_resume',
			runType: 'chain',
			tags: ['orchestrator-resume'],
			metadata: mergeMetadata(baseMetadata, {
				agent_role: 'orchestrator_resume',
				execution_mode: 'resume',
				trace_kind: 'orchestrator_resume',
				...continuedMetadata,
			}),
			inputs: options.input,
			root: true,
		});
		const orchestratorRun = startProductSpan(otelRuntime, {
			projectName,
			name: 'agent: orchestrator',
			canonicalName: 'instance-ai.agent.orchestrator',
			runType: 'chain',
			tags: ['orchestrator', 'resume'],
			metadata: mergeMetadata(baseMetadata, {
				agent_role: 'orchestrator',
				execution_mode: 'resume',
				trace_kind: 'orchestrator_resume',
				...continuedMetadata,
			}),
			inputs: options.input,
			parentRun: rootRun,
		});

		return createTraceContext(
			projectName,
			'orchestrator_resume',
			rootRun,
			orchestratorRun,
			otelRuntime,
			proxyConfig,
			createTelemetryFactory({
				projectName,
				traceKind: 'orchestrator_resume',
				rootRun,
				actorRun: orchestratorRun,
				baseMetadata,
				baseTelemetry: otelRuntime.telemetry,
				...(proxyConfig ? { proxyConfig } : {}),
			}),
		);
	};

	try {
		if (proxyConfig) {
			const headers = await proxyConfig.getAuthHeaders();
			return await proxyHeaderStore.run(headers, createContinuation);
		}
		return await createContinuation();
	} catch {
		return undefined;
	}
}

export async function createDetachedSubAgentTraceContext(
	options: CreateDetachedSubAgentTraceContextOptions,
): Promise<InstanceAiTraceContext | undefined> {
	if (!isLangSmithTracingEnabled(!!options.proxyConfig)) {
		return undefined;
	}

	ensureLangSmithTracingEnv();

	const projectName = options.projectName ?? DEFAULT_PROJECT_NAME;
	const baseMetadata = buildBaseMetadata(options);

	const createDetachedRuns = async () => {
		const otelRuntime = await createProductOtelRuntime(projectName, options.proxyConfig);
		const rootMetadata = buildDetachedSubAgentMetadata(options, true);
		const actorMetadata = buildDetachedSubAgentMetadata(options, false);
		const rootRun = startProductSpan(otelRuntime, {
			projectName,
			name: `background task: ${formatAgentRoleLabel(options.role)}`,
			canonicalName: 'instance-ai.background_subagent',
			runType: 'chain',
			tags: normalizeTags(
				['sub-agent', 'background'],
				options.plannedTaskId ? ['planned'] : undefined,
			),
			metadata: mergeMetadata(baseMetadata, rootMetadata),
			inputs: options.input,
			root: true,
		});
		const actorRun = startProductSpan(otelRuntime, {
			projectName,
			name: `agent: ${formatAgentRoleLabel(options.role)}`,
			canonicalName: `instance-ai.agent.${options.role}`,
			runType: 'chain',
			tags: normalizeTags(
				['sub-agent', 'background'],
				options.plannedTaskId ? ['planned'] : undefined,
			),
			metadata: mergeMetadata(baseMetadata, actorMetadata),
			inputs: options.input,
			parentRun: rootRun,
		});

		return createTraceContext(
			projectName,
			'background_subagent',
			rootRun,
			actorRun,
			otelRuntime,
			options.proxyConfig,
			createTelemetryFactory({
				projectName,
				traceKind: 'background_subagent',
				rootRun,
				actorRun,
				baseMetadata: mergeMetadata(baseMetadata, rootMetadata) ?? baseMetadata,
				baseTelemetry: otelRuntime.telemetry,
				...(options.proxyConfig ? { proxyConfig: options.proxyConfig } : {}),
			}),
		);
	};

	try {
		if (options.proxyConfig) {
			const headers = await options.proxyConfig.getAuthHeaders();
			return await proxyHeaderStore.run(headers, createDetachedRuns);
		}
		return await createDetachedRuns();
	} catch {
		return undefined;
	}
}

export async function createInternalOperationTraceContext(
	options: CreateInternalOperationTraceContextOptions,
): Promise<InstanceAiTraceContext | undefined> {
	if (!isInternalOperationTracingEnabled() || !isLangSmithTracingEnabled(!!options.proxyConfig)) {
		return undefined;
	}

	ensureLangSmithTracingEnv();

	const projectName = options.projectName ?? DEFAULT_PROJECT_NAME;
	const baseMetadata = buildBaseMetadata({
		...options,
		messageId: options.messageId ?? `internal:${options.operationName}:${options.runId}`,
		metadata: mergeMetadata(options.metadata, {
			operation_name: options.operationName,
		}),
	});

	const createInternalRuns = async () => {
		const otelRuntime = await createProductOtelRuntime(projectName, options.proxyConfig);
		const internalMetadata = buildInternalOperationMetadata(options.operationName);
		const rootRun = startProductSpan(otelRuntime, {
			projectName,
			name: `internal: ${formatInternalOperationLabel(options.operationName)}`,
			canonicalName: `instance-ai.internal.${options.operationName}`,
			runType: 'chain',
			tags: ['internal-operation'],
			metadata: mergeMetadata(baseMetadata, internalMetadata),
			inputs: options.input,
			root: true,
		});

		return createTraceContext(
			projectName,
			'internal_operation',
			rootRun,
			rootRun,
			otelRuntime,
			options.proxyConfig,
			createTelemetryFactory({
				projectName,
				traceKind: 'internal_operation',
				rootRun,
				actorRun: rootRun,
				baseMetadata: mergeMetadata(baseMetadata, internalMetadata) ?? baseMetadata,
				baseTelemetry: otelRuntime.telemetry,
				...(options.proxyConfig ? { proxyConfig: options.proxyConfig } : {}),
			}),
		);
	};

	try {
		if (options.proxyConfig) {
			const headers = await options.proxyConfig.getAuthHeaders();
			return await proxyHeaderStore.run(headers, createInternalRuns);
		}
		return await createInternalRuns();
	} catch {
		return undefined;
	}
}

import {
	LangSmithTelemetry,
	Telemetry,
	type AttributeValue,
	type BuiltTelemetry,
	type BuiltTool,
	type InterruptibleToolContext,
	type ToolContext,
} from '@n8n/agents';
import { isRecord } from '@n8n/utils';
import {
	ROOT_CONTEXT,
	SpanStatusCode,
	context as otelContext,
	trace as otelTrace,
} from '@opentelemetry/api';
import type { Context as OtelContext, Span as OtelApiSpan } from '@opentelemetry/api';
import { Client } from 'langsmith';
import { AsyncLocalStorage } from 'node:async_hooks';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, parse } from 'node:path';

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
import {
	formatAgentRoleLabel,
	formatInternalOperationLabel,
	formatResumeReasonLabel,
	formatTelemetryFunctionId,
	formatTraceLabel,
} from './trace-labels';
import {
	GEN_AI_COMPLETION,
	GEN_AI_PROMPT,
	mergeTraceInputs,
	redactLangSmithTelemetrySpan,
	sanitizeTracePayload,
	sanitizeTraceValue,
	serializeModelIdForTrace,
	toTelemetryAttributeValue,
	toTelemetryMetadata,
} from './trace-payloads';
import type { IdRemapper, TraceIndex, TraceWriter } from './trace-replay';
import { PURE_REPLAY_TOOLS } from './trace-replay';

export {
	buildAgentTraceInputs,
	redactLangSmithTelemetrySpan,
	serializeModelIdForTrace,
} from './trace-payloads';

const DEFAULT_PROJECT_NAME = 'instance-ai';
const DEFAULT_TAGS = ['instance-ai'];
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

interface ProductOtelTraceRuntime {
	telemetry: BuiltTelemetry;
	spans: Map<string, OtelApiSpan>;
	contexts: Map<string, OtelContext>;
	shutdown: boolean;
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
	options?: ProductSpanFinishOptions,
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

	if (options?.forceFlush === true) {
		await Telemetry.forceFlush(runtime.telemetry);
	}
}

async function finishProductSpanBestEffort(
	runtime: ProductOtelTraceRuntime,
	run: InstanceAiTraceRun,
	options?: ProductSpanFinishOptions,
): Promise<void> {
	try {
		await finishProductSpan(runtime, run, options);
	} catch {
		// Product tracing is best-effort and must not fail or mask agent execution.
	}
}

async function shutdownProductOtelRuntime(
	runtime: ProductOtelTraceRuntime,
	traceId: string,
): Promise<void> {
	if (runtime.shutdown) return;

	runtime.shutdown = true;
	runtime.spans.clear();
	runtime.contexts.clear();
	otelTraceRuntimes.delete(traceId);

	try {
		await Telemetry.shutdown(runtime.telemetry);
	} catch {
		// Product tracing is best-effort and must not fail or mask agent execution.
	}
}

async function withProxyHeaders<T>(
	proxyConfig: ServiceProxyConfig | undefined,
	fn: () => T | Promise<T>,
): Promise<T> {
	if (!proxyConfig) return await fn();

	const headers = await proxyConfig.getAuthHeaders();
	return await proxyHeaderStore.run(headers, fn);
}

async function withProxyHeadersBestEffort<T>(
	proxyConfig: ServiceProxyConfig | undefined,
	fn: () => T | Promise<T>,
): Promise<T> {
	if (!proxyConfig) return await fn();

	let headers: Record<string, string>;
	try {
		headers = await proxyConfig.getAuthHeaders();
	} catch {
		return await fn();
	}

	return await proxyHeaderStore.run(headers, fn);
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

function getActiveOtelContextWithSpan(expectedTraceId?: string): OtelContext | undefined {
	const activeContext = otelContext.active();
	const activeSpanContext = otelTrace.getSpan(activeContext)?.spanContext();
	if (!activeSpanContext) {
		return undefined;
	}
	if (expectedTraceId && activeSpanContext.traceId !== expectedTraceId) {
		return undefined;
	}
	return activeContext;
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

type NativeToolContext = ToolContext | InterruptibleToolContext;
type TraceableNativeTool = BuiltTool & { handler: NonNullable<BuiltTool['handler']> };
type ProductSpanFinishOptions = InstanceAiTraceRunFinishOptions & { forceFlush?: boolean };

function readBooleanEnvFlag(value: string | undefined): boolean | undefined {
	const normalized = value?.toLowerCase();
	if (normalized === 'true') return true;
	if (normalized === 'false') return false;
	return undefined;
}

function isLangSmithTracingEnabled(proxyAvailable = false): boolean {
	if (readBooleanEnvFlag(process.env.N8N_DIAGNOSTICS_ENABLED) === false) {
		return false;
	}

	const tracingFlag = readBooleanEnvFlag(
		process.env.LANGCHAIN_TRACING_V2 ?? process.env.LANGSMITH_TRACING,
	);
	if (tracingFlag === false) {
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
			tracingFlag === true,
	);
}

function isInternalOperationTracingEnabled(): boolean {
	return (
		process.env.N8N_INSTANCE_AI_TRACE_INTERNAL === 'true' ||
		process.env.N8N_INSTANCE_AI_TRACE_INCLUDE_INTERNAL === 'true'
	);
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

/**
 * Unconditionally remove the cached OTel runtime for a trace.
 * Call after run finalization (success or failure) so its OTel runtime can be
 * garbage-collected.
 */
export function releaseTraceClient(traceId: string): void {
	const runtime = otelTraceRuntimes.get(traceId);
	if (!runtime) {
		return;
	}

	void shutdownProductOtelRuntime(runtime, traceId);
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

	await withProxyHeaders(options.proxyConfig, call);
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

export async function withCurrentTraceSpan<T>(
	options: CurrentTraceSpanOptions<T>,
	fn: () => Promise<T>,
): Promise<T> {
	const currentProductTrace = getCurrentProductTrace();
	if (!currentProductTrace) {
		return await fn();
	}

	const activeParentContext = getActiveOtelContextWithSpan(
		currentProductTrace.currentRun.otelTraceId,
	);
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
		forceFlush?: boolean;
	},
): Promise<void> {
	const activeParentContext = getActiveOtelContextWithSpan(currentTrace.currentRun.otelTraceId);
	let childRun: InstanceAiTraceRun;
	try {
		childRun = startProductSpan(currentTrace.runtime, {
			projectName: currentTrace.currentRun.projectName,
			name: options.name,
			canonicalName: options.canonicalName,
			runType: options.runType ?? 'chain',
			tags: options.tags,
			metadata: mergeMetadata(currentTrace.currentRun.metadata, options.metadata),
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
		forceFlush: options.forceFlush,
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
							forceFlush: true,
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
			forceFlush: true,
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

	const startChildRun = async (
		parentRun: InstanceAiTraceRun,
		init: InstanceAiTraceRunInit,
	): Promise<InstanceAiTraceRun> =>
		await withProxyHeadersBestEffort(proxyConfig, () => {
			const activeParentContext = getActiveOtelContextWithSpan(parentRun.otelTraceId);
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
		await withProxyHeadersBestEffort(
			proxyConfig,
			async () => await withProductSpanContextBestEffort(otelRuntime, run, fn),
		);
	const withRunTree = withActiveSpan;

	const finishRun = async (
		run: InstanceAiTraceRun,
		finishOptions?: InstanceAiTraceRunFinishOptions,
	): Promise<void> => {
		const isRootRun = !run.parentRunId;
		await withProxyHeadersBestEffort(
			proxyConfig,
			async () =>
				await finishProductSpanBestEffort(
					otelRuntime,
					run,
					isRootRun ? { ...finishOptions, forceFlush: true } : finishOptions,
				),
		);
		if (isRootRun) {
			await withProxyHeadersBestEffort(
				proxyConfig,
				async () => await shutdownProductOtelRuntime(otelRuntime, run.traceId),
			);
		}
	};

	const failRun = async (
		run: InstanceAiTraceRun,
		error: unknown,
		metadata?: Record<string, unknown>,
	): Promise<void> => {
		const isRootRun = !run.parentRunId;
		await withProxyHeadersBestEffort(
			proxyConfig,
			async () =>
				await finishProductSpanBestEffort(otelRuntime, run, {
					error: normalizeErrorMessage(error),
					metadata,
					forceFlush: isRootRun,
				}),
		);
		if (isRootRun) {
			await withProxyHeadersBestEffort(
				proxyConfig,
				async () => await shutdownProductOtelRuntime(otelRuntime, run.traceId),
			);
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
			let capturedSuspendPayload: Record<string, unknown> | undefined;
			let recordedSuspend = false;
			const wrappedContext: NativeToolContext = isInterruptibleToolContext(context)
				? {
						...context,
						suspend: async (suspendPayload: unknown) => {
							capturedSuspendPayload = isRecord(suspendPayload) ? suspendPayload : {};
							traceWriter.recordToolSuspend(
								agentRole,
								tool.name,
								inputRecord,
								{},
								capturedSuspendPayload,
							);
							recordedSuspend = true;
							return await context.suspend(suspendPayload);
						},
					}
				: context;

			const result = await tool.handler(input, wrappedContext);
			const outputRecord = (result ?? {}) as Record<string, unknown>;

			if (resumeData !== undefined && resumeData !== null) {
				traceWriter.recordToolResume(
					agentRole,
					tool.name,
					inputRecord,
					outputRecord,
					resumeData as Record<string, unknown>,
				);
			} else if (capturedSuspendPayload) {
				if (!recordedSuspend) {
					traceWriter.recordToolSuspend(
						agentRole,
						tool.name,
						inputRecord,
						{},
						capturedSuspendPayload,
					);
				}
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

let traceRuntimeVersions: Promise<TraceRuntimeVersions> | undefined;

function extractPackageVersion(packageJson: unknown): string | undefined {
	if (!packageJson || typeof packageJson !== 'object') return undefined;

	if (!('version' in packageJson)) return undefined;

	const { version } = packageJson;
	return typeof version === 'string' ? version : undefined;
}

async function readPackageVersion(packageName: string): Promise<string | undefined> {
	try {
		return extractPackageVersion(hostRequire(`${packageName}/package.json`));
	} catch {
		// Some workspace packages do not export package.json. Fall back to
		// resolving the package entry point and walking upward to its package root.
	}

	try {
		let current = dirname(hostRequire.resolve(packageName));
		const { root } = parse(current);
		while (current !== root) {
			const packageJsonPath = join(current, 'package.json');
			try {
				return extractPackageVersion(JSON.parse(await readFile(packageJsonPath, 'utf8')));
			} catch {
				current = dirname(current);
			}
		}
	} catch {
		// Best effort only; traces still work without package version metadata.
	}

	return undefined;
}

async function getTraceRuntimeVersions(): Promise<TraceRuntimeVersions> {
	traceRuntimeVersions ??= (async () => {
		const [agentsVersion, workflowSdkVersion] = await Promise.all([
			readPackageVersion('@n8n/agents'),
			readPackageVersion('@n8n/workflow-sdk'),
		]);
		return {
			...(agentsVersion ? { agents_version: agentsVersion } : {}),
			...(workflowSdkVersion ? { workflow_sdk_version: workflowSdkVersion } : {}),
		};
	})();

	return await traceRuntimeVersions;
}

async function buildBaseMetadata(
	options: CreateInstanceAiTraceContextOptions,
): Promise<Record<string, unknown>> {
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
		...(await getTraceRuntimeVersions()),
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
		shutdown: false,
	};
}

function createProductTraceContext(options: {
	projectName: string;
	traceKind: InstanceAiTraceContext['traceKind'];
	rootRun: InstanceAiTraceRun;
	actorRun: InstanceAiTraceRun;
	otelRuntime: ProductOtelTraceRuntime;
	baseMetadata: Record<string, unknown>;
	proxyConfig?: ServiceProxyConfig;
	getActorRun?: () => InstanceAiTraceRun;
}): InstanceAiTraceContext {
	return createTraceContext(
		options.projectName,
		options.traceKind,
		options.rootRun,
		options.actorRun,
		options.otelRuntime,
		options.proxyConfig,
		createTelemetryFactory({
			projectName: options.projectName,
			traceKind: options.traceKind,
			rootRun: options.rootRun,
			actorRun: options.actorRun,
			...(options.getActorRun ? { getActorRun: options.getActorRun } : {}),
			baseMetadata: options.baseMetadata,
			baseTelemetry: options.otelRuntime.telemetry,
			...(options.proxyConfig ? { proxyConfig: options.proxyConfig } : {}),
		}),
	);
}

export async function createInstanceAiTraceContext(
	options: CreateInstanceAiTraceContextOptions,
): Promise<InstanceAiTraceContext | undefined> {
	if (!isLangSmithTracingEnabled(!!options.proxyConfig)) {
		return undefined;
	}

	const projectName = options.projectName ?? DEFAULT_PROJECT_NAME;
	const baseMetadata = await buildBaseMetadata(options);

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
		const tracing = createProductTraceContext({
			projectName,
			traceKind: 'message_turn',
			rootRun: messageRun,
			actorRun: messageRun,
			otelRuntime,
			baseMetadata,
			getActorRun: () => traceContextRef.current?.actorRun ?? messageRun,
			...(options.proxyConfig ? { proxyConfig: options.proxyConfig } : {}),
		});
		traceContextRef.current = tracing;
		return tracing;
	};

	try {
		return await withProxyHeaders(options.proxyConfig, createTraceRuns);
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

	const baseMetadata = await buildBaseMetadata(options);
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

		return createProductTraceContext({
			projectName,
			traceKind: 'orchestrator_resume',
			rootRun,
			actorRun: orchestratorRun,
			otelRuntime,
			baseMetadata,
			...(proxyConfig ? { proxyConfig } : {}),
		});
	};

	try {
		return await withProxyHeaders(proxyConfig, createContinuation);
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

	const projectName = options.projectName ?? DEFAULT_PROJECT_NAME;
	const baseMetadata = await buildBaseMetadata(options);

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

		return createProductTraceContext({
			projectName,
			traceKind: 'background_subagent',
			rootRun,
			actorRun,
			otelRuntime,
			baseMetadata: mergeMetadata(baseMetadata, rootMetadata) ?? baseMetadata,
			...(options.proxyConfig ? { proxyConfig: options.proxyConfig } : {}),
		});
	};

	try {
		return await withProxyHeaders(options.proxyConfig, createDetachedRuns);
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

	const projectName = options.projectName ?? DEFAULT_PROJECT_NAME;
	const baseMetadata = await buildBaseMetadata({
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

		return createProductTraceContext({
			projectName,
			traceKind: 'internal_operation',
			rootRun,
			actorRun: rootRun,
			otelRuntime,
			baseMetadata: mergeMetadata(baseMetadata, internalMetadata) ?? baseMetadata,
			...(options.proxyConfig ? { proxyConfig: options.proxyConfig } : {}),
		});
	};

	try {
		return await withProxyHeaders(options.proxyConfig, createInternalRuns);
	} catch {
		return undefined;
	}
}

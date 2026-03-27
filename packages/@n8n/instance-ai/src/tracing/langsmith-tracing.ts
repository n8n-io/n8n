import type { ToolsInput } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';
import type { ToolAction, ToolExecutionContext } from '@mastra/core/tools';
import { RunTree } from 'langsmith';
import { traceable, withRunTree as withLangSmithRunTree } from 'langsmith/traceable';

import type {
	InstanceAiToolTraceOptions,
	InstanceAiTraceContext,
	InstanceAiTraceRun,
	InstanceAiTraceRunFinishOptions,
	InstanceAiTraceRunInit,
} from '../types';
import { isRecord } from '../utils/stream-helpers';

const DEFAULT_PROJECT_NAME = 'instance-ai';
const DEFAULT_TAGS = ['instance-ai'];
const MAX_TRACE_DEPTH = 4;
const MAX_TRACE_STRING_LENGTH = 2_000;
const MAX_TRACE_ARRAY_ITEMS = 20;
const MAX_TRACE_OBJECT_KEYS = 30;

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
}

type TraceableMastraTool = ToolAction<
	unknown,
	unknown,
	unknown,
	unknown,
	ToolExecutionContext<unknown, unknown, unknown>,
	string,
	unknown
>;

function isLangSmithTracingEnabled(): boolean {
	const tracingFlag =
		process.env.LANGCHAIN_TRACING_V2 ?? process.env.LANGSMITH_TRACING ?? undefined;
	if (tracingFlag?.toLowerCase() === 'false') {
		return false;
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
				merged[key] = value;
			}
		}
	}
	return Object.keys(merged).length > 0 ? merged : undefined;
}

function truncateString(value: string): string {
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

function createTraceContext(
	projectName: string,
	messageRun: InstanceAiTraceRun,
	orchestratorRun: InstanceAiTraceRun,
): InstanceAiTraceContext {
	const startChildRun = async (
		parentRun: InstanceAiTraceRun,
		init: InstanceAiTraceRunInit,
	): Promise<InstanceAiTraceRun> => await createChildRun(parentRun, init);

	const withRunTree = async <T>(run: InstanceAiTraceRun, fn: () => Promise<T>): Promise<T> =>
		await withSerializedRunTree(run, fn);

	const finishRun = async (
		run: InstanceAiTraceRun,
		finishOptions?: InstanceAiTraceRunFinishOptions,
	): Promise<void> => await finishTraceRun(run, finishOptions);

	const failRun = async (
		run: InstanceAiTraceRun,
		error: unknown,
		metadata?: Record<string, unknown>,
	): Promise<void> =>
		await finishTraceRun(run, {
			error: normalizeErrorMessage(error),
			metadata,
		});

	return {
		projectName,
		messageRun,
		orchestratorRun,
		startChildRun,
		withRunTree,
		finishRun,
		failRun,
		toHeaders: (run) => hydrateRunTree(run).toHeaders(),
		wrapTools: (tools, traceOptions) => wrapTools(tools, traceOptions),
	};
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
	});
}

function isTraceableMastraTool(value: unknown): value is TraceableMastraTool {
	return (
		isRecord(value) &&
		typeof value.id === 'string' &&
		typeof value.description === 'string' &&
		(!('execute' in value) || typeof value.execute === 'function')
	);
}

function wrapToolExecute(
	tool: TraceableMastraTool,
	options: InstanceAiToolTraceOptions | undefined,
): TraceableMastraTool {
	if (
		typeof tool.execute !== 'function' ||
		tool.suspendSchema !== undefined ||
		tool.resumeSchema !== undefined
	) {
		return tool;
	}

	const tracedExecute = traceable(tool.execute, {
		name: `tool:${tool.id}`,
		run_type: 'tool',
		tags: normalizeTags(DEFAULT_TAGS, ['tool'], options?.tags),
		metadata: mergeMetadata(options?.metadata, {
			tool_name: tool.id,
			...(options?.agentRole ? { agent_role: options.agentRole } : {}),
		}),
		processInputs: (inputs) => sanitizeTracePayload(inputs),
		processOutputs: (outputs) => sanitizeTracePayload(outputs),
	});

	return createTool({
		id: tool.id,
		description: tool.description,
		inputSchema: tool.inputSchema,
		outputSchema: tool.outputSchema,
		suspendSchema: tool.suspendSchema,
		resumeSchema: tool.resumeSchema,
		requestContextSchema: tool.requestContextSchema,
		execute: async (input, context) => await tracedExecute(input, context),
		mastra: tool.mastra,
		requireApproval: tool.requireApproval,
		providerOptions: tool.providerOptions,
		toModelOutput: tool.toModelOutput,
		mcp: tool.mcp,
		onInputStart: tool.onInputStart,
		onInputDelta: tool.onInputDelta,
		onInputAvailable: tool.onInputAvailable,
		onOutput: tool.onOutput,
	});
}

function wrapTools(tools: ToolsInput, options?: InstanceAiToolTraceOptions): ToolsInput {
	const wrapped: ToolsInput = {};
	const entries: Array<[string, unknown]> = Object.entries(tools);

	for (const [name, tool] of entries) {
		const originalTool = tools[name];
		wrapped[name] = isTraceableMastraTool(tool) ? wrapToolExecute(tool, options) : originalTool;
	}

	return wrapped;
}

async function createRun(options: {
	projectName: string;
	name: string;
	runType?: string;
	tags?: string[];
	metadata?: Record<string, unknown>;
	inputs?: unknown;
}): Promise<InstanceAiTraceRun> {
	const runTree = new RunTree({
		name: options.name,
		run_type: options.runType ?? 'chain',
		project_name: options.projectName,
		tags: normalizeTags(DEFAULT_TAGS, options.tags),
		metadata: options.metadata,
		inputs: sanitizeTracePayload(options.inputs),
	});
	await runTree.postRun();
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
		options?.metadata,
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
		return await withLangSmithRunTree(runTree, fn);
	} finally {
		syncRunState(runState, runTree);
	}
}

function buildBaseMetadata(options: CreateInstanceAiTraceContextOptions): Record<string, unknown> {
	return {
		thread_id: options.threadId,
		conversation_id: options.conversationId ?? options.threadId,
		message_group_id: options.messageGroupId,
		message_id: options.messageId,
		run_id: options.runId,
		user_id: options.userId,
		...(options.modelId !== undefined ? { model_id: sanitizeTraceValue(options.modelId) } : {}),
		...options.metadata,
	};
}

export async function createInstanceAiTraceContext(
	options: CreateInstanceAiTraceContextOptions,
): Promise<InstanceAiTraceContext | undefined> {
	if (!isLangSmithTracingEnabled()) {
		return undefined;
	}

	ensureLangSmithTracingEnv();

	const projectName = options.projectName ?? DEFAULT_PROJECT_NAME;
	const baseMetadata = buildBaseMetadata(options);
	const messageRun = await createRun({
		projectName,
		name: 'message_turn',
		tags: ['message-turn'],
		metadata: mergeMetadata(baseMetadata, { agent_role: 'message_turn' }),
		inputs: options.input,
	});
	const orchestratorRun = await createChildRun(messageRun, {
		name: 'orchestrator',
		tags: ['orchestrator'],
		metadata: mergeMetadata(baseMetadata, { agent_role: 'orchestrator' }),
		inputs: options.input,
	});

	return createTraceContext(projectName, messageRun, orchestratorRun);
}

export async function continueInstanceAiTraceContext(
	existingContext: InstanceAiTraceContext,
	options: CreateInstanceAiTraceContextOptions,
): Promise<InstanceAiTraceContext> {
	const baseMetadata = buildBaseMetadata(options);
	const orchestratorRun = await createChildRun(existingContext.messageRun, {
		name: 'orchestrator',
		tags: ['orchestrator'],
		metadata: mergeMetadata(baseMetadata, { agent_role: 'orchestrator' }),
		inputs: options.input,
	});

	return createTraceContext(
		existingContext.projectName,
		existingContext.messageRun,
		orchestratorRun,
	);
}

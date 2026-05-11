import type { ProviderOptions } from '@ai-sdk/provider-utils';
import { generateText, streamText, Output } from 'ai';
import type { z } from 'zod';
import { zodToJsonSchema, type JsonSchema7Type } from 'zod-to-json-schema';

import { computeCost, getModelCost, type ModelCost } from '../sdk/catalog';
import { isLlmMessage } from '../sdk/message';
import type {
	AgentRunState,
	AnthropicThinkingConfig,
	AttributeValue,
	BuiltMemory,
	BuiltProviderTool,
	BuiltTelemetry,
	BuiltTool,
	CheckpointStore,
	FinishReason,
	GenerateResult,
	GoogleThinkingConfig,
	OpenAIThinkingConfig,
	PendingToolCall,
	RunOptions,
	SemanticRecallConfig,
	SerializableAgentState,
	StreamChunk,
	StreamResult,
	SubAgentUsage,
	ThinkingConfig,
	TitleGenerationConfig,
	TokenUsage,
	XaiThinkingConfig,
} from '../types';
import { AgentEventBus } from './event-bus';
import { toJsonValue } from './json-value';
import { saveMessagesToThread } from './memory-store';
import { AgentMessageList, type SerializedMessageList } from './message-list';
import { fromAiFinishReason, fromAiMessages } from './messages';
import { createEmbeddingModel, createModel } from './model-factory';
import { generateRunId, RunStateManager } from './run-state';
import {
	accumulateUsage,
	applySubAgentUsage,
	extractSettledToolCalls,
	makeErrorStream,
	normalizeInput,
} from './runtime-helpers';
import { convertChunk } from './stream';
import { stripOrphanedToolMessages } from './strip-orphaned-tool-messages';
import { generateThreadTitle } from './title-generation';
import {
	buildToolMap,
	executeTool,
	isAgentToolResult,
	isSuspendedToolResult,
	toAiSdkProviderTools,
	toAiSdkTools,
} from './tool-adapter';
import { buildWorkingMemoryTool } from './working-memory';
import { AgentEvent } from '../types/runtime/event';
import type { AgentEventData } from '../types/runtime/event';
import type {
	AgentPersistenceOptions,
	ExecutionOptions,
	ModelConfig,
	PersistedExecutionOptions,
	ToolResultEntry,
} from '../types/sdk/agent';
import type { AgentDbMessage, AgentMessage, ContentToolCall, Message } from '../types/sdk/message';
import type { JSONObject, JSONValue } from '../types/utils/json';
import { parseWithSchema } from '../utils/parse';
import { isZodSchema } from '../utils/zod';

interface TelemetrySpan {
	end(): void;
	recordException?(error: unknown): void;
	setAttributes?(attributes: Record<string, AttributeValue>): void;
	setStatus?(status: { code: number; message?: string }): void;
}

interface ActiveSpanTracer {
	startActiveSpan<T>(
		name: string,
		options: { attributes?: Record<string, AttributeValue> },
		fn: (span: TelemetrySpan) => T,
	): T;
}

function isActiveSpanTracer(value: unknown): value is ActiveSpanTracer {
	return (
		value !== null &&
		typeof value === 'object' &&
		typeof Reflect.get(value, 'startActiveSpan') === 'function'
	);
}

function stringifyTelemetryValue(value: unknown): string | undefined {
	try {
		return JSON.stringify(value);
	} catch {
		return undefined;
	}
}

function getToolInputSchema(tool: BuiltTool | BuiltProviderTool): unknown {
	if (!tool.inputSchema) {
		return undefined;
	}

	return isZodSchema(tool.inputSchema) ? zodToJsonSchema(tool.inputSchema) : tool.inputSchema;
}

function summarizeToolForTelemetry(tool: BuiltTool): Record<string, unknown> {
	return {
		name: tool.name,
		description: tool.description,
		type: tool.mcpTool ? 'mcp' : 'local',
		...(tool.mcpServerName ? { mcp_server: tool.mcpServerName } : {}),
		...(tool.suspendSchema || tool.resumeSchema || tool.withDefaultApproval
			? { approval: true }
			: {}),
		...(tool.inputSchema ? { input_schema: getToolInputSchema(tool) } : {}),
	};
}

function summarizeProviderToolForTelemetry(tool: BuiltProviderTool): Record<string, unknown> {
	const [provider] = tool.name.split('.');
	return {
		name: tool.name,
		provider,
		type: 'provider',
		args: tool.args,
		...(tool.inputSchema ? { input_schema: getToolInputSchema(tool) } : {}),
	};
}

function buildAgentRootInputAttributes(config: AgentRuntimeConfig): Record<string, AttributeValue> {
	const localTools = (config.tools ?? []).map(summarizeToolForTelemetry);
	const providerTools = (config.providerTools ?? []).map(summarizeProviderToolForTelemetry);
	const tools = [...localTools, ...providerTools];
	const toolNames = tools
		.map((tool) => (typeof tool.name === 'string' ? tool.name : undefined))
		.filter((name): name is string => name !== undefined);

	const serialized = stringifyTelemetryValue({
		agent: config.name,
		tool_count: tools.length,
		tools,
	});

	return {
		...(toolNames.length > 0 ? { 'langsmith.metadata.available_tools': toolNames } : {}),
		...(serialized ? { 'gen_ai.prompt': serialized } : {}),
	};
}

export interface AgentRuntimeConfig {
	name: string;
	model: ModelConfig;
	instructions: string;
	instructionProviderOptions?: ProviderOptions;
	tools?: BuiltTool[];
	providerTools?: BuiltProviderTool[];
	memory?: BuiltMemory;
	lastMessages?: number;
	workingMemory?: {
		template: string;
		structured: boolean;
		schema?: z.ZodObject<z.ZodRawShape>;
		scope?: 'resource' | 'thread';
		instruction?: string;
	};
	semanticRecall?: SemanticRecallConfig;
	structuredOutput?: z.ZodType;
	checkpointStorage?: 'memory' | CheckpointStore;
	thinking?: ThinkingConfig;
	eventBus?: AgentEventBus;
	/** Number of tool calls to execute concurrently. Default `1` (sequential). */
	toolCallConcurrency?: number;
	titleGeneration?: TitleGenerationConfig;
	telemetry?: BuiltTelemetry;
}

const MAX_LOOP_ITERATIONS = 20;

const EMPTY_MESSAGE_LIST: SerializedMessageList = {
	messages: [],
	historyIds: [],
	inputIds: [],
	responseIds: [],
};

/** Pending tool calls from a suspended run, passed into the loop to execute before the first LLM call. */
interface PendingResume {
	pendingToolCalls: Record<string, PendingToolCall>;
	/** The tool call being resumed with new data. */
	resumeToolCallId: string;
	resumeData: unknown;
	/** Message history for resolving tool names via findToolName(). */
	messages: AgentDbMessage[];
}

type ToolCallOutcome =
	| {
			outcome: 'success';
			toolEntry: ToolResultEntry;
			/**
			 * Output as the LLM sees it (after `toModelOutput`). Same as
			 * `toolEntry.output` when no `toModelOutput` transform is configured.
			 * Surfaced on the `tool-result` wire chunk so consumers see what the
			 * LLM saw (rather than the larger raw output).
			 */
			modelOutput: unknown;
			subAgentUsage?: SubAgentUsage[];
			customMessage?: AgentMessage;
	  }
	| {
			outcome: 'suspended';
			payload: unknown;
			resumeSchema: JsonSchema7Type;
	  }
	| { outcome: 'error'; error: unknown }
	| { outcome: 'noop' }; // tool call shouldn't be saved or logged anywhere, usually means that if was executed by AI SDK

/** A tool call that completed successfully. */
interface ToolCallSuccess {
	toolCallId: string;
	toolName: string;
	input: JSONValue;
	toolEntry: ToolResultEntry;
	modelOutput: unknown;
	subAgentUsage?: SubAgentUsage[];
	customMessage?: AgentMessage;
}

/** Info about a tool call that suspended (before persistence — no runId yet). */
interface ToolCallSuspension {
	toolCallId: string;
	toolName: string;
	input: JSONValue;
	payload: unknown;
	/** JSON Schema describing the shape of resume data, derived from the tool's resumeSchema. */
	resumeSchema: JsonSchema7Type;
}

/** Info about a tool call that failed — carries enough data for stream chunks. */
interface ToolCallError {
	toolCallId: string;
	toolName: string;
	input: JSONValue;
	error: unknown;
}

/** Result of executing a batch of tool calls (before persistence). */
interface ToolCallBatchResult {
	results: ToolCallSuccess[];
	suspensions: ToolCallSuspension[];
	errors: ToolCallError[];
	/** All items to persist: suspended tools (with suspendPayload) + unexecuted tools (without). */
	pending: Record<string, PendingToolCall>;
}

/** Shared input for the private generate/stream loops. */
interface LoopContext {
	list: AgentMessageList;
	options?: RunOptions & ExecutionOptions;
	runId: string;
	pendingResume?: PendingResume;
}

/** Shared input for the tool-call batch iterators. */
interface ToolBatchContext {
	toolMap: Map<string, BuiltTool>;
	list: AgentMessageList;
	runId: string;
	telemetry?: BuiltTelemetry;
}

/**
 * Core agent execution engine using the Vercel AI SDK directly.
 *
 * - `generate()` uses `generateText()` — no streaming internally.
 * - `stream()` uses `streamText()` — yields chunks in real time.
 *
 * Memory strategy:
 * - `filterLlmMessages` strips custom messages before sending to the LLM.
 * - Memory stores ALL AgentMessages (including custom) unchanged.
 * - New messages for each turn are tracked via AgentMessageList.turnDelta(),
 *   which uses Set-based source tracking to identify turn-only messages.
 *   The list serializes with a historyCount so it can survive process restarts.
 */
export class AgentRuntime {
	private config: AgentRuntimeConfig;

	private runState: RunStateManager;

	private eventBus: AgentEventBus;

	private currentState: SerializableAgentState;

	private modelCost: ModelCost | undefined;

	/** Resolved telemetry for the current run (own config or inherited from parent). */

	constructor(config: AgentRuntimeConfig) {
		this.config = config;
		this.runState = new RunStateManager(config.checkpointStorage);
		this.eventBus = config.eventBus ?? new AgentEventBus();
		this.currentState = {
			persistence: undefined,
			status: 'idle',
			messageList: EMPTY_MESSAGE_LIST,
			pendingToolCalls: {},
		};
	}

	/** Return the latest state snapshot. */
	getState(): SerializableAgentState {
		return { ...this.currentState };
	}

	/** Set the abort flag to cancel the currently running agent. */
	abort(): void {
		this.eventBus.abort();
	}

	/** Non-streaming: run the full agent loop using generateText and return the final result. */
	async generate(
		input: AgentMessage[] | string,
		options?: RunOptions & ExecutionOptions,
	): Promise<GenerateResult> {
		const runId = generateRunId();
		let list: AgentMessageList | undefined = undefined;
		try {
			const initializedList = await this.initRun(input, options);
			list = initializedList;
			const rawResult = await this.withTelemetryRootSpan(
				'generate',
				options,
				runId,
				async () => await this.runGenerateLoop({ list: initializedList, options, runId }),
			);
			return this.finalizeGenerate(rawResult, list, runId);
		} catch (error) {
			await this.flushTelemetry(options);
			const isAbort = this.eventBus.isAborted;
			this.updateState({ status: isAbort ? 'cancelled' : 'failed' });
			if (!isAbort) {
				this.eventBus.emit({ type: AgentEvent.Error, message: String(error), error });
			}
			return { runId, messages: list?.responseDelta() ?? [], finishReason: 'error', error };
		}
	}

	/** Streaming: run the agent loop using streamText, yielding chunks in real time. */
	async stream(
		input: AgentMessage[] | string,
		options?: RunOptions & ExecutionOptions,
	): Promise<StreamResult> {
		const runId = generateRunId();
		let list: AgentMessageList;
		try {
			list = await this.initRun(input, options);
		} catch (error) {
			const isAbort = this.eventBus.isAborted;
			this.updateState({ status: isAbort ? 'cancelled' : 'failed' });
			if (!isAbort) {
				this.eventBus.emit({ type: AgentEvent.Error, message: String(error), error });
			}
			return { runId, stream: makeErrorStream(error) };
		}

		return { runId, stream: this.startStreamLoop({ list, options, runId }) };
	}

	/**
	 * Resume a suspended tool call with arbitrary data.
	 * Restores the suspended run state, passes pending tool calls into the loop
	 * as pending tool calls, and delegates to the same generate/stream loop used for fresh runs.
	 *
	 * - `'generate'` — runs the generate loop after tool execution, returns `GenerateResult`.
	 * - `'stream'` — runs the stream loop after tool execution, returns `StreamResult`.
	 */
	async resume(
		method: 'generate',
		data: unknown,
		options: { runId: string; toolCallId: string } & ExecutionOptions,
	): Promise<GenerateResult>;
	async resume(
		method: 'stream',
		data: unknown,
		options: { runId: string; toolCallId: string } & ExecutionOptions,
	): Promise<StreamResult>;
	async resume(
		method: 'generate' | 'stream',
		data: unknown,
		options: { runId: string; toolCallId: string } & ExecutionOptions,
	): Promise<GenerateResult | StreamResult> {
		const state = await this.runState.resume(options.runId);
		if (!state) throw new Error(`No suspended run found for runId: ${options.runId}`);

		const toolCall = state.pendingToolCalls[options.toolCallId];
		if (!toolCall) throw new Error(`No tool call found for toolCallId: ${options.toolCallId}`);

		const tool = this.config.tools?.find((t) => t.name === toolCall.toolName);
		if (!tool) throw new Error(`Tool ${toolCall.toolName} not found`);

		let resumeData: unknown = data;
		if (tool.resumeSchema) {
			const parseResult = await parseWithSchema(tool.resumeSchema, data);
			if (!parseResult.success) {
				throw new Error(`Invalid resume payload: ${parseResult.error}`);
			}
			resumeData = parseResult.data as JSONValue;
		}

		try {
			const list = AgentMessageList.deserialize(state.messageList);

			// Merge persisted execution options with fresh caller options
			const { runId: _rid, toolCallId: _tcid, ...callerExecOptions } = options;
			const persisted = state.executionOptions ?? {};
			const mergedExecOptions: ExecutionOptions = {
				...persisted,
				...callerExecOptions,
			};

			const resumeOptions: RunOptions & ExecutionOptions = {
				persistence: state.persistence,
				...mergedExecOptions,
			};

			// Pass abortSignal to event bus
			this.eventBus.resetAbort(resumeOptions.abortSignal);

			const pendingResume: PendingResume = {
				pendingToolCalls: state.pendingToolCalls,
				resumeToolCallId: options.toolCallId,
				resumeData,
				messages: state.messageList.messages,
			};

			await this.ensureModelCost();

			// Attach working memory to the deserialized list — forLlm() needs it.
			await this.setListWorkingMemoryConfig(list, state.persistence);

			if (method === 'generate') {
				const rawResult = await this.withTelemetryRootSpan(
					'generate',
					resumeOptions,
					options.runId,
					async () =>
						await this.runGenerateLoop({
							list,
							options: resumeOptions,
							runId: options.runId,
							pendingResume,
						}),
				);
				if (!rawResult.pendingSuspend) {
					await this.cleanupRun(options.runId);
				}
				return this.finalizeGenerate(rawResult, list, options.runId);
			}

			return {
				runId: options.runId,
				stream: this.startStreamLoop({
					list,
					options: resumeOptions,
					runId: options.runId,
					pendingResume,
				}),
			};
		} catch (error) {
			const isAbort = this.eventBus.isAborted;
			this.updateState({ status: isAbort ? 'cancelled' : 'failed' });
			if (!isAbort) {
				this.eventBus.emit({ type: AgentEvent.Error, message: String(error), error });
			}
			if (method === 'generate') {
				return {
					runId: options.runId,
					messages: [],
					finishReason: 'error' as const,
					error,
				};
			}
			return { runId: options.runId, stream: makeErrorStream(error) };
		}
	}

	// --- Private ---

	/**
	 * Build an AgentMessageList for the current turn:
	 * - Loads memory history (if configured) and adds as historySet
	 * - Adds raw input (custom messages preserved) as inputSet
	 *
	 * The system prompt is NOT stored in the list; list.forLlm(instructions)
	 * prepends it at every LLM call site.
	 */
	private async buildMessageList(
		input: AgentMessage[],
		options?: RunOptions,
	): Promise<AgentMessageList> {
		const list = new AgentMessageList();

		if (this.config.memory && options?.persistence?.threadId) {
			const memMessages = await this.config.memory.getMessages(options.persistence.threadId, {
				limit: this.config.lastMessages ?? 10,
			});
			if (memMessages.length > 0) {
				list.addHistory(stripOrphanedToolMessages(memMessages));
			}
		}

		// Semantic recall — retrieve relevant past messages beyond the history window
		if (this.config.semanticRecall && options?.persistence?.threadId) {
			await this.performSemanticRecall(
				list,
				input,
				options.persistence.threadId,
				options.persistence.resourceId,
			);
		}

		// Attach working memory to the list — forLlm() appends it to the system prompt.
		await this.setListWorkingMemoryConfig(list, options?.persistence);

		list.addInput(input);
		return list;
	}

	/**
	 * Perform semantic recall: embed the user's query, search for relevant past messages,
	 * expand by messageRange, deduplicate against history, and inject into the list.
	 */
	private async performSemanticRecall(
		list: AgentMessageList,
		input: AgentMessage[],
		threadId: string,
		resourceId?: string,
	): Promise<void> {
		if (!this.config.semanticRecall || !this.config.memory) return;

		const userText = input
			.filter((m) => isLlmMessage(m) && m.role === 'user')
			.flatMap((m) => (isLlmMessage(m) ? m.content : []))
			.filter((c): c is { type: 'text'; text: string } => c.type === 'text')
			.map((c) => c.text)
			.join(' ');

		if (!userText) return;

		let recalled: AgentDbMessage[] = [];

		if (this.config.memory.queryEmbeddings && this.config.semanticRecall.embedder) {
			// Tier 3: runtime embeds the query, backend does vector search
			const { embed } = await import('ai');
			const embeddingModel = createEmbeddingModel(
				this.config.semanticRecall.embedder,
				this.config.semanticRecall.apiKey,
			);

			const { embedding } = await embed({ model: embeddingModel, value: userText });

			const hits = await this.config.memory.queryEmbeddings({
				scope: this.config.semanticRecall.scope ?? 'resource',
				threadId,
				resourceId,
				vector: embedding,
				topK: this.config.semanticRecall.topK,
			});

			if (hits.length > 0) {
				const hitIds = new Set(hits.map((h) => h.id));
				// TODO: add getMessagesByIds() to BuiltMemory to avoid loading all messages.
				const allMsgs = await this.config.memory.getMessages(threadId);

				if (this.config.semanticRecall.messageRange) {
					recalled = this.expandMessageRange(
						allMsgs,
						hitIds,
						this.config.semanticRecall.messageRange,
					);
				} else {
					recalled = allMsgs.filter((m) => {
						const id = m.id;
						return id !== undefined && hitIds.has(id);
					});
				}
			}
		} else if (this.config.memory.search) {
			// Fallback: high-level search (backend handles everything)
			recalled = await this.config.memory.search(userText, {
				threadId,
				resourceId,
				topK: this.config.semanticRecall.topK,
				messageRange: this.config.semanticRecall.messageRange,
			});
		}

		if (recalled.length === 0) return;

		// Deduplicate against already-loaded history by message ID
		const { historyIds } = list.serialize();
		const historyIdSet = new Set(historyIds);

		const newRecalled = recalled.filter((m) => {
			const id = m.id;
			return !id || !historyIdSet.has(id);
		});

		if (newRecalled.length > 0) {
			list.addHistory(newRecalled);
		}
	}

	/** Expand hit IDs by messageRange (before/after) within the ordered message list. */
	private expandMessageRange(
		allMsgs: AgentDbMessage[],
		hitIds: Set<string>,
		range: { before: number; after: number },
	): AgentDbMessage[] {
		const expandedIds = new Set<string>();
		for (const msg of allMsgs) {
			const id = 'id' in msg && typeof msg.id === 'string' ? msg.id : undefined;
			if (!id || !hitIds.has(id)) continue;
			const idx = allMsgs.indexOf(msg);
			const start = Math.max(0, idx - (range.before ?? 0));
			const end = Math.min(allMsgs.length - 1, idx + (range.after ?? 0));
			for (let i = start; i <= end; i++) {
				const el = allMsgs[i];
				const mid = 'id' in el && typeof el.id === 'string' ? el.id : undefined;
				if (mid) expandedIds.add(mid);
			}
		}
		return allMsgs.filter((m) => {
			const mid = 'id' in m && typeof m.id === 'string' ? m.id : undefined;
			return mid && expandedIds.has(mid);
		});
	}

	/**
	 * Common setup for generate() and stream(): reset abort state, transition to running,
	 * emit AgentStart, fetch model cost, normalize input, and build the message list.
	 * Throws if buildMessageList fails; callers catch and handle the error.
	 */
	private async initRun(
		input: AgentMessage[] | string,
		options?: RunOptions & ExecutionOptions,
	): Promise<AgentMessageList> {
		this.eventBus.resetAbort(options?.abortSignal);
		this.updateState({
			status: 'running',
			persistence: options?.persistence,
		});
		this.eventBus.emit({ type: AgentEvent.AgentStart });
		await this.ensureModelCost();
		const normalizedInput = normalizeInput(input);
		return await this.buildMessageList(normalizedInput, options);
	}

	/**
	 * Post-loop finalization for generate: apply cost, set model id, roll up sub-agent usage,
	 * transition to success, and emit AgentEnd. Returns the finalized result.
	 */
	private finalizeGenerate(
		result: GenerateResult,
		list: AgentMessageList,
		runId: string,
	): GenerateResult {
		result.runId = runId;
		result.usage = this.applyCost(result.usage);
		result.model = this.modelIdString;
		const finalized = applySubAgentUsage(result);
		this.updateState({ status: 'success', messageList: list.serialize() });
		this.eventBus.emit({ type: AgentEvent.AgentEnd, messages: finalized.messages });
		return finalized;
	}

	/** Resolve telemetry: own config wins, then inherited from options, then nothing. */
	private resolveTelemetry(options?: ExecutionOptions): BuiltTelemetry | undefined {
		if (this.config.telemetry) return this.config.telemetry;
		const inherited = options?.telemetry;
		if (!inherited) return undefined;
		return { ...inherited, functionId: this.config.name };
	}

	/** Best-effort flush of telemetry provider. Never throws. */
	private async flushTelemetry(options?: ExecutionOptions): Promise<void> {
		try {
			const resolved = this.resolveTelemetry(options);
			if (resolved?.provider) {
				await resolved.provider.forceFlush();
			}
		} catch {
			// Telemetry flush is best-effort — never block the response or mask the real error.
		}
	}

	/** Map resolved telemetry to AI SDK's experimental_telemetry shape. */
	private buildTelemetryOptions(options?: ExecutionOptions): Record<string, unknown> {
		const t = this.resolveTelemetry(options);
		if (!t?.enabled) return {};

		return {
			experimental_telemetry: {
				isEnabled: true,
				functionId: t.functionId ?? this.config.name,
				metadata: t.metadata,
				recordInputs: t.recordInputs,
				recordOutputs: t.recordOutputs,
				tracer: t.tracer,
				integrations: t.integrations.length > 0 ? t.integrations : undefined,
			},
		};
	}

	private buildTelemetryRootAttributes(
		t: BuiltTelemetry,
		spanName: string,
		runId: string,
	): Record<string, AttributeValue> {
		const metadataAttributes = this.buildTelemetryMetadataAttributes(t, 'langsmith.metadata');

		return {
			'langsmith.traceable': 'true',
			'langsmith.trace.name': spanName,
			'langsmith.span.kind': 'chain',
			'langsmith.metadata.agent_name': this.config.name,
			'langsmith.metadata.agent_run_id': runId,
			...metadataAttributes,
			...buildAgentRootInputAttributes(this.config),
		};
	}

	private buildTelemetryMetadataAttributes(
		t: BuiltTelemetry,
		prefix: string,
	): Record<string, AttributeValue> {
		return Object.fromEntries(
			Object.entries(t.metadata ?? {}).map(([key, value]) => [`${prefix}.${key}`, value]),
		);
	}

	private buildAiSdkOperationAttributes(
		operationId: string,
		t: BuiltTelemetry,
	): Record<string, AttributeValue> {
		const functionId = t.functionId ?? this.config.name;
		return {
			'operation.name': `${operationId} ${functionId}`,
			'resource.name': functionId,
			'ai.operationId': operationId,
			'ai.telemetry.functionId': functionId,
			...this.buildTelemetryMetadataAttributes(t, 'ai.telemetry.metadata'),
		};
	}

	private async withTelemetryRootSpan<T>(
		operation: 'generate' | 'stream',
		options: ExecutionOptions | undefined,
		runId: string,
		fn: () => Promise<T>,
	): Promise<T> {
		const t = this.resolveTelemetry(options);
		if (!t?.enabled || t.runtimeRootSpanEnabled === false || !isActiveSpanTracer(t.tracer)) {
			return await fn();
		}

		const spanName = `${t.functionId ?? this.config.name}.${operation}`;
		return await t.tracer.startActiveSpan(
			spanName,
			{ attributes: this.buildTelemetryRootAttributes(t, spanName, runId) },
			async (span) => {
				try {
					return await fn();
				} catch (error) {
					span.recordException?.(error);
					span.setStatus?.({ code: 2, message: String(error) });
					throw error;
				} finally {
					span.end();
				}
			},
		);
	}

	private async withTelemetryToolSpan<T>(
		toolCallId: string,
		toolName: string,
		input: JSONValue,
		t: BuiltTelemetry | undefined,
		fn: () => Promise<T>,
	): Promise<T> {
		if (!t?.enabled || !isActiveSpanTracer(t.tracer)) {
			return await fn();
		}

		const shouldRecordInputs = t.recordInputs ?? true;
		const inputValue = shouldRecordInputs ? stringifyTelemetryValue(input) : undefined;

		return await t.tracer.startActiveSpan(
			'ai.toolCall',
			{
				attributes: {
					...this.buildAiSdkOperationAttributes('ai.toolCall', t),
					'ai.toolCall.name': toolName,
					'ai.toolCall.id': toolCallId,
					...(inputValue !== undefined ? { 'ai.toolCall.args': inputValue } : {}),
				},
			},
			async (span) => {
				try {
					const result = await fn();
					const shouldRecordOutputs = t.recordOutputs ?? true;
					const outputValue = shouldRecordOutputs ? stringifyTelemetryValue(result) : undefined;
					if (outputValue !== undefined) {
						span.setAttributes?.({ 'ai.toolCall.result': outputValue });
					}
					return result;
				} catch (error) {
					span.recordException?.(error);
					span.setStatus?.({ code: 2, message: String(error) });
					throw error;
				} finally {
					span.end();
				}
			},
		);
	}

	/** Core generate loop using generateText (non-streaming). */
	private async runGenerateLoop(ctx: LoopContext): Promise<GenerateResult> {
		const { list, options, runId, pendingResume } = ctx;
		const {
			model,
			toolMap,
			aiTools,
			providerOptions,
			hasTools,
			outputSpec,
			effectiveInstructions,
		} = this.buildLoopContext({ ...options, persistence: options?.persistence });

		let totalUsage: TokenUsage | undefined;
		let lastFinishReason: FinishReason = 'stop';
		let structuredOutput: unknown;
		const toolCallSummary: ToolResultEntry[] = [];
		const collectedSubAgentUsage: SubAgentUsage[] = [];

		// Resolve pending tool calls from a resumed run before the first LLM call.
		const runTelemetry = this.resolveTelemetry(options);
		const toolCtx: ToolBatchContext = { toolMap, list, runId, telemetry: runTelemetry };

		if (pendingResume) {
			const batch = await this.iteratePendingToolCallsConcurrent({ ...toolCtx, pendingResume });

			for (const r of batch.results) {
				toolCallSummary.push(r.toolEntry);
				if (r.subAgentUsage) collectedSubAgentUsage.push(...r.subAgentUsage);
			}

			if (Object.keys(batch.pending).length > 0) {
				const suspendRunId = await this.persistSuspension(
					batch.pending,
					options,
					list,
					totalUsage,
					runId,
				);
				return {
					runId: suspendRunId,
					messages: list.responseDelta(),
					finishReason: 'tool-calls',
					usage: totalUsage,
					pendingSuspend: batch.suspensions.map((s) => ({
						runId: suspendRunId,
						toolCallId: s.toolCallId,
						toolName: s.toolName,
						input: s.input,
						suspendPayload: s.payload,
						resumeSchema: s.resumeSchema,
					})),
				};
			}
		}

		const maxIterations = options?.maxIterations ?? MAX_LOOP_ITERATIONS;
		for (let i = 0; i < maxIterations; i++) {
			if (this.eventBus.isAborted) {
				this.updateState({ status: 'cancelled' });
				throw new Error('Agent run was aborted');
			}

			this.eventBus.emit({ type: AgentEvent.TurnStart });

			const result = await generateText({
				model,
				messages: list.forLlm(effectiveInstructions, this.config.instructionProviderOptions),
				abortSignal: this.eventBus.signal,
				...(hasTools ? { tools: aiTools } : {}),
				...(providerOptions
					? { providerOptions: providerOptions as Record<string, JSONObject> }
					: {}),
				...(outputSpec ? { output: outputSpec } : {}),
				...this.buildTelemetryOptions(options),
			});

			const aiFinishReason = result.finishReason;
			lastFinishReason = fromAiFinishReason(aiFinishReason);

			totalUsage = accumulateUsage(totalUsage, result.usage);

			const responseMessages = result.response.messages;
			const newMessages = fromAiMessages(responseMessages);
			list.addResponse(newMessages);

			if (aiFinishReason !== 'tool-calls') {
				if (outputSpec) {
					structuredOutput = result.output;
				}
				this.emitTurnEnd(newMessages, extractSettledToolCalls(newMessages));
				break;
			}

			const batch = await this.iterateToolCallsConcurrent({
				...toolCtx,
				toolCalls: result.toolCalls,
			});

			for (const r of batch.results) {
				toolCallSummary.push(r.toolEntry);
				if (r.subAgentUsage) collectedSubAgentUsage.push(...r.subAgentUsage);
			}

			if (Object.keys(batch.pending).length > 0) {
				const suspendRunId = await this.persistSuspension(
					batch.pending,
					options,
					list,
					totalUsage,
					runId,
				);
				return {
					runId: suspendRunId,
					messages: list.responseDelta(),
					finishReason: 'tool-calls',
					usage: totalUsage,
					pendingSuspend: batch.suspensions.map((s) => ({
						runId: suspendRunId,
						toolCallId: s.toolCallId,
						toolName: s.toolName,
						input: s.input,
						suspendPayload: s.payload,
						resumeSchema: s.resumeSchema,
					})),
				};
			}

			// Emit TurnEnd after all tool calls in this iteration are processed
			this.emitTurnEnd(newMessages, extractSettledToolCalls(list.responseDelta()));
		}

		if (lastFinishReason === 'tool-calls') {
			throw new Error(
				`Agent loop exceeded ${maxIterations} iterations without reaching a stop condition`,
			);
		}

		await this.saveToMemory(list, options);
		await this.flushTelemetry(options);

		if (this.config.titleGeneration && options?.persistence?.threadId && this.config.memory) {
			const titlePromise = generateThreadTitle({
				memory: this.config.memory,
				threadId: options.persistence.threadId,
				resourceId: options.persistence.resourceId,
				titleConfig: this.config.titleGeneration,
				agentModel: this.config.model,
				turnDelta: list.turnDelta(),
			});
			if (this.config.titleGeneration.sync) {
				await titlePromise;
			}
		}

		return {
			runId: runId ?? '',
			messages: list.responseDelta(),
			finishReason: lastFinishReason,
			usage: totalUsage,
			...(structuredOutput !== undefined && { structuredOutput }),
			...(toolCallSummary.length > 0 && { toolCalls: toolCallSummary }),
			...(collectedSubAgentUsage.length > 0 && { subAgentUsage: collectedSubAgentUsage }),
		};
	}

	/**
	 * Wire up a ReadableStream and start the stream loop asynchronously.
	 * Returns the readable side immediately; the loop runs in the background.
	 */
	private startStreamLoop(ctx: LoopContext): ReadableStream<StreamChunk> {
		const { options, runId } = ctx;
		const { readable, writable } = new TransformStream<StreamChunk, StreamChunk>();
		const writer = writable.getWriter();

		// Bridge tool-execution lifecycle events into the stream so consumers
		// can show a mid-flight indicator between the LLM's tool-call message
		// and the eventual tool-result message. Writer queues writes in order
		// so the fire-and-forget is safe.
		const onToolExecutionStart = (data: AgentEventData): void => {
			if (data.type !== AgentEvent.ToolExecutionStart) return;
			// Swallow rejections: if the writer is already closed/errored (e.g.
			// an abort raced ahead of the subscription cleanup) there is nothing
			// useful to do with the chunk.
			writer
				.write({
					type: 'tool-execution-start',
					toolCallId: data.toolCallId,
					toolName: data.toolName,
				})
				.catch(() => {});
		};
		this.eventBus.on(AgentEvent.ToolExecutionStart, onToolExecutionStart);

		this.withTelemetryRootSpan(
			'stream',
			options,
			runId,
			async () => await this.runStreamLoop({ ...ctx, writer }),
		)
			.catch(async (error: unknown) => {
				await this.flushTelemetry(options);
				await this.cleanupRun(runId);
				try {
					await writer.write({ type: 'error', error });
					await writer.write({ type: 'finish', finishReason: 'error' });
					await writer.close();
				} catch {
					writer.abort(error).catch(() => {});
				}
			})
			.finally(() => {
				this.eventBus.off(AgentEvent.ToolExecutionStart, onToolExecutionStart);
			});

		return readable;
	}

	/** Core stream loop using streamText. */
	private async runStreamLoop(
		ctx: LoopContext & { writer: WritableStreamDefaultWriter<StreamChunk> },
	): Promise<void> {
		const { list, options, runId, pendingResume, writer } = ctx;
		const {
			model,
			toolMap,
			aiTools,
			providerOptions,
			hasTools,
			outputSpec,
			effectiveInstructions,
		} = this.buildLoopContext({ ...options, persistence: options?.persistence });

		const writeChunk = async (chunk: StreamChunk): Promise<void> => {
			await writer.write(chunk);
		};

		let totalUsage: TokenUsage | undefined;
		let lastFinishReason: FinishReason = 'stop';
		let structuredOutput: unknown;
		const collectedSubAgentUsage: SubAgentUsage[] = [];
		const maxIterations = options?.maxIterations ?? MAX_LOOP_ITERATIONS;

		const closeStreamWithError = async (error: unknown, status: AgentRunState): Promise<void> => {
			await this.cleanupRun(runId);
			this.updateState({ status });
			await writer.write({ type: 'error', error });
			await writer.write({ type: 'finish', finishReason: 'error' });
			await writer.close();
		};

		const handleAbort = async (): Promise<boolean> => {
			if (!this.eventBus.isAborted) return false;
			await closeStreamWithError(new Error('Agent run was aborted'), 'cancelled');
			return true;
		};

		// Resolve pending tool calls from a resumed run before the first LLM call.
		const runTelemetry = this.resolveTelemetry(options);
		const toolCtx: ToolBatchContext = { toolMap, list, runId, telemetry: runTelemetry };
		if (pendingResume) {
			try {
				const batch = await this.iteratePendingToolCallsConcurrent({
					...toolCtx,
					pendingResume,
				});

				for (const r of batch.results) {
					if (r.subAgentUsage) collectedSubAgentUsage.push(...r.subAgentUsage);
					await writer.write({
						type: 'tool-result',
						toolCallId: r.toolCallId,
						toolName: r.toolName,
						output: r.modelOutput,
					});
					if (r.customMessage) {
						await writer.write({ type: 'message', message: r.customMessage });
					}
				}

				for (const e of batch.errors) {
					await writer.write({
						type: 'tool-result',
						toolCallId: e.toolCallId,
						toolName: e.toolName,
						output: e.error,
						isError: true,
					});
				}

				if (Object.keys(batch.pending).length > 0) {
					const suspendRunId = await this.persistSuspension(
						batch.pending,
						options,
						list,
						totalUsage,
						runId,
					);
					for (const s of batch.suspensions) {
						await writer.write({
							type: 'tool-call-suspended',
							runId: suspendRunId,
							toolCallId: s.toolCallId,
							toolName: s.toolName,
							input: s.input,
							suspendPayload: s.payload,
							resumeSchema: s.resumeSchema,
						});
					}
					await writer.write({ type: 'finish', finishReason: 'tool-calls' });
					await writer.close();
					return;
				}
			} catch (error) {
				this.eventBus.emit({ type: AgentEvent.Error, message: String(error), error });
				await closeStreamWithError(error, 'failed');
				return;
			}
		}

		for (let i = 0; i < maxIterations; i++) {
			if (await handleAbort()) return;

			this.eventBus.emit({ type: AgentEvent.TurnStart });
			const messages = list.forLlm(effectiveInstructions, this.config.instructionProviderOptions);
			const result = streamText({
				model,
				messages,
				abortSignal: this.eventBus.signal,
				...(hasTools ? { tools: aiTools } : {}),
				...(providerOptions
					? { providerOptions: providerOptions as Record<string, JSONObject> }
					: {}),
				...(outputSpec ? { output: outputSpec } : {}),
				...this.buildTelemetryOptions(options),
			});

			// Consume the stream. When the AbortSignal fires mid-stream the
			// AI SDK cancels the underlying fetch and the async iterator throws.
			// We catch that here and close the consumer stream with an error chunk.
			try {
				for await (const chunk of result.fullStream) {
					// Filter only the SDK's terminal `finish` chunk — the runtime
					// emits its own consolidated `finish` after the loop completes.
					// `start-step` / `finish-step` are passed through so consumers
					// can use them as LLM-iteration boundaries.
					if (chunk.type === 'finish') continue;
					const converted = convertChunk(chunk);
					if (converted) await writeChunk(converted);
				}
			} catch (streamError) {
				if (await handleAbort()) return;
				this.eventBus.emit({
					type: AgentEvent.Error,
					message: String(streamError),
					error: streamError,
				});
				await closeStreamWithError(streamError, 'failed');
				return;
			}

			if (await handleAbort()) return;

			const aiFinishReason = await result.finishReason;
			const usage = await result.usage;
			const response = await result.response;

			lastFinishReason = fromAiFinishReason(aiFinishReason);

			totalUsage = accumulateUsage(totalUsage, usage);

			const responseMessages = response.messages;
			const newMessages = fromAiMessages(responseMessages);
			list.addResponse(newMessages);

			if (aiFinishReason !== 'tool-calls') {
				if (outputSpec) {
					structuredOutput = await result.output;
				}
				this.emitTurnEnd(newMessages, extractSettledToolCalls(newMessages));
				break;
			}

			const toolCalls = await result.toolCalls;

			try {
				const batch = await this.iterateToolCallsConcurrent({ ...toolCtx, toolCalls });

				if (await handleAbort()) return;

				for (const r of batch.results) {
					if (r.subAgentUsage) collectedSubAgentUsage.push(...r.subAgentUsage);
					await writer.write({
						type: 'tool-result',
						toolCallId: r.toolCallId,
						toolName: r.toolName,
						output: r.modelOutput,
					});
					if (r.customMessage) {
						await writer.write({ type: 'message', message: r.customMessage });
					}
				}

				for (const e of batch.errors) {
					await writer.write({
						type: 'tool-result',
						toolCallId: e.toolCallId,
						toolName: e.toolName,
						output: e.error,
						isError: true,
					});
				}

				if (Object.keys(batch.pending).length > 0) {
					const suspendRunId = await this.persistSuspension(
						batch.pending,
						options,
						list,
						totalUsage,
						runId,
					);
					for (const s of batch.suspensions) {
						await writer.write({
							type: 'tool-call-suspended',
							runId: suspendRunId,
							toolCallId: s.toolCallId,
							toolName: s.toolName,
							input: s.input,
							suspendPayload: s.payload,
							resumeSchema: s.resumeSchema,
						});
					}
					await writer.write({ type: 'finish', finishReason: 'tool-calls' });
					await writer.close();
					return;
				}
			} catch (error) {
				this.eventBus.emit({ type: AgentEvent.Error, message: String(error), error });
				await closeStreamWithError(error, 'failed');
				return;
			}

			// Emit TurnEnd after all tool calls in this iteration are processed
			this.emitTurnEnd(newMessages, extractSettledToolCalls(list.responseDelta()));
		}

		const costUsage = this.applyCost(totalUsage);
		const parentCost = costUsage?.cost ?? 0;
		const subCost = collectedSubAgentUsage.reduce((sum, s) => sum + (s.usage.cost ?? 0), 0);
		await writer.write({
			type: 'finish',
			finishReason: lastFinishReason,
			...(costUsage && { usage: costUsage }),
			model: this.modelIdString,
			...(structuredOutput !== undefined && { structuredOutput }),
			...(collectedSubAgentUsage.length > 0 && {
				subAgentUsage: collectedSubAgentUsage,
				totalCost: parentCost + subCost,
			}),
		});

		try {
			await this.saveToMemory(list, options);

			if (this.config.titleGeneration && options?.persistence && this.config.memory) {
				const titlePromise = generateThreadTitle({
					memory: this.config.memory,
					threadId: options.persistence.threadId,
					resourceId: options.persistence.resourceId,
					titleConfig: this.config.titleGeneration,
					agentModel: this.config.model,
					turnDelta: list.turnDelta(),
				});
				if (this.config.titleGeneration.sync) {
					await titlePromise;
				}
			}

			await this.cleanupRun(runId);
			await this.flushTelemetry(options);

			this.updateState({ status: 'success', messageList: list.serialize() });
			this.eventBus.emit({ type: AgentEvent.AgentEnd, messages: list.responseDelta() });
		} finally {
			await writer.close();
		}
	}

	/** Persist the current-turn delta to memory. */
	private async saveToMemory(
		list: AgentMessageList,
		options: RunOptions | undefined,
	): Promise<void> {
		if (!this.config.memory || !options?.persistence) return;
		const delta = list.turnDelta();
		if (delta.length === 0) return;
		await saveMessagesToThread(
			this.config.memory,
			options.persistence.threadId,
			options.persistence.resourceId,
			delta,
		);

		// Generate and save embeddings if semantic recall is configured
		if (this.config.semanticRecall?.embedder && this.config.memory.saveEmbeddings) {
			await this.saveEmbeddingsForMessages(
				options.persistence.threadId,
				options.persistence.resourceId,
				delta,
			);
		}
	}

	private async saveEmbeddingsForMessages(
		threadId: string,
		resourceId: string | undefined,
		messages: AgentDbMessage[],
	): Promise<void> {
		// Extract text from user and assistant messages
		const embeddable: Array<{ id: string; text: string }> = [];
		for (const msg of messages) {
			if (!isLlmMessage(msg) || (msg.role !== 'user' && msg.role !== 'assistant')) continue;
			const text = msg.content
				.filter((c): c is { type: 'text'; text: string } => c.type === 'text')
				.map((c) => c.text)
				.join('\n');
			if (!text) continue;
			embeddable.push({ id: msg.id, text });
		}

		if (embeddable.length === 0) return;

		const embedder = this.config.semanticRecall?.embedder;
		if (!embedder) return;

		const { embedMany } = await import('ai');
		const embeddingModel = createEmbeddingModel(embedder, this.config.semanticRecall?.apiKey);

		const { embeddings } = await embedMany({
			model: embeddingModel,
			values: embeddable.map((e) => e.text),
		});

		await this.config.memory!.saveEmbeddings!({
			scope: this.config.semanticRecall?.scope ?? 'resource',
			threadId,
			resourceId,
			entries: embeddable.map((e, i) => ({
				id: e.id,
				vector: embeddings[i],
				text: e.text,
				model: embedder,
			})),
		});
	}

	/** Build the providerOptions object for thinking/reasoning config. */
	private buildThinkingProviderOptions(): Record<string, Record<string, unknown>> | undefined {
		if (!this.config.thinking) return undefined;

		const provider = this.modelIdString.split('/')[0];
		const thinking = this.config.thinking;

		switch (provider) {
			case 'anthropic': {
				const cfg = thinking as AnthropicThinkingConfig;
				return {
					anthropic: {
						thinking: {
							type: 'enabled',
							budgetTokens: cfg.budgetTokens ?? 10000,
						},
					},
				};
			}
			case 'openai': {
				const cfg = thinking as OpenAIThinkingConfig;
				return { openai: { reasoningEffort: cfg.reasoningEffort ?? 'medium' } };
			}
			case 'google': {
				const cfg = thinking as GoogleThinkingConfig;
				return {
					google: {
						thinkingConfig: {
							...(cfg.thinkingBudget !== undefined && { thinkingBudget: cfg.thinkingBudget }),
							...(cfg.thinkingLevel !== undefined && { thinkingLevel: cfg.thinkingLevel }),
						},
					},
				};
			}
			case 'xai': {
				const cfg = thinking as XaiThinkingConfig;
				return { xai: { reasoningEffort: cfg.reasoningEffort ?? 'high' } };
			}
			default:
				return undefined;
		}
	}

	/**
	 * Deep-merge thinking providerOptions with caller-supplied providerOptions.
	 * Per-provider keys are merged shallowly so `.thinking()` + cache control coexist.
	 */
	private buildCallProviderOptions(
		runProviderOptions?: ProviderOptions,
	): Record<string, Record<string, unknown>> | undefined {
		const thinkingOpts = this.buildThinkingProviderOptions();
		if (!thinkingOpts && !runProviderOptions) return undefined;
		if (!thinkingOpts) return runProviderOptions as Record<string, Record<string, unknown>>;
		if (!runProviderOptions) return thinkingOpts;

		const merged: Record<string, Record<string, unknown>> = { ...thinkingOpts };
		for (const [provider, opts] of Object.entries(runProviderOptions)) {
			if (provider in merged) {
				merged[provider] = { ...merged[provider], ...(opts as Record<string, unknown>) };
			} else {
				merged[provider] = opts as Record<string, unknown>;
			}
		}
		return merged;
	}

	/**
	 * Execute tool calls concurrently in batches of `this.concurrency`.
	 * Provider-executed calls are skipped.
	 *
	 * Returns successes, suspension info, and a pending map (for persistence).
	 * The caller is responsible for persisting the pending map if non-empty.
	 *
	 * When any tool in a batch suspends, processing stops — unexecuted tools
	 * from later batches are added to the pending map without a `suspendPayload`.
	 * A Set of IDs tracks which tools have not yet been executed.
	 *
	 * Error handling: Promise.allSettled waits for all in-flight tools to finish
	 * even if one throws, then re-throws the first error.
	 */
	private async iterateToolCallsConcurrent(
		ctx: ToolBatchContext & {
			toolCalls: Array<{
				toolCallId: string;
				toolName: string;
				input: unknown;
				providerExecuted?: boolean;
			}>;
		},
	): Promise<ToolCallBatchResult> {
		const { toolCalls, toolMap, list, runId, telemetry: resolvedTelemetry } = ctx;
		const executableCalls = toolCalls.filter((tc) => !tc.providerExecuted);
		const executableCallsById = new Map(executableCalls.map((tc) => [tc.toolCallId, tc]));
		const unexecutedIds = new Set(executableCalls.map((tc) => tc.toolCallId));
		const batchSize = this.concurrency;
		const results: ToolCallSuccess[] = [];
		const suspensions: ToolCallSuspension[] = [];
		const errors: ToolCallError[] = [];
		const pending: Record<string, PendingToolCall> = {};

		for (let batchStart = 0; batchStart < executableCalls.length; batchStart += batchSize) {
			if (this.eventBus.isAborted) {
				this.updateState({ status: 'cancelled' });
				throw new Error('Agent run was aborted');
			}

			const batch = executableCalls.slice(batchStart, batchStart + batchSize);

			const settledResults = await Promise.allSettled(
				batch.map(
					async (tc) =>
						await this.processToolCall(
							tc.toolCallId,
							tc.toolName,
							tc.input as JSONValue,
							toolMap,
							list,
							undefined,
							resolvedTelemetry,
						),
				),
			);

			for (const tc of batch) {
				unexecutedIds.delete(tc.toolCallId);
			}

			let hasSuspension = false;

			for (let i = 0; i < settledResults.length; i++) {
				const result = settledResults[i];
				const tc = batch[i];
				const toolInput = tc.input as JSONValue;

				if (result.status === 'rejected') {
					list.setToolCallError(tc.toolCallId, result.reason);
					errors.push({
						toolCallId: tc.toolCallId,
						toolName: tc.toolName,
						input: toolInput,
						error: result.reason,
					});
				} else if (result.value.outcome === 'suspended') {
					hasSuspension = true;
					suspensions.push({
						toolCallId: tc.toolCallId,
						toolName: tc.toolName,
						input: toolInput,
						payload: result.value.payload,
						resumeSchema: result.value.resumeSchema,
					});
					pending[tc.toolCallId] = {
						suspended: true,
						toolCallId: tc.toolCallId,
						toolName: tc.toolName,
						input: toolInput,
						suspendPayload: result.value.payload,
						resumeSchema: result.value.resumeSchema,
						runId,
					};
				} else if (result.value.outcome === 'success') {
					results.push({
						toolCallId: tc.toolCallId,
						toolName: tc.toolName,
						input: toolInput,
						toolEntry: result.value.toolEntry,
						modelOutput: result.value.modelOutput,
						subAgentUsage: result.value.subAgentUsage,
						customMessage: result.value.customMessage,
					});
				} else if (result.value.outcome === 'error') {
					errors.push({
						toolCallId: tc.toolCallId,
						toolName: tc.toolName,
						input: toolInput,
						error: result.value.error,
					});
				} else if (result.value.outcome === 'noop') {
					// noop
				}
			}

			if (hasSuspension) {
				for (const id of unexecutedIds) {
					const tc = executableCallsById.get(id)!;
					pending[tc.toolCallId] = {
						suspended: false,
						toolCallId: tc.toolCallId,
						toolName: tc.toolName,
						input: tc.input as JSONValue,
					};
				}
				break;
			}
		}

		return { results, suspensions, errors, pending };
	}

	/**
	 * Resume flow: re-execute the targeted tool call, then process remaining items.
	 *
	 * 1. Execute the resumed tool (with `resumeData`). If it re-suspends, add to pending.
	 * 2. For remaining items:
	 *    - Already suspended (has `suspendPayload`) → carry forward into pending.
	 *    - Unexecuted (no `suspendPayload`) → execute via `iterateToolCallsConcurrent`.
	 *
	 * Returns a `ToolCallBatchResult` — the caller handles persistence.
	 */
	private async iteratePendingToolCallsConcurrent(
		ctx: ToolBatchContext & { pendingResume: PendingResume },
	): Promise<ToolCallBatchResult> {
		const { pendingResume, toolMap, list, runId, telemetry: resolvedTelemetry } = ctx;
		const resumedId = pendingResume.resumeToolCallId;
		const resumedEntry = pendingResume.pendingToolCalls[resumedId];
		if (!resumedEntry) {
			throw new Error(`No pending tool call found for toolCallId: ${resumedId}`);
		}

		const resumedToolName = resumedEntry.toolName;
		const results: ToolCallSuccess[] = [];
		const suspensions: ToolCallSuspension[] = [];
		const errors: ToolCallError[] = [];
		const pending: Record<string, PendingToolCall> = {};

		// 1. Execute the resumed tool
		const processResult = await this.processToolCall(
			resumedEntry.toolCallId,
			resumedToolName,
			resumedEntry.input,
			toolMap,
			list,
			pendingResume.resumeData,
			resolvedTelemetry,
		);

		if (processResult.outcome === 'suspended') {
			pending[resumedId] = {
				...resumedEntry,
				suspended: true,
				suspendPayload: processResult.payload,
				resumeSchema: processResult.resumeSchema,
				runId,
			};
			suspensions.push({
				toolCallId: resumedId,
				toolName: resumedToolName,
				input: resumedEntry.input,
				payload: processResult.payload,
				resumeSchema: processResult.resumeSchema,
			});
		} else if (processResult.outcome === 'success') {
			results.push({
				toolCallId: resumedEntry.toolCallId,
				toolName: resumedToolName,
				input: resumedEntry.input,
				toolEntry: processResult.toolEntry,
				modelOutput: processResult.modelOutput,
				subAgentUsage: processResult.subAgentUsage,
				customMessage: processResult.customMessage,
			});
		} else if (processResult.outcome === 'error') {
			errors.push({
				toolCallId: resumedEntry.toolCallId,
				toolName: resumedToolName,
				input: resumedEntry.input,
				error: processResult.error,
			});
		} else if (processResult.outcome === 'noop') {
			// noop
		}

		// 2. Process remaining items
		const unexecuted: Array<{ toolCallId: string; toolName: string; input: unknown }> = [];

		for (const [id, entry] of Object.entries(pendingResume.pendingToolCalls)) {
			if (id === resumedId) continue;

			const entryToolName = entry.toolName;

			if (entry.suspended) {
				// Already suspended — carry forward
				pending[id] = entry;
				suspensions.push({
					toolCallId: id,
					toolName: entryToolName,
					input: entry.input,
					payload: entry.suspendPayload,
					resumeSchema: entry.resumeSchema,
				});
			} else {
				// Unexecuted — collect for batch execution
				unexecuted.push({
					toolCallId: id,
					toolName: entryToolName,
					input: entry.input,
				});
			}
		}

		// Execute unexecuted tools via iterateToolCallsConcurrent
		if (unexecuted.length > 0) {
			const batch = await this.iterateToolCallsConcurrent({
				toolCalls: unexecuted,
				toolMap,
				list,
				runId,
				telemetry: resolvedTelemetry,
			});
			results.push(...batch.results);
			suspensions.push(...batch.suspensions);
			errors.push(...batch.errors);
			Object.assign(pending, batch.pending);
		}

		return { results, suspensions, errors, pending };
	}

	/**
	 * Execute a single tool call, emit lifecycle events, record the result in the
	 * message list, and return the outcome. The caller is responsible for writing
	 * any stream chunks and for handling suspension (building pendingToolCalls and
	 * persisting state).
	 *
	 * On tool execution errors, emits ToolExecutionEnd with isError=true, adds an
	 * error tool-result message to the list so the LLM can self-correct, and returns
	 * `{ outcome: 'error' }` — never re-throws.
	 */
	private async processToolCall(
		toolCallId: string,
		toolName: string,
		toolInput: JSONValue,
		toolMap: Map<string, BuiltTool>,
		list: AgentMessageList,
		resumeData?: unknown,
		resolvedTelemetry?: BuiltTelemetry,
	): Promise<ToolCallOutcome> {
		const builtTool = toolMap.get(toolName);

		this.eventBus.emit({
			type: AgentEvent.ToolExecutionStart,
			toolCallId,
			toolName,
			args: toolInput,
		});

		const makeToolError = (error: unknown): ToolCallOutcome => {
			this.eventBus.emit({
				type: AgentEvent.ToolExecutionEnd,
				toolCallId,
				toolName,
				result: error,
				isError: true,
			});
			list.setToolCallError(toolCallId, error);
			return { outcome: 'error', error };
		};

		if (!builtTool) {
			return makeToolError(new Error(`Tool ${toolName} not found`));
		}

		// Check if this tool-call block was already settled (e.g. by provider-executed tools).
		// If so, emit ToolExecutionEnd and skip re-execution.
		type SettledToolCall = ContentToolCall & { state: 'resolved' | 'rejected' };
		const settledBlock = list
			.responseDelta()
			.flatMap((m) => (isLlmMessage(m) && 'content' in m ? (m as Message).content : []))
			.find(
				(c): c is SettledToolCall =>
					c.type === 'tool-call' && c.toolCallId === toolCallId && c.state !== 'pending',
			);

		if (settledBlock) {
			let settledResult: unknown;
			if (settledBlock.state === 'resolved') {
				settledResult = settledBlock.output;
			} else {
				settledResult = settledBlock.error;
			}
			this.eventBus.emit({
				type: AgentEvent.ToolExecutionEnd,
				toolCallId,
				toolName,
				result: settledResult,
				isError: settledBlock.state === 'rejected',
			});
			return { outcome: 'noop' };
		}

		if (builtTool.inputSchema) {
			const result = await parseWithSchema(builtTool.inputSchema, toolInput);
			if (!result.success) {
				return makeToolError(new Error(`Invalid tool input: ${result.error}`));
			}
			toolInput = result.data as JSONValue;
		}

		let toolResult: unknown;
		try {
			toolResult = await this.withTelemetryToolSpan(
				toolCallId,
				toolName,
				toolInput,
				resolvedTelemetry,
				async () =>
					await executeTool(toolInput, builtTool, resumeData, resolvedTelemetry, toolCallId),
			);
		} catch (error) {
			return makeToolError(error as Error);
		}

		if (isSuspendedToolResult(toolResult)) {
			if (builtTool?.suspendSchema) {
				const parseResult = await parseWithSchema(builtTool.suspendSchema, toolResult.payload);
				if (!parseResult.success) {
					return makeToolError(new Error(`Invalid suspend payload: ${parseResult.error}`));
				}
				toolResult.payload = parseResult.data as JSONValue;
			}
			if (!builtTool?.resumeSchema) {
				const error = new Error(`Tool ${toolName} has no resume schema`);
				return makeToolError(error);
			}
			const resumeSchema = isZodSchema(builtTool.resumeSchema)
				? zodToJsonSchema(builtTool.resumeSchema)
				: builtTool.resumeSchema;
			if (!resumeSchema) {
				return makeToolError(new Error('Invalid resume schema'));
			}
			return {
				outcome: 'suspended',
				payload: toolResult.payload,
				resumeSchema,
			};
		}

		let actualResult = toolResult;
		let extractedSubAgentUsage: SubAgentUsage[] | undefined;
		if (isAgentToolResult(toolResult)) {
			actualResult = toolResult.output;
			extractedSubAgentUsage = toolResult.subAgentUsage;
		}

		this.eventBus.emit({
			type: AgentEvent.ToolExecutionEnd,
			toolCallId,
			toolName,
			result: actualResult,
			isError: false,
		});

		// Apply toModelOutput transform: the raw result goes to history/events,
		// but the transformed version is what the LLM sees as the tool result.
		const modelResult = builtTool.toModelOutput
			? builtTool.toModelOutput(actualResult)
			: actualResult;

		list.setToolCallResult(toolCallId, toJsonValue(modelResult));

		const customMessage = builtTool?.toMessage?.(actualResult);
		if (customMessage) {
			list.addResponse([customMessage]);
		}

		return {
			outcome: 'success',
			toolEntry: {
				tool: toolName,
				input: toolInput,
				output: actualResult,
				transformed: !!builtTool.toModelOutput,
			},
			modelOutput: modelResult,
			subAgentUsage: extractedSubAgentUsage,
			customMessage,
		};
	}

	/** Build common LLM call dependencies shared by both the generate and stream loops. */
	private buildLoopContext(
		execOptions?: ExecutionOptions & { persistence?: AgentPersistenceOptions },
	) {
		const wmTool = this.buildWorkingMemoryToolForRun(execOptions?.persistence);
		const allUserTools = wmTool
			? [...(this.config.tools ?? []), wmTool]
			: (this.config.tools ?? []);
		const aiTools = toAiSdkTools(allUserTools);
		const aiProviderTools = toAiSdkProviderTools(this.config.providerTools);
		const allTools = { ...aiTools, ...aiProviderTools };
		const model = createModel(this.config.model);
		return {
			model,
			toolMap: buildToolMap(allUserTools),
			aiTools: allTools,
			providerOptions: this.buildCallProviderOptions(execOptions?.providerOptions),
			hasTools: Object.keys(allTools).length > 0,
			outputSpec: this.config.structuredOutput
				? Output.object({ schema: this.config.structuredOutput })
				: undefined,
			effectiveInstructions: this.composeEffectiveInstructions(allUserTools),
		};
	}

	/**
	 * Merge tool-attached `systemInstruction` fragments into the agent's
	 * configured instructions. Fragments are wrapped in a single
	 * `<built_in_rules>` block, prepended above the user's instructions so
	 * the user's text remains the dominant tail of the prompt and can still
	 * override defaults if needed.
	 */
	private composeEffectiveInstructions(tools: BuiltTool[]): string {
		const fragments = tools
			.map((t) => t.systemInstruction)
			.filter((s): s is string => typeof s === 'string' && s.trim().length > 0);

		const userInstructions = this.config.instructions;
		if (fragments.length === 0) return userInstructions;

		const block = `<built_in_rules>\n${fragments.map((f) => `- ${f}`).join('\n')}\n</built_in_rules>`;
		return userInstructions ? `${block}\n\n${userInstructions}` : block;
	}

	/**
	 * Build the update_working_memory BuiltTool for the current run.
	 * Returns undefined when working memory is not configured or persistence is unavailable.
	 */
	private buildWorkingMemoryToolForRun(persistence: AgentPersistenceOptions | undefined) {
		const wmParams = this.resolveWorkingMemoryParams(persistence);
		if (!wmParams) return undefined;
		return buildWorkingMemoryTool({
			structured: wmParams.structured,
			schema: wmParams.schema,
			persist: wmParams.persistFn,
		});
	}

	/**
	 * Persist a suspended run state and update the current state snapshot.
	 * Returns the runId (reuses existingRunId when resuming to prevent dangling runs).
	 */
	private async persistSuspension(
		pendingToolCalls: Record<string, PendingToolCall>,
		options: (RunOptions & ExecutionOptions) | undefined,
		list: AgentMessageList,
		totalUsage: TokenUsage | undefined,
		existingRunId?: string,
	): Promise<string> {
		const runId = existingRunId ?? generateRunId();

		// Only persist maxIterations. providerOptions are intentionally excluded
		// because they may contain sensitive data (API keys, auth headers).
		const executionOptions: PersistedExecutionOptions | undefined =
			options?.maxIterations !== undefined ? { maxIterations: options.maxIterations } : undefined;

		const state: SerializableAgentState = {
			persistence: options?.persistence,
			status: 'suspended',
			messageList: list.serialize(),
			pendingToolCalls,
			usage: totalUsage,
			executionOptions,
		};
		await this.runState.suspend(runId, state);
		this.updateState({ status: 'suspended', pendingToolCalls, messageList: list.serialize() });
		return runId;
	}

	/** Clean up stored state for a run when it finishes without re-suspending. */
	private async cleanupRun(runId: string | undefined): Promise<void> {
		if (runId) {
			await this.runState.complete(runId);
		}
	}

	/** Emit a TurnEnd event when an assistant message is present in `newMessages`. */
	private emitTurnEnd(newMessages: AgentMessage[], toolResults: ContentToolCall[]): void {
		const assistantMsg = newMessages.find((m) => 'role' in m && m.role === 'assistant');
		if (assistantMsg) {
			this.eventBus.emit({ type: AgentEvent.TurnEnd, message: assistantMsg, toolResults });
		}
	}

	/** Patch the current state with partial updates. */
	private updateState(patch: Partial<SerializableAgentState>): void {
		this.currentState = { ...this.currentState, ...patch };
	}

	/** Get the model ID string. */
	private get modelIdString(): string {
		const m = this.config.model;
		if (typeof m === 'string') return m;
		if ('id' in m && typeof m.id === 'string') return m.id;
		if ('modelId' in m && typeof m.modelId === 'string') {
			const provider = 'provider' in m ? String(m.provider) : 'unknown';
			return `${provider}/${m.modelId}`;
		}
		return 'unknown';
	}

	/** Effective tool-call concurrency (default 1 = sequential). */
	private get concurrency(): number {
		return this.config.toolCallConcurrency ?? 1;
	}

	/** Fetch model cost from catalog. Retries on subsequent calls if the catalog was unavailable. */
	private async ensureModelCost(): Promise<ModelCost | undefined> {
		if (this.modelCost) return this.modelCost;
		try {
			this.modelCost = await getModelCost(this.modelIdString);
		} catch {
			// Catalog unavailable — proceed without cost data, will retry next call
		}
		return this.modelCost;
	}

	/** Apply cost to a TokenUsage object using catalog pricing. */
	private applyCost(usage: TokenUsage | undefined): TokenUsage | undefined {
		if (!usage || !this.modelCost) return usage;
		return { ...usage, cost: computeCost(usage, this.modelCost) };
	}

	private async setListWorkingMemoryConfig(
		list: AgentMessageList,
		options: AgentPersistenceOptions | undefined,
	) {
		const wmParams = this.resolveWorkingMemoryParams(options);
		if (!wmParams || !this.config.memory?.getWorkingMemory) return;
		const wmState = await this.config.memory.getWorkingMemory(wmParams.memoryParams);

		list.workingMemory = {
			template: wmParams.template,
			structured: wmParams.structured,
			state: wmState,
			...(wmParams.instruction !== undefined && { instruction: wmParams.instruction }),
		};
	}

	private resolveWorkingMemoryParams(options: AgentPersistenceOptions | undefined) {
		if (!options) return null;
		if (!this.config.workingMemory) return null;
		const scope = this.config.workingMemory?.scope ?? 'resource';
		if (scope === 'resource' && !options.resourceId) {
			throw new Error(
				'Working memory scope is "resource" but no resourceId was provided. ' +
					'Pass a resourceId in RunOptions or change the scope to "thread".',
			);
		}
		if (!options) return null;
		const memoryParams = { ...options, scope };
		const persistFn =
			this.config.workingMemory && this.config.memory?.saveWorkingMemory && options
				? async (content: string) => {
						await this.config.memory!.saveWorkingMemory!(memoryParams, content);
					}
				: undefined;
		if (!persistFn) return null;
		return {
			persistFn,
			memoryParams,
			template: this.config.workingMemory.template,
			structured: this.config.workingMemory.structured,
			schema: this.config.workingMemory.schema,
			instruction: this.config.workingMemory.instruction,
		};
	}
}

import type { ProviderOptions } from '@ai-sdk/provider-utils';
import { generateText, streamText, Output } from 'ai';
import type { z } from 'zod';
import { zodToJsonSchema, type JsonSchema7Type } from 'zod-to-json-schema';

import { computeCost, getModelCost, type ModelCost } from '../sdk/catalog';
import { isLlmMessage } from '../sdk/message';
import type {
	AgentExecutionCounter,
	AgentRunState,
	AnthropicThinkingConfig,
	AttributeValue,
	BuiltMemory,
	BuiltProviderTool,
	BuiltTelemetry,
	BuiltTool,
	CheckpointStore,
	EpisodicMemoryConfig,
	FinishReason,
	GenerateResult,
	GoogleThinkingConfig,
	ObservationalMemoryConfig,
	ObservationLogMemoryConfig,
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
import { BackgroundTaskTracker } from './background-task-tracker';
import { DeferredToolManager } from './deferred-tool-manager';
import {
	createRecallMemoryTool,
	getEpisodicMemoryScope,
	hasEpisodicMemoryStore,
	isEpisodicMemoryEnabled,
	RECALL_MEMORY_TOOL_NAME,
	runEpisodicMemoryIndexer,
} from './episodic-memory';
import { AgentEventBus } from './event-bus';
import { toJsonValue } from './json-value';
import { createFilteredLogger } from './logger';
import { saveMessagesToThread } from './memory-store';
import { AgentMessageList, type SerializedMessageList } from './message-list';
import { fromAiFinishReason, fromAiMessages } from './messages';
import { createEmbeddingModel, createModel } from './model-factory';
import {
	runObservationLogObserver,
	type ObservationLogObserverMemory,
} from './observation-log-observer';
import { runObservationLogReflector } from './observation-log-reflector';
import { renderObservationLog } from './observation-log-renderer';
import { hasObservationLogStore, hasObservationLogTaskLockStore } from './observation-log-store';
import { generateRunId, RunStateManager } from './run-state';
import {
	accumulateUsage,
	applySubAgentUsage,
	extractSettledToolCalls,
	makeErrorStream,
	normalizeInput,
} from './runtime-helpers';
import { ScopedMemoryTaskRunner } from './scoped-memory-task-runner';
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
import { createObservationLogThreadScopeId } from '../types/sdk/observation-log';
import type { ObservationLogScope, ObservationLogTaskKind } from '../types/sdk/observation-log';import type { JSONObject, JSONValue } from '../types/utils/json';
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
	deferredTools?: BuiltTool[];
	toolSearch?: {
		topK?: number;
	};
	providerTools?: BuiltProviderTool[];
	memory?: BuiltMemory;
	lastMessages?: number;
	observationLog?: ObservationLogMemoryConfig;
	observationalMemory?: ObservationalMemoryConfig;
	episodicMemory?: EpisodicMemoryConfig;	}

	private scheduleObservationLogJobs(persistence: AgentPersistenceOptions): void {
		const { memory, observationalMemory } = this.config;
		if (!memory || !observationalMemory || !hasObservationLogStore(memory)) return;

		const scope = this.getObservationLogScope(persistence);
		const runner = this.getMemoryTaskRunner(memory, observationalMemory.lockTtlMs);		const observe = observationalMemory.observe;
		const observerThresholdTokens = observationalMemory.observerThresholdTokens;

		if (
			observe &&
			observerThresholdTokens !== undefined &&
			hasObservationLogObserverMemory(memory)
		) {
			this.scheduleMemoryTask(
				runner,
				scope,
				'observer',				async () =>
					await runObservationLogObserver({
						memory,
						...scope,
						observerThresholdTokens,
						observationLogTailLimit: observationalMemory.observationLogTailLimit ?? 0,
						observe,
						messageSource: {
							threadId: persistence.threadId,
							resourceId: persistence.resourceId,
						},
					}),
			);
		}

		const reflect = observationalMemory.reflect;
		const reflectorThresholdTokens = observationalMemory.reflectorThresholdTokens;
		if (reflect && reflectorThresholdTokens !== undefined) {
			this.scheduleMemoryTask(
				runner,
				scope,
				'reflector',				async () =>
					await runObservationLogReflector({
						memory,
						...scope,
						reflectorThresholdTokens,
						reflect,
					}),
			);
		}
	}

	private scheduleEpisodicMemoryJob(persistence: AgentPersistenceOptions): void {
		const { memory, episodicMemory } = this.config;
		if (
			!memory ||
			!episodicMemory ||
			!isEpisodicMemoryEnabled(episodicMemory) ||
			!hasEpisodicMemoryStore(memory) ||
			!hasObservationLogStore(memory) ||
			!episodicMemory.extract
		) {
			return;
		}
		const scope = getEpisodicMemoryScope(persistence);
		if (!scope) return;

		const observationScope = this.getObservationLogScope(persistence);
		const runner = this.getMemoryTaskRunner(memory, this.config.observationalMemory?.lockTtlMs);
		this.scheduleMemoryTask(
			runner,
			observationScope,
			'episodic-indexer',
			async () =>
				await runEpisodicMemoryIndexer({
					memory,
					config: episodicMemory,
					scope,
					observationScope,
					threadId: persistence.threadId,
					eventBus: this.eventBus,
				}),
		);
	}

	private scheduleMemoryTask<T>(
		runner: ScopedMemoryTaskRunner,
		scope: ObservationLogScope,
		taskKind: ObservationLogTaskKind,
		task: () => Promise<T>,
	): void {
		runner.schedule({ ...scope, taskKind }, task);
	}

	private getMemoryTaskRunner(memory: BuiltMemory, lockTtlMs?: number): ScopedMemoryTaskRunner {
		this.memoryTasks ??= new ScopedMemoryTaskRunner({
			tracker: this.backgroundTasks,
			lockStore: hasObservationLogTaskLockStore(memory) ? memory : undefined,
			lockTtlMs,
			onEvent: (event) => {
				if (event.type !== 'failed') return;
				const source =
					event.task.taskKind === 'episodic-indexer' ? 'episodic-memory' : event.task.taskKind;
				const message =
					event.task.taskKind === 'episodic-indexer'
						? 'Episodic memory indexing task failed'
						: `Observation log ${source} task failed`;				logger.warn(message, {
					error: event.error,
					scopeKind: event.task.scopeKind,
					scopeId: event.task.scopeId,
				});
				this.eventBus.emit({ type: AgentEvent.Error, message, error: event.error, source });
			},
		});
		return this.memoryTasks;
	}

	private getObservationLogScope(persistence: AgentPersistenceOptions): ObservationLogScope {
		return {
			scopeKind: 'thread',
			scopeId: createObservationLogThreadScopeId(persistence.threadId, persistence.resourceId),
		};
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
				if (cfg.mode === 'adaptive') {
					return { anthropic: { thinking: { type: 'adaptive' } } };
				}
				return {
					anthropic: {
						thinking: { type: 'enabled', budgetTokens: cfg.budgetTokens ?? 10000 },
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
		const { toolCalls, toolMap, list, runId, telemetry: resolvedTelemetry, executionCounter } = ctx;
		const executableCalls = toolCalls.filter((tc) => !tc.providerExecuted);
		const providerExecutedCount = toolCalls.length - executableCalls.length;
		for (let i = 0; i < providerExecutedCount; i++) {
			this.incrementToolCallCount(executionCounter);
		}
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
							executionCounter,
							true,
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
		const {
			pendingResume,
			toolMap,
			list,
			runId,
			telemetry: resolvedTelemetry,
			executionCounter,
		} = ctx;
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
			executionCounter,
			false,
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
				executionCounter,
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
		executionCounter?: AgentExecutionCounter,
		countToolCall = true,
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

		if (countToolCall) {
			this.incrementToolCallCount(executionCounter);
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

	/** Build run-stable LLM call dependencies shared by all iterations. */
	private buildStaticLoopContext(
		execOptions?: ExecutionOptions & { persistence?: AgentPersistenceOptions },
	) {
		const aiProviderTools = toAiSdkProviderTools(this.config.providerTools);
		const model = createModel(this.config.model);
		return {
			model,
			aiProviderTools,
			providerOptions: this.buildCallProviderOptions(execOptions?.providerOptions),
			outputSpec: this.config.structuredOutput
				? Output.object({ schema: this.config.structuredOutput })
				: undefined,
		};
	}

	/** Build the current local tool view; deferred loads can change this between iterations. */
	private buildToolLoopContext(
		aiProviderTools: ReturnType<typeof toAiSdkProviderTools>,
		persistence?: AgentPersistenceOptions,
	) {
		const allUserTools = this.getCurrentTools(persistence);
		const aiTools = toAiSdkTools(allUserTools);
		const allTools = { ...aiTools, ...aiProviderTools };
		const aiToolCount = Object.keys(allTools).length;
		const toolMap = buildToolMap(allUserTools);
		const effectiveInstructions = this.composeEffectiveInstructions(allUserTools);

		return {
			toolMap,
			aiTools: allTools,
			hasTools: aiToolCount > 0,
			effectiveInstructions,
		};
	}

	private getCurrentTools(persistence?: AgentPersistenceOptions): BuiltTool[] {
		const baseTools = this.config.tools ?? [];
		const tools = [
			...baseTools,
			...(this.deferredToolManager?.hasTools
				? [
						...this.deferredToolManager.getControllerTools(),
						...this.deferredToolManager.getLoadedTools(),
					]
				: []),
		];

		const recallTool = this.createRecallMemoryToolForRun(persistence, tools);
		return recallTool ? [...tools, recallTool] : tools;
	}

	private createRecallMemoryToolForRun(
		persistence: AgentPersistenceOptions | undefined,
		existingTools: BuiltTool[],
	): BuiltTool | undefined {
		const { memory, episodicMemory } = this.config;
		if (
			!memory ||
			!episodicMemory ||
			!isEpisodicMemoryEnabled(episodicMemory) ||
			!hasEpisodicMemoryStore(memory)
		) {
			return undefined;
		}
		const scope = getEpisodicMemoryScope(persistence);
		if (!scope) return undefined;
		if (existingTools.some((tool) => tool.name === RECALL_MEMORY_TOOL_NAME)) {
			throw new Error(
				`Tool name "${RECALL_MEMORY_TOOL_NAME}" is reserved while episodic memory is enabled.`,
			);
		}
		return createRecallMemoryTool({ memory, config: episodicMemory, scope });
	}

	private hydrateDeferredToolsFromList(list: AgentMessageList): void {
		if (!this.deferredToolManager?.hasTools) return;
		this.deferredToolManager.hydrateLoadedToolsFromMessages(list.serialize().messages);
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

	private async setListObservationLogMemory(
		list: AgentMessageList,
		options: AgentPersistenceOptions | undefined,
	) {
		const memory = this.config.memory;
		if (!memory || !options?.threadId || !hasObservationLogStore(memory)) return;
		const scope = this.getObservationLogScope(options);
		const observations = await memory.getActiveObservationLog({
			...scope,
			order: 'asc',
		});
		list.observationLogMemory =
			renderObservationLog(observations, {
				renderTokenBudget: this.config.observationLog?.renderTokenBudget,
			}) ?? undefined;
	}

	/**
	 * Configured telemetry handle (build-time). Run-time inheritance via
	 * `ExecutionOptions.parentTelemetry` only applies inside an active
	 * agentic loop; out-of-band callers like `agent.reflect()` see the
	 * builder-time value.
	 */
	getConfiguredTelemetry(): BuiltTelemetry | undefined {
		return this.config.telemetry;
	}
}

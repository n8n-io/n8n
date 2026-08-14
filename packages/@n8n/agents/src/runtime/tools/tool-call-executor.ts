import { zodToJsonSchema, type JsonSchema7Type } from 'zod-to-json-schema';

import {
	getInlineDelegateSubAgentToolOptions,
	isDelegateSubAgentTool,
} from './delegate-sub-agent-tool';
import { DEFAULT_SUB_AGENT_MAX_CHILDREN } from './sub-agent-task-path';
import { executeTool, isSuspendedToolResult, type SuspendedToolResult } from './tool-adapter';
import {
	guardToolErrorForModel,
	guardToolMessageForModel,
	guardToolResultForModel,
	type ToolResultGuardStorage,
} from './tool-result-guard';
import { isAbortError, raceWithAbort } from '../../sdk/abort';
import { isCancellation } from '../../sdk/cancellation';
import { isLlmMessage } from '../../sdk/message';
import type {
	AgentExecutionCounter,
	BuiltTelemetry,
	BuiltTool,
	PendingToolCall,
	ToolSuspendOptions,
} from '../../types';
import { AgentEvent } from '../../types/runtime/event';
import type { AgentPersistenceOptions, ToolResultEntry } from '../../types/sdk/agent';
import type { AgentMessage, ContentToolCall, Message } from '../../types/sdk/message';
import type { JSONObject, JSONValue } from '../../types/utils/json';
import { parseWithSchema } from '../../utils/parse';
import { isZodSchema } from '../../utils/zod';
import type { WorkspaceFilesystem } from '../../workspace/types';
import { incrementToolCallCount } from '../loop/execution-counter';
import { stringifyError } from '../loop/runtime-helpers';
import type { AgentMessageList } from '../model/message-list';
import { normalizeToolInputForModel } from '../model/messages';
import type { TokenCounter } from '../model/model-token-counter';
import type { AgentEventBus } from '../state/event-bus';
import type { RuntimeTelemetry } from '../telemetry/runtime-telemetry';

/** Pending tool calls from a suspended run, passed into the loop to execute before the first LLM call. */
export interface PendingResume {
	pendingToolCalls: Record<string, PendingToolCall>;
	/** The tool call being resumed with new data. */
	resumeToolCallId: string;
	resumeData: unknown;
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
			customMessage?: AgentMessage;
	  }
	| {
			outcome: 'suspended';
			payload: unknown;
			resumeSchema: JsonSchema7Type;
			continuation?: JSONValue;
	  }
	| {
			outcome: 'cancelled';
			toolEntry: ToolResultEntry;
			modelOutput: string;
			userMessage: string;
			canceled: true;
	  }
	| { outcome: 'retryable-error' }
	| { outcome: 'error'; error: unknown }
	| { outcome: 'noop' }; // tool call shouldn't be saved or logged anywhere, usually means that if was executed by AI SDK

/** A tool call that completed successfully. */
export interface ToolCallSuccess {
	toolCallId: string;
	toolName: string;
	input: JSONValue;
	toolEntry: ToolResultEntry;
	modelOutput: unknown;
	customMessage?: AgentMessage;
}

/** Info about a tool call that suspended (before persistence — no runId yet). */
export interface ToolCallSuspension {
	toolCallId: string;
	toolName: string;
	input: JSONValue;
	payload: unknown;
	/** JSON Schema describing the shape of resume data, derived from the tool's resumeSchema. */
	resumeSchema: JsonSchema7Type;
}

/** Info about a tool call that failed — carries enough data for stream chunks. */
export interface ToolCallError {
	toolCallId: string;
	toolName: string;
	input: JSONValue;
	error: unknown;
}

/** Result of executing a batch of tool calls (before persistence). */
export interface ToolCallBatchResult {
	results: ToolCallSuccess[];
	suspensions: ToolCallSuspension[];
	errors: ToolCallError[];
	/** All items to persist: suspended tools (with suspendPayload) + unexecuted tools (without). */
	pending: Record<string, PendingToolCall>;
}

interface RuntimeToolCall {
	toolCallId: string;
	toolName: string;
	input: JSONObject;
	providerExecuted?: boolean;
}

/** Shared input for the tool-call batch iterators. */
export interface ToolBatchContext {
	toolMap: Map<string, BuiltTool>;
	list: AgentMessageList;
	runId: string;
	persistence?: AgentPersistenceOptions;
	telemetry?: BuiltTelemetry;
	executionCounter?: AgentExecutionCounter;
	abortSignal: AbortSignal;
	isAborted: () => boolean;
}

/** A tool-call content block that has already been settled by the AI SDK. */
type SettledToolCall = ContentToolCall & { state: 'resolved' | 'rejected' };

/** Inputs for executing a single tool call. */
interface ProcessToolCallParams {
	toolCallId: string;
	toolName: string;
	input: JSONValue;
	toolMap: Map<string, BuiltTool>;
	list: AgentMessageList;
	runId: string;
	persistence?: AgentPersistenceOptions;
	resumeData?: unknown;
	resolvedTelemetry?: BuiltTelemetry;
	executionCounter?: AgentExecutionCounter;
	abortSignal?: AbortSignal;
	/** Whether this counts as a new tool-call invocation. Default `true`; `false` on resume. */
	countToolCall?: boolean;
	/** Checkpointed suspend payload of the tool call being resumed. */
	suspendPayload?: unknown;
	/** Checkpointed private continuation of the tool call being resumed. */
	continuation?: JSONValue;
	/** Checkpointed resume schema of the tool call being resumed. */
	resumeSchema?: ToolSuspendOptions['resumeSchema'];
}

function isDeniedApprovalResumeData(value: unknown): boolean {
	return value !== null && typeof value === 'object' && Reflect.get(value, 'approved') === false;
}

function shouldEmitToolExecutionStart(tool: BuiltTool, resumeData: unknown): boolean {
	if (!tool.approval) return true;
	if (!tool.approval.required && tool.approval.conditional !== true) return true;
	if (resumeData === undefined) return false;
	return !isDeniedApprovalResumeData(resumeData);
}

function getToolResumeJsonSchema(
	tool: BuiltTool,
	resumeSchemaOverride?: ToolSuspendOptions['resumeSchema'],
): JsonSchema7Type | undefined {
	const resolvedSchema = resumeSchemaOverride ?? tool.resumeSchema;
	if (!resolvedSchema) return undefined;
	return isZodSchema(resolvedSchema) ? zodToJsonSchema(resolvedSchema) : resolvedSchema;
}

export interface ToolCallExecutorDeps {
	telemetry: RuntimeTelemetry;
	eventBus: AgentEventBus;
	/** Effective tool-call concurrency (default 1 = sequential). */
	concurrency: number;
	/** Invoked when a run is aborted mid-batch so the runtime can set cancelled state. */
	onCancelled: () => void;
	tokenCounter: TokenCounter;
	workspaceFilesystem?: WorkspaceFilesystem;
}

/**
 * Executes a turn's tool calls: batches them by concurrency (with delegated
 * sub-agent fan-out), runs each via the tool adapter, records results/errors on
 * the message list, emits lifecycle events, and surfaces suspensions for the
 * suspend/resume flow. Pure orchestration — persistence and stream/chunk
 * emission are owned by the caller.
 */
export class ToolCallExecutor {
	constructor(private readonly deps: ToolCallExecutorDeps) {}

	private get telemetry(): RuntimeTelemetry {
		return this.deps.telemetry;
	}

	private get eventBus(): AgentEventBus {
		return this.deps.eventBus;
	}

	private get concurrency(): number {
		return this.deps.concurrency;
	}

	private isDelegateSubAgentCall(toolName: string, toolMap: Map<string, BuiltTool>): boolean {
		const tool = toolMap.get(toolName);
		return tool !== undefined && isDelegateSubAgentTool(tool);
	}

	private getToolCallBatchSize(toolName: string, toolMap: Map<string, BuiltTool>): number {
		const tool = toolMap.get(toolName);
		const delegateOptions = tool ? getInlineDelegateSubAgentToolOptions(tool) : undefined;
		if (!delegateOptions) return this.concurrency;
		return delegateOptions.policy?.maxChildren ?? DEFAULT_SUB_AGENT_MAX_CHILDREN;
	}

	private takeNextToolCallBatch<T extends { toolName: string }>(
		calls: T[],
		start: number,
		toolMap: Map<string, BuiltTool>,
	): T[] {
		const first = calls[start];
		if (!first) {
			throw new Error('Unable to build tool-call batch');
		}

		const isDelegateBatch = this.isDelegateSubAgentCall(first.toolName, toolMap);
		const batchSize = this.getToolCallBatchSize(first.toolName, toolMap);
		if (
			batchSize < 1 ||
			Number.isNaN(batchSize) ||
			(isDelegateBatch && !Number.isFinite(batchSize))
		) {
			throw new Error(`Invalid tool-call batch size for ${first.toolName}: ${batchSize}`);
		}
		const batch: T[] = [];

		for (let i = start; i < calls.length && batch.length < batchSize; i++) {
			const candidate = calls[i];
			if (this.isDelegateSubAgentCall(candidate.toolName, toolMap) !== isDelegateBatch) break;
			batch.push(candidate);
		}

		return batch;
	}

	/**
	 * Execute tool calls concurrently in batches.
	 *
	 * Regular tools use `toolCallConcurrency`. Consecutive delegate-subagent
	 * calls use the effective `maxChildren` policy from the built delegate tool.
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
	async iterateToolCallsConcurrent(
		ctx: ToolBatchContext & {
			toolCalls: Array<{
				toolCallId: string;
				toolName: string;
				input: unknown;
				providerExecuted?: boolean;
			}>;
		},
	): Promise<ToolCallBatchResult> {
		const {
			toolCalls,
			toolMap,
			list,
			runId,
			telemetry: resolvedTelemetry,
			executionCounter,
			abortSignal,
		} = ctx;
		const errors: ToolCallError[] = [];
		const runtimeToolCalls: RuntimeToolCall[] = [];

		for (const toolCall of toolCalls) {
			const normalizedInput = normalizeToolInputForModel(toolCall.input);
			if (!normalizedInput.ok) {
				const error = new Error(normalizedInput.error);
				incrementToolCallCount(executionCounter);
				list.setToolCallError(toolCall.toolCallId, error);
				errors.push({
					toolCallId: toolCall.toolCallId,
					toolName: toolCall.toolName,
					input: normalizedInput.input,
					error,
				});
				continue;
			}

			runtimeToolCalls.push({ ...toolCall, input: normalizedInput.input });
		}

		const executableCalls = runtimeToolCalls.filter((tc) => !tc.providerExecuted);
		const providerExecutedCount = runtimeToolCalls.length - executableCalls.length;
		for (let i = 0; i < providerExecutedCount; i++) {
			incrementToolCallCount(executionCounter);
		}
		const executableCallsById = new Map(executableCalls.map((tc) => [tc.toolCallId, tc]));
		const unexecutedIds = new Set(executableCalls.map((tc) => tc.toolCallId));
		const results: ToolCallSuccess[] = [];
		const suspensions: ToolCallSuspension[] = [];
		const pending: Record<string, PendingToolCall> = {};

		for (let batchStart = 0; batchStart < executableCalls.length; ) {
			if (ctx.isAborted()) {
				this.deps.onCancelled();
				for (const id of unexecutedIds) {
					const tc = executableCallsById.get(id)!;
					const modelOutput = '[Skipped: run was aborted]';
					list.setToolCallResult(tc.toolCallId, modelOutput, { canceled: true });
					results.push({
						toolCallId: tc.toolCallId,
						toolName: tc.toolName,
						input: tc.input,
						toolEntry: {
							tool: tc.toolName,
							input: tc.input,
							output: modelOutput,
							transformed: false,
							canceled: true,
						},
						modelOutput,
					});
				}
				return await this.finalizeBatch({ results, suspensions, errors, pending }, ctx);
			}

			const batch = this.takeNextToolCallBatch(executableCalls, batchStart, toolMap);
			batchStart += batch.length;

			const settledResults = await Promise.allSettled(
				batch.map(
					async (tc) =>
						await this.processToolCall({
							toolCallId: tc.toolCallId,
							toolName: tc.toolName,
							input: tc.input,
							toolMap,
							list,
							runId,
							persistence: ctx.persistence,
							resolvedTelemetry,
							executionCounter,
							abortSignal,
							countToolCall: true,
						}),
				),
			);

			for (const tc of batch) {
				unexecutedIds.delete(tc.toolCallId);
			}

			let hasSuspension = false;

			for (let i = 0; i < settledResults.length; i++) {
				const result = settledResults[i];
				const tc = batch[i];
				const toolInput = tc.input;

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
						...(result.value.continuation !== undefined
							? { continuation: result.value.continuation }
							: {}),
						runId,
					};
				} else if (result.value.outcome === 'success') {
					results.push({
						toolCallId: tc.toolCallId,
						toolName: tc.toolName,
						input: toolInput,
						toolEntry: result.value.toolEntry,
						modelOutput: result.value.modelOutput,
						customMessage: result.value.customMessage,
					});
				} else if (result.value.outcome === 'cancelled') {
					results.push({
						toolCallId: tc.toolCallId,
						toolName: tc.toolName,
						input: toolInput,
						toolEntry: result.value.toolEntry,
						modelOutput: result.value.modelOutput,
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

			if (ctx.isAborted()) {
				this.deps.onCancelled();
				for (const id of unexecutedIds) {
					const tc = executableCallsById.get(id)!;
					const modelOutput = '[Skipped: run was aborted]';
					list.setToolCallResult(tc.toolCallId, modelOutput, { canceled: true });
					results.push({
						toolCallId: tc.toolCallId,
						toolName: tc.toolName,
						input: tc.input,
						toolEntry: {
							tool: tc.toolName,
							input: tc.input,
							output: modelOutput,
							transformed: false,
							canceled: true,
						},
						modelOutput,
					});
				}
				return await this.finalizeBatch({ results, suspensions, errors, pending }, ctx);
			}

			if (hasSuspension) {
				for (const id of unexecutedIds) {
					const tc = executableCallsById.get(id)!;
					pending[tc.toolCallId] = {
						suspended: false,
						toolCallId: tc.toolCallId,
						toolName: tc.toolName,
						input: tc.input,
					};
				}
				break;
			}
		}

		return await this.finalizeBatch({ results, suspensions, errors, pending }, ctx);
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
	async iteratePendingToolCallsConcurrent(
		ctx: ToolBatchContext & { pendingResume: PendingResume },
	): Promise<ToolCallBatchResult> {
		const {
			pendingResume,
			toolMap,
			list,
			runId,
			persistence,
			telemetry: resolvedTelemetry,
			executionCounter,
			abortSignal,
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
			this.pendingToolCallParams(resumedEntry, ctx, pendingResume.resumeData),
		);

		if (processResult.outcome === 'suspended') {
			pending[resumedId] = {
				suspended: true,
				toolCallId: resumedEntry.toolCallId,
				toolName: resumedToolName,
				input: resumedEntry.input,
				suspendPayload: processResult.payload,
				resumeSchema: processResult.resumeSchema,
				...(processResult.continuation !== undefined
					? { continuation: processResult.continuation }
					: {}),
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
				customMessage: processResult.customMessage,
			});
		} else if (processResult.outcome === 'cancelled') {
			results.push({
				toolCallId: resumedEntry.toolCallId,
				toolName: resumedToolName,
				input: resumedEntry.input,
				toolEntry: processResult.toolEntry,
				modelOutput: processResult.modelOutput,
			});
			list.addInput([
				{ role: 'user', content: [{ type: 'text', text: processResult.userMessage }] },
			]);

			for (const id of Object.keys(pendingResume.pendingToolCalls)) {
				if (id !== resumedId) {
					const siblingEntry = pendingResume.pendingToolCalls[id];
					const siblingTool = toolMap.get(siblingEntry.toolName);
					const siblingParams = this.pendingToolCallParams(
						siblingEntry,
						ctx,
						pendingResume.resumeData,
					);
					if (siblingEntry.suspended && siblingTool?.onCancellation) {
						try {
							await this.runCancellationCleanup(
								siblingParams,
								siblingTool,
								processResult.userMessage,
							);
						} catch {
							this.retainPendingToolCall(id, siblingEntry, pending, suspensions);
							continue;
						}
					}
					const modelOutput = '[Skipped: a sibling tool call was cancelled]';
					list.setToolCallResult(id, modelOutput, {
						canceled: true,
					});
					results.push({
						toolCallId: siblingEntry.toolCallId,
						toolName: siblingEntry.toolName,
						input: siblingEntry.input,
						toolEntry: {
							tool: siblingEntry.toolName,
							input: siblingEntry.input,
							output: modelOutput,
							transformed: false,
							canceled: true,
						},
						modelOutput,
					});
				}
			}

			return await this.finalizeBatch({ results, suspensions, errors, pending }, ctx);
		} else if (processResult.outcome === 'retryable-error') {
			for (const [id, entry] of Object.entries(pendingResume.pendingToolCalls)) {
				this.retainPendingToolCall(id, entry, pending, suspensions);
			}
			return await this.finalizeBatch({ results, suspensions, errors, pending }, ctx);
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

			if (entry.suspended) {
				this.retainPendingToolCall(id, entry, pending, suspensions);
			} else {
				// Unexecuted — collect for batch execution
				unexecuted.push({
					toolCallId: id,
					toolName: entry.toolName,
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
				persistence,
				telemetry: resolvedTelemetry,
				executionCounter,
				abortSignal,
				isAborted: ctx.isAborted,
			});
			results.push(...batch.results);
			suspensions.push(...batch.suspensions);
			errors.push(...batch.errors);
			Object.assign(pending, batch.pending);
		}
		return await this.finalizeBatch({ results, suspensions, errors, pending }, ctx);
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
	private async processToolCall(params: ProcessToolCallParams): Promise<ToolCallOutcome> {
		const { toolName, toolMap, list, toolCallId, resumeData } = params;
		const builtTool = toolMap.get(toolName);

		if (!builtTool) {
			return await this.toolError(params, new Error(`Tool ${toolName} not found`));
		}

		// Already settled by the AI SDK (e.g. provider-executed tools): emit the
		// lifecycle end and skip re-execution.
		const settledBlock = this.findSettledToolCall(list, toolCallId);
		if (settledBlock) {
			return this.completeSettledToolCall(params, settledBlock);
		}

		if (isCancellation(resumeData) && !builtTool.handleCancellation) {
			try {
				await this.runCancellationCleanup(params, builtTool, resumeData.message);
			} catch {
				return { outcome: 'retryable-error' };
			}
			return this.buildCancelledOutcome(params, resumeData.message);
		}

		if (params.countToolCall ?? true) {
			incrementToolCallCount(params.executionCounter);
		}

		const validation = await this.validateToolInput(params, builtTool);
		if (!validation.ok) return validation.outcome;
		const input = validation.input;

		if (shouldEmitToolExecutionStart(builtTool, resumeData)) {
			this.eventBus.emit({
				type: AgentEvent.ToolExecutionStart,
				toolCallId,
				toolName,
				args: input,
			});
		}

		let toolResult: unknown;
		let interruptedSuspendPayload: unknown;
		let interruptedSuspendOptions: ToolSuspendOptions | undefined;
		let didSuspend = false;
		let abortObserved = false;
		let suspensionCleanup: Promise<void> | undefined;
		const cleanupInterruptedSuspension = async () => {
			suspensionCleanup ??= this.runCancellationCleanup(
				{
					...params,
					input,
					suspendPayload: interruptedSuspendPayload,
					continuation: interruptedSuspendOptions?.continuation,
					resumeSchema: getToolResumeJsonSchema(builtTool, interruptedSuspendOptions?.resumeSchema),
				},
				builtTool,
				'Run aborted',
			).catch(() => undefined);
			await suspensionCleanup;
		};
		try {
			toolResult = await this.runToolHandler(params, builtTool, input, async (payload, options) => {
				didSuspend = true;
				interruptedSuspendPayload = payload;
				interruptedSuspendOptions = options;
				if (abortObserved || params.abortSignal?.aborted) {
					await cleanupInterruptedSuspension();
				}
			});
		} catch (error) {
			if (isAbortError(error) || params.abortSignal?.aborted) {
				abortObserved = true;
				if (didSuspend) {
					await cleanupInterruptedSuspension();
				} else if (params.suspendPayload !== undefined || params.continuation !== undefined) {
					try {
						await this.runCancellationCleanup({ ...params, input }, builtTool, 'Run aborted');
					} catch {
						// Parent shutdown must continue; persistent stores will prune stale checkpoints.
					}
				}
				this.deps.onCancelled();
				return this.buildCancelledOutcome(params, 'Run aborted');
			}
			return await this.toolError(params, error as Error);
		}

		if (isSuspendedToolResult(toolResult)) {
			return await this.buildSuspendedOutcome(params, builtTool, toolResult);
		}

		return await this.buildSuccessOutcome(params, builtTool, input, toolResult);
	}

	private async runCancellationCleanup(
		params: ProcessToolCallParams,
		builtTool: BuiltTool,
		message: string,
	): Promise<void> {
		if (!builtTool.onCancellation) return;
		await builtTool.onCancellation(params.input, {
			cancellation: { message },
			toolCallId: params.toolCallId,
			toolName: params.toolName,
			runId: params.runId,
			persistence: params.persistence,
			parentTelemetry: params.resolvedTelemetry,
			emitEvent: (event) => this.eventBus.emit(event),
			abortSignal: params.abortSignal,
			executionCounter: params.executionCounter,
			suspendPayload: params.suspendPayload,
			continuation: params.continuation,
			resumeSchema: params.resumeSchema,
		});
	}

	async cleanupPendingToolCalls(
		pending: Record<string, PendingToolCall>,
		ctx: ToolBatchContext,
		message = 'Run aborted',
	): Promise<void> {
		for (const entry of Object.values(pending)) {
			if (!entry.suspended) continue;
			const tool = ctx.toolMap.get(entry.toolName);
			if (!tool?.onCancellation) continue;
			try {
				await this.runCancellationCleanup(this.pendingToolCallParams(entry, ctx), tool, message);
			} catch {
				// Parent shutdown must continue; persistent stores will prune stale child checkpoints.
			}
		}
	}

	private async finalizeBatch(
		batch: ToolCallBatchResult,
		ctx: ToolBatchContext,
	): Promise<ToolCallBatchResult> {
		if (!ctx.isAborted()) return batch;
		await this.cleanupPendingToolCalls(batch.pending, ctx);
		return { ...batch, suspensions: [], pending: {} };
	}

	private pendingToolCallParams(
		entry: PendingToolCall,
		ctx: ToolBatchContext,
		resumeData?: unknown,
	): ProcessToolCallParams {
		return {
			toolCallId: entry.toolCallId,
			toolName: entry.toolName,
			input: entry.input,
			toolMap: ctx.toolMap,
			list: ctx.list,
			runId: ctx.runId,
			persistence: ctx.persistence,
			resumeData,
			resolvedTelemetry: ctx.telemetry,
			executionCounter: ctx.executionCounter,
			abortSignal: ctx.abortSignal,
			countToolCall: false,
			...(entry.suspended
				? {
						suspendPayload: entry.suspendPayload,
						continuation: entry.continuation,
						resumeSchema: entry.resumeSchema,
					}
				: {}),
		};
	}

	private retainPendingToolCall(
		id: string,
		entry: PendingToolCall,
		pending: Record<string, PendingToolCall>,
		suspensions: ToolCallSuspension[],
	): void {
		pending[id] = entry;
		if (!entry.suspended) return;
		suspensions.push({
			toolCallId: id,
			toolName: entry.toolName,
			input: entry.input,
			payload: entry.suspendPayload,
			resumeSchema: entry.resumeSchema,
		});
	}

	/** Emit a failed ToolExecutionEnd, record the error on the list, return an error outcome. */
	private async toolError(params: ProcessToolCallParams, error: unknown): Promise<ToolCallOutcome> {
		this.eventBus.emit({
			type: AgentEvent.ToolExecutionEnd,
			toolCallId: params.toolCallId,
			toolName: params.toolName,
			result: error,
			isError: true,
		});
		params.list.setToolCallError(
			params.toolCallId,
			await guardToolErrorForModel(
				stringifyError(error),
				this.deps.tokenCounter,
				this.getResultStorage(params),
			),
		);
		return { outcome: 'error', error };
	}

	/** Find an already-settled (resolved/rejected) tool-call block for this id, if any. */
	private findSettledToolCall(
		list: AgentMessageList,
		toolCallId: string,
	): SettledToolCall | undefined {
		return list
			.responseDelta()
			.flatMap((m) => (isLlmMessage(m) && 'content' in m ? (m as Message).content : []))
			.find(
				(c): c is SettledToolCall =>
					c.type === 'tool-call' && c.toolCallId === toolCallId && c.state !== 'pending',
			);
	}

	/** Emit ToolExecutionEnd for a block the AI SDK already settled; the result was written earlier. */
	private completeSettledToolCall(
		params: ProcessToolCallParams,
		settledBlock: SettledToolCall,
	): ToolCallOutcome {
		const settledResult =
			settledBlock.state === 'resolved' ? settledBlock.output : settledBlock.error;
		this.eventBus.emit({
			type: AgentEvent.ToolExecutionEnd,
			toolCallId: params.toolCallId,
			toolName: params.toolName,
			result: settledResult,
			isError: settledBlock.state === 'rejected',
		});
		return { outcome: 'noop' };
	}

	/** Record a cancelled tool call (user declined / cancelled) and build its outcome. */
	private buildCancelledOutcome(
		params: ProcessToolCallParams,
		userMessage: string,
	): ToolCallOutcome {
		const { toolCallId, toolName, input, list } = params;
		const modelOutput = `[Tool call cancelled. User said: "${userMessage}"]`;
		this.eventBus.emit({
			type: AgentEvent.ToolExecutionEnd,
			toolCallId,
			toolName,
			result: modelOutput,
			isError: false,
		});
		list.setToolCallResult(toolCallId, modelOutput, { canceled: true });
		return {
			outcome: 'cancelled',
			toolEntry: { tool: toolName, input, output: modelOutput, transformed: false, canceled: true },
			modelOutput,
			userMessage,
			canceled: true,
		};
	}

	/** Validate input against the tool's input schema (if any). */
	private async validateToolInput(
		params: ProcessToolCallParams,
		builtTool: BuiltTool,
	): Promise<{ ok: true; input: JSONValue } | { ok: false; outcome: ToolCallOutcome }> {
		if (!builtTool.inputSchema) return { ok: true, input: params.input };
		const result = await parseWithSchema(builtTool.inputSchema, params.input);
		if (!result.success) {
			const reason = result.schemaInvalid
				? `Tool ${params.toolName} has an input schema that could not be compiled: ${result.error}`
				: `Invalid tool input: ${result.error}`;
			return { ok: false, outcome: await this.toolError(params, new Error(reason)) };
		}
		return { ok: true, input: result.data as JSONValue };
	}

	/** Execute the tool handler inside a telemetry span. Throws on handler failure. */
	private async runToolHandler(
		params: ProcessToolCallParams,
		builtTool: BuiltTool,
		input: JSONValue,
		onSuspend: (payload: unknown, options?: ToolSuspendOptions) => void,
	): Promise<unknown> {
		const {
			toolCallId,
			toolName,
			runId,
			persistence,
			resumeData,
			resolvedTelemetry,
			executionCounter,
			abortSignal,
			suspendPayload,
			continuation,
			resumeSchema,
		} = params;
		return await this.telemetry.withToolSpan(
			toolCallId,
			toolName,
			input,
			resolvedTelemetry,
			async () =>
				await raceWithAbort(
					async () =>
						await executeTool(input, builtTool, resumeData, resolvedTelemetry, toolCallId, {
							runId,
							persistence,
							emitEvent: (event) => this.eventBus.emit(event),
							abortSignal,
							executionCounter,
							suspendPayload,
							continuation,
							resumeSchema,
							onSuspend,
						}),
					abortSignal,
				),
		);
	}

	/** Validate a suspend payload + resume schema and build the suspended outcome. */
	private async buildSuspendedOutcome(
		params: ProcessToolCallParams,
		builtTool: BuiltTool,
		toolResult: SuspendedToolResult,
	): Promise<ToolCallOutcome> {
		if (builtTool.suspendSchema) {
			const parseResult = await parseWithSchema(builtTool.suspendSchema, toolResult.payload);
			if (!parseResult.success) {
				return await this.toolError(
					params,
					new Error(`Invalid suspend payload: ${parseResult.error}`),
				);
			}
			toolResult.payload = parseResult.data as JSONValue;
		}
		const resumeSchema = getToolResumeJsonSchema(builtTool, toolResult.resumeSchema);
		if (!resumeSchema) {
			return await this.toolError(
				params,
				new Error(`Tool ${params.toolName} has no resume schema`),
			);
		}
		return {
			outcome: 'suspended',
			payload: toolResult.payload,
			resumeSchema,
			...(toolResult.continuation !== undefined ? { continuation: toolResult.continuation } : {}),
		};
	}

	/** Apply toModelOutput, emit ToolExecutionEnd, build the success outcome. */
	private async buildSuccessOutcome(
		params: ProcessToolCallParams,
		builtTool: BuiltTool,
		input: JSONValue,
		toolResult: unknown,
	): Promise<ToolCallOutcome> {
		const { toolCallId, toolName, list } = params;

		// Apply toModelOutput transform before emitting the success event.
		// If the transform throws, treat it as a tool error so processToolCall
		// never re-throws (preserving the "never re-throws" contract).
		let modelResult: unknown;
		try {
			modelResult = builtTool.toModelOutput ? builtTool.toModelOutput(toolResult) : toolResult;
		} catch (error) {
			return await this.toolError(params, error);
		}
		const storage = this.getResultStorage(params);
		const guardedResult = await guardToolResultForModel(
			modelResult,
			this.deps.tokenCounter,
			storage,
		);

		this.eventBus.emit({
			type: AgentEvent.ToolExecutionEnd,
			toolCallId,
			toolName,
			result: toolResult,
			isError: false,
		});

		list.setToolCallResult(toolCallId, guardedResult.historyOutput);

		const customMessage = await builtTool.toMessage?.(toolResult);
		const guardedCustomMessage = customMessage
			? await guardToolMessageForModel(customMessage, this.deps.tokenCounter, storage)
			: undefined;
		if (guardedCustomMessage) {
			list.addResponse([guardedCustomMessage]);
		}

		return {
			outcome: 'success',
			toolEntry: {
				tool: toolName,
				input,
				output: toolResult,
				transformed: !!builtTool.toModelOutput,
			},
			modelOutput: guardedResult.wireOutput,
			customMessage: guardedCustomMessage,
		};
	}

	private getResultStorage(params: ProcessToolCallParams): ToolResultGuardStorage | undefined {
		const filesystem = this.deps.workspaceFilesystem;
		if (!filesystem) return undefined;

		return {
			filesystem,
			runId: params.runId,
			toolCallId: params.toolCallId,
			...(params.persistence?.threadId ? { threadId: params.persistence.threadId } : {}),
			...(params.abortSignal ? { abortSignal: params.abortSignal } : {}),
		};
	}
}

import { zodSchemaToJsonSchema } from '@n8n/ai-utilities/json-schema';
import type { JSONSchema7 } from 'json-schema';

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
import {
	protectUntrustedToolError,
	protectUntrustedToolMessage,
	protectUntrustedToolResult,
} from './untrusted-tool-output';
import { isAbortError, raceWithAbort } from '../../sdk/abort';
import { isCancellation } from '../../sdk/cancellation';
import { isLlmMessage } from '../../sdk/message';
import type { RuntimeSkillLoader } from '../../skills/types';
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
			mcpServerName?: string;
	  }
	| {
			outcome: 'suspended';
			payload: unknown;
			resumeSchema: JSONSchema7;
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
	/** Set when the tool belongs to an MCP server, so hosts can attribute the result to it. */
	mcpServerName?: string;
}

/** Info about a tool call that suspended (before persistence — no runId yet). */
export interface ToolCallSuspension {
	toolCallId: string;
	toolName: string;
	input: JSONValue;
	payload: unknown;
	/** JSON Schema describing the shape of resume data, derived from the tool's resumeSchema. */
	resumeSchema: JSONSchema7;
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

interface ToolCallInput {
	toolCallId: string;
	toolName: string;
	input: unknown;
	providerExecuted?: boolean;
}

interface RuntimeToolCall extends ToolCallInput {
	input: JSONObject;
}

type ToolCallIdentity = Pick<PendingToolCall, 'toolCallId' | 'toolName' | 'input'>;
type SuspendedToolOutcome = Extract<ToolCallOutcome, { outcome: 'suspended' }>;

interface InterruptedToolSuspension {
	didSuspend: boolean;
	abortObserved: boolean;
	payload: unknown;
	options?: ToolSuspendOptions;
	cleanup?: Promise<void>;
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
): JSONSchema7 | undefined {
	const resolvedSchema = resumeSchemaOverride ?? tool.resumeSchema;
	if (!resolvedSchema) return undefined;
	return isZodSchema(resolvedSchema) ? zodSchemaToJsonSchema(resolvedSchema) : resolvedSchema;
}

export interface ToolCallExecutorDeps {
	loadSkill?: RuntimeSkillLoader;
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
	private offloadedToolResults = false;

	constructor(private readonly deps: ToolCallExecutorDeps) {}

	/** Whether any tool result was offloaded to the workspace filesystem during this runtime's lifetime. */
	get hasOffloadedToolResults(): boolean {
		return this.offloadedToolResults;
	}

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
		ctx: ToolBatchContext & { toolCalls: ToolCallInput[] },
	): Promise<ToolCallBatchResult> {
		const errors: ToolCallError[] = [];
		const runtimeToolCalls = this.normalizeToolCalls(ctx.toolCalls, ctx, errors);
		const executableCalls = runtimeToolCalls.filter((tc) => !tc.providerExecuted);
		const providerExecutedCount = runtimeToolCalls.length - executableCalls.length;
		for (let i = 0; i < providerExecutedCount; i++) {
			incrementToolCallCount(ctx.executionCounter);
		}
		const executableCallsById = new Map(executableCalls.map((tc) => [tc.toolCallId, tc]));
		const unexecutedIds = new Set(executableCalls.map((tc) => tc.toolCallId));
		const result: ToolCallBatchResult = { results: [], suspensions: [], errors, pending: {} };

		for (let batchStart = 0; batchStart < executableCalls.length; ) {
			if (ctx.isAborted()) {
				this.skipAbortedToolCalls(unexecutedIds, executableCallsById, ctx.list, result.results);
				return await this.finalizeBatch(result, ctx);
			}
			const batch = this.takeNextToolCallBatch(executableCalls, batchStart, ctx.toolMap);
			batchStart += batch.length;
			const settled = await this.executeToolCallBatch(batch, ctx);
			for (const tc of batch) unexecutedIds.delete(tc.toolCallId);
			const hasSuspension = this.collectBatchResults(batch, settled, result, ctx);

			if (ctx.isAborted()) {
				this.skipAbortedToolCalls(unexecutedIds, executableCallsById, ctx.list, result.results);
				return await this.finalizeBatch(result, ctx);
			}
			if (hasSuspension) {
				this.retainUnexecutedToolCalls(unexecutedIds, executableCallsById, result.pending);
				break;
			}
		}
		return await this.finalizeBatch(result, ctx);
	}

	private normalizeToolCalls(
		toolCalls: ToolCallInput[],
		ctx: ToolBatchContext,
		errors: ToolCallError[],
	): RuntimeToolCall[] {
		const calls: RuntimeToolCall[] = [];
		for (const toolCall of toolCalls) {
			const normalizedInput = normalizeToolInputForModel(toolCall.input);
			if (!normalizedInput.ok) {
				const error = new Error(normalizedInput.error);
				incrementToolCallCount(ctx.executionCounter);
				ctx.list.setToolCallError(toolCall.toolCallId, error);
				errors.push({
					toolCallId: toolCall.toolCallId,
					toolName: toolCall.toolName,
					input: normalizedInput.input,
					error,
				});
				continue;
			}
			calls.push({ ...toolCall, input: normalizedInput.input });
		}
		return calls;
	}

	private async executeToolCallBatch(
		batch: RuntimeToolCall[],
		ctx: ToolBatchContext,
	): Promise<Array<PromiseSettledResult<ToolCallOutcome>>> {
		return await Promise.allSettled(
			batch.map(
				async (tc) =>
					await this.processToolCall({
						toolCallId: tc.toolCallId,
						toolName: tc.toolName,
						input: tc.input,
						toolMap: ctx.toolMap,
						list: ctx.list,
						runId: ctx.runId,
						persistence: ctx.persistence,
						resolvedTelemetry: ctx.telemetry,
						executionCounter: ctx.executionCounter,
						abortSignal: ctx.abortSignal,
						countToolCall: true,
					}),
			),
		);
	}

	private collectBatchResults(
		calls: RuntimeToolCall[],
		settled: Array<PromiseSettledResult<ToolCallOutcome>>,
		batch: ToolCallBatchResult,
		ctx: ToolBatchContext,
	): boolean {
		let hasSuspension = false;
		for (let i = 0; i < settled.length; i++) {
			if (this.collectSettledToolCall(calls[i], settled[i], batch, ctx)) hasSuspension = true;
		}
		return hasSuspension;
	}

	private collectSettledToolCall(
		call: RuntimeToolCall,
		result: PromiseSettledResult<ToolCallOutcome>,
		batch: ToolCallBatchResult,
		ctx: ToolBatchContext,
	): boolean {
		if (result.status === 'rejected') {
			ctx.list.setToolCallError(call.toolCallId, result.reason);
			batch.errors.push({
				toolCallId: call.toolCallId,
				toolName: call.toolName,
				input: call.input,
				error: result.reason,
			});
			return false;
		}
		const outcome = result.value;
		switch (outcome.outcome) {
			case 'suspended':
				batch.suspensions.push(this.buildToolCallSuspension(call, outcome));
				batch.pending[call.toolCallId] = this.buildPendingToolCall(call, outcome, ctx.runId);
				return true;
			case 'success':
			case 'cancelled':
				this.appendCompletedToolCall(call, outcome, batch.results);
				break;
			case 'error':
				batch.errors.push({
					toolCallId: call.toolCallId,
					toolName: call.toolName,
					input: call.input,
					error: outcome.error,
				});
				break;
		}
		return false;
	}

	private buildToolCallSuspension(
		call: ToolCallIdentity,
		outcome: SuspendedToolOutcome,
	): ToolCallSuspension {
		return {
			toolCallId: call.toolCallId,
			toolName: call.toolName,
			input: call.input,
			payload: outcome.payload,
			resumeSchema: outcome.resumeSchema,
		};
	}

	private buildPendingToolCall(
		call: ToolCallIdentity,
		outcome: SuspendedToolOutcome,
		runId: string,
	): PendingToolCall {
		return {
			suspended: true,
			toolCallId: call.toolCallId,
			toolName: call.toolName,
			input: call.input,
			suspendPayload: outcome.payload,
			resumeSchema: outcome.resumeSchema,
			...(outcome.continuation !== undefined ? { continuation: outcome.continuation } : {}),
			runId,
		};
	}

	private appendCompletedToolCall(
		call: ToolCallIdentity,
		outcome: Extract<ToolCallOutcome, { outcome: 'success' | 'cancelled' }>,
		results: ToolCallSuccess[],
	): void {
		const result: ToolCallSuccess = {
			toolCallId: call.toolCallId,
			toolName: call.toolName,
			input: call.input,
			toolEntry: outcome.toolEntry,
			modelOutput: outcome.modelOutput,
		};
		if (outcome.outcome === 'success') {
			result.customMessage = outcome.customMessage;
			if (outcome.mcpServerName !== undefined) result.mcpServerName = outcome.mcpServerName;
		}
		results.push(result);
	}

	private skipAbortedToolCalls(
		ids: Set<string>,
		calls: Map<string, RuntimeToolCall>,
		list: AgentMessageList,
		results: ToolCallSuccess[],
	): void {
		this.deps.onCancelled();
		for (const id of ids) {
			const call = calls.get(id)!;
			const modelOutput = '[Skipped: run was aborted]';
			list.setToolCallResult(call.toolCallId, modelOutput, { canceled: true });
			results.push(this.buildSkippedToolResult(call, modelOutput));
		}
	}

	private buildSkippedToolResult(call: ToolCallIdentity, modelOutput: string): ToolCallSuccess {
		return {
			toolCallId: call.toolCallId,
			toolName: call.toolName,
			input: call.input,
			toolEntry: {
				tool: call.toolName,
				input: call.input,
				output: modelOutput,
				transformed: false,
				canceled: true,
			},
			modelOutput,
		};
	}

	private retainUnexecutedToolCalls(
		ids: Set<string>,
		calls: Map<string, RuntimeToolCall>,
		pending: Record<string, PendingToolCall>,
	): void {
		for (const id of ids) {
			const call = calls.get(id)!;
			pending[call.toolCallId] = {
				suspended: false,
				toolCallId: call.toolCallId,
				toolName: call.toolName,
				input: call.input,
			};
		}
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
		const { pendingResume } = ctx;
		const resumedId = pendingResume.resumeToolCallId;
		const resumedEntry = pendingResume.pendingToolCalls[resumedId];
		if (!resumedEntry) throw new Error(`No pending tool call found for toolCallId: ${resumedId}`);
		const batch: ToolCallBatchResult = { results: [], suspensions: [], errors: [], pending: {} };
		const outcome = await this.processToolCall(
			this.pendingToolCallParams(resumedEntry, ctx, pendingResume.resumeData),
		);

		if (outcome.outcome === 'cancelled') {
			this.appendCompletedToolCall(resumedEntry, outcome, batch.results);
			ctx.list.addInput([{ role: 'user', content: [{ type: 'text', text: outcome.userMessage }] }]);
			await this.cancelSiblingToolCalls(ctx, batch, outcome.userMessage);
			return await this.finalizeBatch(batch, ctx);
		}
		if (outcome.outcome === 'retryable-error') {
			for (const [id, entry] of Object.entries(pendingResume.pendingToolCalls)) {
				this.retainPendingToolCall(id, entry, batch.pending, batch.suspensions);
			}
			return await this.finalizeBatch(batch, ctx);
		}

		this.collectResumedToolCall(resumedId, resumedEntry, outcome, batch, ctx.runId);
		await this.executeRemainingToolCalls(ctx, batch);
		return await this.finalizeBatch(batch, ctx);
	}

	private collectResumedToolCall(
		id: string,
		entry: PendingToolCall,
		outcome: ToolCallOutcome,
		batch: ToolCallBatchResult,
		runId: string,
	): void {
		switch (outcome.outcome) {
			case 'suspended':
				batch.pending[id] = this.buildPendingToolCall(entry, outcome, runId);
				batch.suspensions.push(this.buildToolCallSuspension({ ...entry, toolCallId: id }, outcome));
				break;
			case 'success':
				this.appendCompletedToolCall(entry, outcome, batch.results);
				break;
			case 'error':
				batch.errors.push({
					toolCallId: entry.toolCallId,
					toolName: entry.toolName,
					input: entry.input,
					error: outcome.error,
				});
				break;
		}
	}

	private async cancelSiblingToolCalls(
		ctx: ToolBatchContext & { pendingResume: PendingResume },
		batch: ToolCallBatchResult,
		userMessage: string,
	): Promise<void> {
		for (const id of Object.keys(ctx.pendingResume.pendingToolCalls)) {
			if (id === ctx.pendingResume.resumeToolCallId) continue;
			const entry = ctx.pendingResume.pendingToolCalls[id];
			const tool = ctx.toolMap.get(entry.toolName);
			const params = this.pendingToolCallParams(entry, ctx, ctx.pendingResume.resumeData);
			if (entry.suspended && tool?.onCancellation) {
				try {
					await this.runCancellationCleanup(params, tool, userMessage);
				} catch {
					this.retainPendingToolCall(id, entry, batch.pending, batch.suspensions);
					continue;
				}
			}
			const modelOutput = '[Skipped: a sibling tool call was cancelled]';
			ctx.list.setToolCallResult(id, modelOutput, { canceled: true });
			batch.results.push(this.buildSkippedToolResult(entry, modelOutput));
		}
	}

	private async executeRemainingToolCalls(
		ctx: ToolBatchContext & { pendingResume: PendingResume },
		result: ToolCallBatchResult,
	): Promise<void> {
		const unexecuted: ToolCallInput[] = [];
		for (const [id, entry] of Object.entries(ctx.pendingResume.pendingToolCalls)) {
			if (id === ctx.pendingResume.resumeToolCallId) continue;
			if (entry.suspended) {
				this.retainPendingToolCall(id, entry, result.pending, result.suspensions);
			} else {
				unexecuted.push({ toolCallId: id, toolName: entry.toolName, input: entry.input });
			}
		}
		if (unexecuted.length === 0) return;
		const batch = await this.iterateToolCallsConcurrent({
			toolCalls: unexecuted,
			toolMap: ctx.toolMap,
			list: ctx.list,
			runId: ctx.runId,
			persistence: ctx.persistence,
			telemetry: ctx.telemetry,
			executionCounter: ctx.executionCounter,
			abortSignal: ctx.abortSignal,
			isAborted: ctx.isAborted,
		});
		result.results.push(...batch.results);
		result.suspensions.push(...batch.suspensions);
		result.errors.push(...batch.errors);
		Object.assign(result.pending, batch.pending);
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

		return await this.executeValidatedToolCall(params, builtTool, input);
	}

	private async executeValidatedToolCall(
		params: ProcessToolCallParams,
		builtTool: BuiltTool,
		input: JSONValue,
	): Promise<ToolCallOutcome> {
		let toolResult: unknown;
		const suspension: InterruptedToolSuspension = {
			didSuspend: false,
			abortObserved: false,
			payload: undefined,
		};
		try {
			toolResult = await this.runToolHandler(params, builtTool, input, async (payload, options) => {
				suspension.didSuspend = true;
				suspension.payload = payload;
				suspension.options = options;
				if (suspension.abortObserved || params.abortSignal?.aborted) {
					await this.cleanupInterruptedSuspension(params, builtTool, input, suspension);
				}
			});
		} catch (error) {
			if (isAbortError(error) || params.abortSignal?.aborted) {
				suspension.abortObserved = true;
				await this.cleanupAbortedTool(params, builtTool, input, suspension);
				this.deps.onCancelled();
				return this.buildCancelledOutcome(params, 'Run aborted');
			}
			return await this.toolError(params, error, builtTool);
		}

		if (isSuspendedToolResult(toolResult)) {
			return await this.buildSuspendedOutcome(params, builtTool, toolResult);
		}
		return await this.buildSuccessOutcome(params, builtTool, input, toolResult);
	}

	private async cleanupInterruptedSuspension(
		params: ProcessToolCallParams,
		builtTool: BuiltTool,
		input: JSONValue,
		suspension: InterruptedToolSuspension,
	): Promise<void> {
		// Both abort and late suspension can reach this path. Run cleanup only once.
		suspension.cleanup ??= this.runCancellationCleanup(
			{
				...params,
				input,
				suspendPayload: suspension.payload,
				continuation: suspension.options?.continuation,
				resumeSchema: getToolResumeJsonSchema(builtTool, suspension.options?.resumeSchema),
			},
			builtTool,
			'Run aborted',
		).catch(() => undefined);
		await suspension.cleanup;
	}

	private async cleanupAbortedTool(
		params: ProcessToolCallParams,
		builtTool: BuiltTool,
		input: JSONValue,
		suspension: InterruptedToolSuspension,
	): Promise<void> {
		if (suspension.didSuspend) {
			await this.cleanupInterruptedSuspension(params, builtTool, input, suspension);
		} else if (params.suspendPayload !== undefined || params.continuation !== undefined) {
			try {
				await this.runCancellationCleanup({ ...params, input }, builtTool, 'Run aborted');
			} catch {
				// Parent shutdown must continue; persistent stores will prune stale checkpoints.
			}
		}
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

	/**
	 * Emit a failed ToolExecutionEnd, record the error on the list, return an
	 * error outcome. Pass `builtTool` only for errors authored by the tool
	 * itself (handler or transform failures) so runtime-authored errors such as
	 * input validation stay plain; tool-authored text from untrusted tools is
	 * wrapped before the size guard so any offloaded copy stays protected.
	 */
	private async toolError(
		params: ProcessToolCallParams,
		error: unknown,
		builtTool?: BuiltTool,
	): Promise<ToolCallOutcome> {
		this.eventBus.emit({
			type: AgentEvent.ToolExecutionEnd,
			toolCallId: params.toolCallId,
			toolName: params.toolName,
			result: error,
			isError: true,
		});
		const errorText = stringifyError(error);
		const guardedError = await guardToolErrorForModel(
			builtTool?.outputTrust === 'untrusted'
				? protectUntrustedToolError(errorText, builtTool)
				: errorText,
			this.deps.tokenCounter,
			this.getResultStorage(params),
		);
		params.list.setToolCallError(params.toolCallId, guardedError);
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
							...(this.deps.loadSkill ? { loadSkill: this.deps.loadSkill } : {}),
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
			toolResult.payload = parseResult.data;
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
		// Untrusted results are wrapped before the size guard so any offloaded
		// or truncated copy stays protected while the guard's own envelope
		// remains plain runtime text.
		let modelResult: unknown;
		try {
			modelResult = builtTool.toModelOutput ? builtTool.toModelOutput(toolResult) : toolResult;
			if (builtTool.outputTrust === 'untrusted') {
				modelResult = protectUntrustedToolResult(modelResult, builtTool);
			}
		} catch (error) {
			return await this.toolError(params, error, builtTool);
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

		const guardedCustomMessage = await this.appendCustomToolMessage(
			params,
			builtTool,
			toolResult,
			storage,
		);

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
			...(builtTool.mcpServerName !== undefined ? { mcpServerName: builtTool.mcpServerName } : {}),
		};
	}

	private async appendCustomToolMessage(
		params: ProcessToolCallParams,
		builtTool: BuiltTool,
		toolResult: unknown,
		storage: ToolResultGuardStorage | undefined,
	): Promise<AgentMessage | undefined> {
		let customMessage = await builtTool.toMessage?.(toolResult);
		if (customMessage && builtTool.outputTrust === 'untrusted') {
			customMessage = protectUntrustedToolMessage(customMessage, builtTool);
		}
		let guardedCustomMessage = customMessage
			? await guardToolMessageForModel(customMessage, this.deps.tokenCounter, storage)
			: undefined;
		// Stamp tool provenance so derived transcripts (e.g. the observation
		// log observer) can keep this content inside untrusted-data boundaries.
		if (guardedCustomMessage && 'role' in guardedCustomMessage) {
			guardedCustomMessage = {
				...guardedCustomMessage,
				origin: { kind: 'tool', toolName: params.toolName },
			};
		}
		if (guardedCustomMessage) {
			params.list.addResponse([guardedCustomMessage]);
		}
		return guardedCustomMessage;
	}

	private getResultStorage(params: ProcessToolCallParams): ToolResultGuardStorage | undefined {
		const filesystem = this.deps.workspaceFilesystem;
		if (!filesystem) return undefined;

		return {
			filesystem,
			runId: params.runId,
			toolCallId: params.toolCallId,
			onOffloaded: () => {
				this.offloadedToolResults = true;
			},
			...(params.abortSignal ? { abortSignal: params.abortSignal } : {}),
		};
	}
}

import {
	getInlineDelegateSubAgentToolOptions,
	isDelegateSubAgentTool,
} from './delegate-sub-agent-tool';
import { DEFAULT_SUB_AGENT_MAX_CHILDREN } from './sub-agent-task-path';
import { ToolCallRunner } from './tool-call-runner';
import type { BuiltTool, PendingToolCall } from '../../types';
import type {
	ProcessToolCallParams,
	ResumeToolBatchContext,
	ToolBatchContext,
	ToolCallBatchResult,
	ToolCallError,
	ToolCallExecutorDeps,
	ToolCallIdentity,
	ToolCallInput,
	ToolCallOutcome,
	ToolCallSuccess,
	ToolCallSuspension,
} from '../../types/runtime/tool-execution';
import type { JSONObject } from '../../types/utils/json';
import { incrementToolCallCount } from '../loop/execution-counter';
import type { AgentMessageList } from '../model/message-list';
import { normalizeToolInputForModel } from '../model/messages';

export type {
	PendingResume,
	ToolCallSuccess,
	ToolCallSuspension,
	ToolCallError,
	ToolCallBatchResult,
	ToolBatchContext,
	ToolCallExecutorDeps,
} from '../../types/runtime/tool-execution';

interface RuntimeToolCall extends ToolCallInput {
	input: JSONObject;
}

type SuspendedToolOutcome = Extract<ToolCallOutcome, { outcome: 'suspended' }>;

/**
 * Executes a turn's tool calls: batches them by concurrency (with delegated
 * sub-agent fan-out), runs each via the tool adapter, records results/errors on
 * the message list, emits lifecycle events, and surfaces suspensions for the
 * suspend/resume flow. Pure orchestration — persistence and stream/chunk
 * emission are owned by the caller.
 */
export class ToolCallExecutor {
	private readonly runner: ToolCallRunner;

	constructor(private readonly deps: ToolCallExecutorDeps) {
		this.runner = new ToolCallRunner(deps);
	}

	/** Whether any tool result was offloaded to the workspace filesystem during this runtime's lifetime. */
	get hasOffloadedToolResults(): boolean {
		return this.runner.hasOffloadedToolResults;
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
					await this.runner.processToolCall({
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
		ctx: ResumeToolBatchContext,
	): Promise<ToolCallBatchResult> {
		const { pendingResume } = ctx;
		const resumedId = pendingResume.resumeToolCallId;
		const resumedEntry = pendingResume.pendingToolCalls[resumedId];
		if (!resumedEntry) throw new Error(`No pending tool call found for toolCallId: ${resumedId}`);
		const batch: ToolCallBatchResult = { results: [], suspensions: [], errors: [], pending: {} };
		const outcome = await this.runner.processToolCall(
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
		ctx: ResumeToolBatchContext,
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
					await this.runner.runCancellationCleanup(params, tool, userMessage);
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
		ctx: ResumeToolBatchContext,
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
				await this.runner.runCancellationCleanup(
					this.pendingToolCallParams(entry, ctx),
					tool,
					message,
				);
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
}

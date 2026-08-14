import { MemoryGuardConfig } from '@n8n/config';
import { OnLifecycleEvent } from '@n8n/decorators';
import type {
	NodeExecuteAfterContext,
	NodeExecuteBeforeContext,
	WorkflowExecuteAfterContext,
} from '@n8n/decorators';
import { Service } from '@n8n/di';
import type { IRunExecutionData } from 'n8n-workflow';

import { estimateItemsSize } from './estimate-items-size';

interface ExecutionMemoryEntry {
	workflowId: string | undefined;
	estimatedBytes: number;
	inNodeSince: number | undefined;
	seen: WeakSet<object>;
	runExecutionData: IRunExecutionData | undefined;
}

export interface ExecutionMemoryReport {
	executionId: string;
	workflowId: string | undefined;
	estimatedBytes: number;
	inNodeMs: number;
}

/**
 * Tracks an estimate of how much run data each active execution retains in
 * memory. Node outputs accumulate in run data for the life of an execution, so
 * the sum of output sizes (deduplicated by object identity) approximates the
 * execution's share of the heap.
 */
@Service()
export class ExecutionMemoryTracker {
	private readonly executions = new Map<string, ExecutionMemoryEntry>();

	constructor(private readonly config: MemoryGuardConfig) {}

	@OnLifecycleEvent('nodeExecuteBefore')
	onNodeStart(ctx: NodeExecuteBeforeContext) {
		if (!this.config.enabled) return;

		this.getOrCreate(ctx).inNodeSince = Date.now();
	}

	@OnLifecycleEvent('nodeExecuteAfter')
	onNodeFinish(ctx: NodeExecuteAfterContext) {
		if (!this.config.enabled) return;

		const entry = this.getOrCreate(ctx);
		entry.inNodeSince = undefined;
		entry.runExecutionData = ctx.executionData;

		const outputs = ctx.taskData.data;
		if (!outputs) return;

		for (const runs of Object.values(outputs)) {
			if (!Array.isArray(runs)) continue;
			for (const items of runs) {
				if (items) entry.estimatedBytes += estimateItemsSize(items, entry.seen);
			}
		}
	}

	@OnLifecycleEvent('workflowExecuteAfter')
	onWorkflowEnd(ctx: WorkflowExecuteAfterContext) {
		this.executions.delete(ctx.executionId);
	}

	hasActiveExecutions(): boolean {
		return this.executions.size > 0;
	}

	reports(): ExecutionMemoryReport[] {
		const now = Date.now();
		const result: ExecutionMemoryReport[] = [];
		for (const [executionId, entry] of this.executions) {
			result.push({
				executionId,
				workflowId: entry.workflowId,
				estimatedBytes: entry.estimatedBytes,
				inNodeMs: entry.inNodeSince ? now - entry.inNodeSince : 0,
			});
		}
		return result;
	}

	discard(executionId: string) {
		this.executions.delete(executionId);
	}

	releaseRunData(executionId: string): boolean {
		const runExecutionData = this.executions.get(executionId)?.runExecutionData;
		if (!runExecutionData) return false;

		runExecutionData.resultData.runData = {};
		if (runExecutionData.executionData) {
			runExecutionData.executionData.nodeExecutionStack = [];
			runExecutionData.executionData.waitingExecution = {};
			runExecutionData.executionData.waitingExecutionSource = null;
		}
		return true;
	}

	private getOrCreate(ctx: {
		executionId: string;
		workflow: { id?: string };
	}): ExecutionMemoryEntry {
		let entry = this.executions.get(ctx.executionId);
		if (!entry) {
			entry = {
				workflowId: ctx.workflow.id,
				estimatedBytes: 0,
				inNodeSince: undefined,
				seen: new WeakSet(),
				runExecutionData: undefined,
			};
			this.executions.set(ctx.executionId, entry);
		}
		return entry;
	}
}

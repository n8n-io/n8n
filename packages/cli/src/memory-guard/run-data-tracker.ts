import { Logger } from '@n8n/backend-common';
import type {
	NodeExecuteAfterContext,
	NodeExecuteBeforeContext,
	WorkflowExecuteAfterContext,
	WorkflowExecuteBeforeContext,
	WorkflowExecuteResumeContext,
} from '@n8n/decorators';
import { OnLifecycleEvent } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { formatBytes } from '@n8n/utils/number/bytes';
import type { IRunData, ITaskData, ITaskStartedData } from 'n8n-workflow';

import { ActiveExecutions } from '@/active-executions';

import { estimateInputSize, estimateTaskDataSize } from './estimate-run-data-size';

interface RunningNode {
	name: string;
	/** The node that the run comes from. For a tool, this is its agent. */
	source: string | undefined;
}

interface TrackedExecution {
	/** Estimated bytes of run data that the execution holds. */
	totalBytes: number;
	/** Estimated bytes of run data added by each node, across all its runs. */
	bytesByNode: Map<string, number>;
	/** Unfinished node runs by execution index, in start order. Tools can run at the same time. */
	runningNodes: Map<number, RunningNode>;
	/** Objects already counted, so data passed on by reference counts once. */
	seen: WeakSet<object>;
}

export interface RunDataEstimate {
	totalBytes: number;
	bytesByNode: ReadonlyMap<string, number>;
	runningNode: string | undefined;
}

/**
 * Estimates how much run data each in-process execution holds in memory. Every
 * node output stays in run data until the execution ends, so the sum of the
 * output sizes approximates the execution's share of the heap.
 *
 * Lifecycle handlers register when this file is imported. Import it only when
 * the memory guard is enabled.
 */
@Service()
export class RunDataTracker {
	private readonly executions = new Map<string, TrackedExecution>();

	constructor(
		private readonly logger: Logger,
		private readonly activeExecutions: ActiveExecutions,
	) {
		this.logger = this.logger.scoped('memory-guard');
	}

	@OnLifecycleEvent('workflowExecuteBefore')
	onExecutionStart({ executionId, executionData }: WorkflowExecuteBeforeContext) {
		this.safely(executionId, () => this.track(executionId, executionData?.resultData.runData));
	}

	@OnLifecycleEvent('workflowExecuteResume')
	onExecutionResume({ executionId, executionData }: WorkflowExecuteResumeContext) {
		this.safely(executionId, () => this.track(executionId, executionData.resultData.runData));
	}

	@OnLifecycleEvent('nodeExecuteBefore')
	onNodeStart({ executionId, nodeName, taskData }: NodeExecuteBeforeContext) {
		this.safely(executionId, () => {
			const execution = this.executions.get(executionId);
			if (!execution) return;

			execution.runningNodes.set(taskData.executionIndex, {
				name: nodeName,
				source: taskData.source[0]?.previousNode,
			});

			// An AI sub-node stores its input when it starts, and can then wait long for a model.
			// At finish, `seen` skips the input, so only its item wrappers count again.
			if (hasInputOverride(taskData)) {
				this.addEstimate(execution, executionId, nodeName, () =>
					estimateInputSize(taskData, execution.seen),
				);
			}
		});
	}

	@OnLifecycleEvent('nodeExecuteAfter')
	onNodeFinish({ executionId, nodeName, taskData, executionData }: NodeExecuteAfterContext) {
		this.safely(executionId, () => {
			const execution = this.executions.get(executionId);
			if (!execution) return;

			this.finishRun(execution, nodeName, taskData.executionIndex);

			const { runData } = executionData.resultData;
			this.addEstimate(execution, executionId, nodeName, () =>
				estimateTaskDataSize(taskData, runData, execution.seen),
			);
		});
	}

	@OnLifecycleEvent('workflowExecuteAfter')
	onExecutionEnd({ executionId }: WorkflowExecuteAfterContext) {
		this.safely(executionId, () => {
			const execution = this.executions.get(executionId);
			if (!execution) return;

			this.executions.delete(executionId);
			this.logEstimate(executionId, execution);
		});
	}

	getEstimate(executionId: string): RunDataEstimate | undefined {
		const execution = this.executions.get(executionId);
		if (!execution) return undefined;

		return {
			totalBytes: execution.totalBytes,
			bytesByNode: execution.bytesByNode,
			runningNode: [...execution.runningNodes.values()].at(-1)?.name,
		};
	}

	/** Run a handler so that a failure in the tracker never reaches the execution. */
	private safely(executionId: string, handler: () => void) {
		try {
			handler();
		} catch {
			// Reading the thrown value can throw too.
			this.logger.debug('Failed to track run data', { executionId });
		}
	}

	private finishRun(execution: TrackedExecution, nodeName: string, executionIndex: number) {
		const { runningNodes } = execution;

		// A resumed agent finishes under a new execution index, so fall back to its name.
		if (!runningNodes.delete(executionIndex)) {
			const resumed = [...runningNodes].findLast(([, run]) => run.name === nodeName);
			if (resumed) runningNodes.delete(resumed[0]);
		}

		// A node that returns no data gets no finish event, so also drop the runs that came
		// from this node, recursively. A run starts after its source, so one pass is enough.
		const finished = new Set([nodeName]);
		for (const [index, run] of runningNodes) {
			if (run.source !== undefined && finished.has(run.source)) {
				runningNodes.delete(index);
				finished.add(run.name);
			}
		}
	}

	/**
	 * Start a fresh entry, and count the run data that the execution already holds after
	 * a resume, a retry, or a partial run. Only this creates entries, because a node that
	 * ignores a cancellation can finish after its execution ended.
	 */
	private track(executionId: string, runData: IRunData = {}) {
		this.dropFinished();

		const execution: TrackedExecution = {
			totalBytes: 0,
			bytesByNode: new Map(),
			runningNodes: new Map(),
			seen: new WeakSet(),
		};
		this.executions.set(executionId, execution);

		for (const [nodeName, runs] of Object.entries(runData)) {
			for (const taskData of runs) {
				this.addEstimate(execution, executionId, nodeName, () =>
					estimateTaskDataSize(taskData, runData, execution.seen),
				);
			}
		}
	}

	private addEstimate(
		execution: TrackedExecution,
		executionId: string,
		nodeName: string,
		estimateBytes: () => number,
	) {
		let bytes: number;
		try {
			bytes = estimateBytes();
		} catch {
			// Never fail the execution. Reading the thrown value can throw too.
			this.logger.debug('Failed to estimate node output size', { executionId, nodeName });
			return;
		}

		if (bytes === 0) return;

		execution.totalBytes += bytes;
		execution.bytesByNode.set(nodeName, (execution.bytesByNode.get(nodeName) ?? 0) + bytes);
	}

	/**
	 * Drop entries of executions that are no longer active. The end handler skips them
	 * when an earlier `workflowExecuteAfter` handler throws.
	 */
	private dropFinished() {
		for (const executionId of this.executions.keys()) {
			if (!this.activeExecutions.has(executionId)) this.executions.delete(executionId);
		}
	}

	private logEstimate(executionId: string, { totalBytes, bytesByNode }: TrackedExecution) {
		if (totalBytes === 0) return;

		let largestNode = '';
		let largestBytes = 0;
		for (const [nodeName, bytes] of bytesByNode) {
			if (bytes > largestBytes) [largestNode, largestBytes] = [nodeName, bytes];
		}

		this.logger.debug(
			`Execution ${executionId} held an estimated ${formatBytes(totalBytes)} of run data, most of it from node "${largestNode}" (${formatBytes(largestBytes)})`,
			{ executionId },
		);
	}
}

/** The engine passes an AI sub-node's full task data, with its input, to the start event. */
function hasInputOverride(taskData: ITaskStartedData): taskData is ITaskData {
	return 'inputOverride' in taskData && taskData.inputOverride !== undefined;
}

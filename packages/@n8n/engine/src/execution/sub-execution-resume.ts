import { deriveLoops, type WorkflowGraph } from '../graph';
import type { StepMessage, WorkQueue } from '../queue';
import type { ExecutionRecord, ExecutionStore } from './execution-store';
import type { SubExecutionOutcome, SubExecutionResult } from './execution.types';
import type { StepRecord, StepStore } from './step-store';

export interface SubExecutionResumeDeps {
	executionStore: ExecutionStore;
	stepStore: StepStore;
	stepQueue: WorkQueue<StepMessage>;
}

/** Resume the parent step with the sub-execution outcome, and announce the step on the work queue. */
export async function resumeAwaitingParent(
	deps: SubExecutionResumeDeps,
	subExecution: ExecutionRecord,
	outcome: SubExecutionOutcome,
): Promise<void> {
	const { parent } = subExecution;
	if (!parent?.awaited) return;

	// Resume first, announce second: the row is `queued` before any worker can
	// hear of it. A parent step that is not waiting any more was cancelled with
	// its execution, and nothing is owed to it.
	const resumed = await deps.stepStore.resumeStep(parent.stepId, {
		kind: 'subExecution',
		executionId: subExecution.id,
		...outcome,
	});
	if (!resumed) return;

	await deps.stepQueue.publish({
		type: 'step:ready',
		executionId: parent.executionId,
		stepId: parent.stepId,
	});
	await deps.executionStore.refreshLiveStatus(parent.executionId);
}

/**
 * The nodes whose outputs are a sub-execution's result, in graph order: the
 * nodes nothing follows. A loop's entry node counts when no edge leaves the
 * loop, since its edges into the loop body are the loop's own.
 */
export function terminalNodeIds(graph: WorkflowGraph): string[] {
	const closedLoopEntries = new Set(
		deriveLoops(graph)
			.filter((loop) => loop.exitEdges.length === 0)
			.map((loop) => loop.batchNodeId),
	);
	const sources = new Set(graph.edges.map((edge) => edge.from));
	return graph.nodes
		.filter((node) => closedLoopEntries.has(node.id) || !sources.has(node.id))
		.map((node) => node.id);
}

/**
 * Get the outcome of a sub-execution to return as a result to the parent.
 *
 * `steps` are the terminal nodes' steps, see `terminalNodeIds`. Every
 * completed one contributes, in graph order and then by pass, except for a
 * loop entry, where only the pass that ended the loop carries what the loop
 * produced.
 */
export function collectSubExecutionResult(
	graph: WorkflowGraph,
	steps: StepRecord[],
): SubExecutionResult {
	const order = new Map(terminalNodeIds(graph).map((nodeId, index) => [nodeId, index]));
	const loopEntries = new Set(deriveLoops(graph).map((loop) => loop.batchNodeId));

	const completed = steps.filter((step) => step.status === 'completed' && order.has(step.nodeId));
	const lastPass = new Map<string, number>();
	for (const step of completed) {
		lastPass.set(step.nodeId, Math.max(lastPass.get(step.nodeId) ?? -1, step.iteration));
	}

	return completed
		.filter((step) => !loopEntries.has(step.nodeId) || step.iteration === lastPass.get(step.nodeId))
		.sort((a, b) => order.get(a.nodeId)! - order.get(b.nodeId)! || a.iteration - b.iteration)
		.map(({ nodeId, iteration, outputs }) => ({ nodeId, iteration, outputs: outputs ?? [] }));
}

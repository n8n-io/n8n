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

/**
 * Hands an ended sub-execution's outcome to the parent step that waits for it:
 * the step is queued again with the outcome as its resume cause, announced,
 * and the parent's status refreshed. Resume first, announce second, as the
 * wait sweep does: the row is `queued` before any worker can hear of it.
 *
 * A parent step that is not waiting any more was cancelled with its
 * execution, and nothing is owed to it.
 *
 * TODO(CET-342): a crash between the end and the resume leaves a parent step
 * waiting on a sub-execution that has ended. The rows say so, and a redelivery
 * cannot repeat an end it lost, so reconciliation re-issues the resume.
 */
export async function resumeAwaitingParent(
	deps: SubExecutionResumeDeps,
	execution: ExecutionRecord,
	outcome: SubExecutionOutcome,
): Promise<void> {
	const { parent } = execution;
	if (!parent?.awaited) return;

	const resumed = await deps.stepStore.resumeStep(parent.stepId, {
		kind: 'subExecution',
		executionId: execution.id,
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
 * The outputs of every completed terminal step, in graph order and then by
 * pass. Several terminal branches all contribute, which is where engine v1
 * reports the last node that ran instead.
 *
 * A node is terminal when nothing follows it. A loop's entry node counts when
 * no edge leaves the loop: its edges into the loop body are the loop's own,
 * and only the pass that ended the loop carries what the loop produced.
 */
export function collectSubExecutionResult(
	graph: WorkflowGraph,
	steps: StepRecord[],
): SubExecutionResult {
	const closedLoopEntries = new Set(
		deriveLoops(graph)
			.filter((loop) => loop.exitEdges.length === 0)
			.map((loop) => loop.batchNodeId),
	);
	const sources = new Set(graph.edges.map((edge) => edge.from));
	const terminalOrder = new Map(
		graph.nodes
			.filter((node) => closedLoopEntries.has(node.id) || !sources.has(node.id))
			.map((node, index) => [node.id, index]),
	);

	const completed = steps.filter(
		(step) => step.status === 'completed' && terminalOrder.has(step.nodeId),
	);
	const lastPass = new Map<string, number>();
	for (const step of completed) {
		lastPass.set(step.nodeId, Math.max(lastPass.get(step.nodeId) ?? -1, step.iteration));
	}

	return completed
		.filter(
			(step) => !closedLoopEntries.has(step.nodeId) || step.iteration === lastPass.get(step.nodeId),
		)
		.sort(
			(a, b) =>
				terminalOrder.get(a.nodeId)! - terminalOrder.get(b.nodeId)! || a.iteration - b.iteration,
		)
		.map(({ nodeId, iteration, outputs }) => ({ nodeId, iteration, outputs: outputs ?? [] }));
}

import { getSuccessorNodeIds, type GraphEdge, type WorkflowGraph } from '../graph';
import { stepKeyId, isSettledStatus, type StepKey, type StepKeyId } from './execution.types';
import type { StepSummary } from './step-store';

/**
 * Settlement rules (design: CAT-2874):
 *
 * 1. Every node the execution considers eventually settles: completed,
 *    failed, skipped, or cancelled. Settled fates are immutable. The
 *    execution is finished exactly when every reachable node has settled.
 * 2. An edge is live iff its source completed and filled the edge's output
 *    slot; it is dead if the source settled any other way, or left the slot
 *    null. An edge whose source is unsettled is neither yet.
 * 3. A node is decidable once every predecessor is settled. Decidable with at
 *    least one live incoming edge -> it runs (queued). Decidable with none ->
 *    it is skipped: settled at birth, its own out-edges all dead.
 * 4. A settlement decides only its direct successors; the cascade is the
 *    event loop. A skip is announced as settled like any other settlement,
 *    and its handler decides the next hop.
 * 5. A planner commits its decisions in one batch, then announces only the
 *    rows it created. A settlement whose announcement is lost is detectable
 *    from rows alone — a settled row with decidable but rowless successors —
 *    and re-announced by reconciliation (CAT-2938).
 *
 * Fates are pure functions of settled rows, so any planner, at any time,
 * recomputes the same decisions; duplicates and races converge instead of
 * corrupting.
 *
 * Rows are identified per `(nodeId, iteration)`: loop members run once per
 * pass (CAT-2875). Forward edges stay within a pass; the back-edge and exit
 * mappings land with loop execution, and until then back-edges are rejected.
 */

export interface SuccessorDecisions {
	/** Successors with a live input, to enqueue — in edge order. */
	toQueue: StepKey[];
	/** Successors with settled but all-dead inputs, to record as skipped. */
	toSkip: StepKey[];
}

/**
 * Decides the direct successors of the settled step (rules 2–4). `steps`
 * holds the existing rows for those successors and their predecessors, keyed
 * by `stepKeyId`, including the settled step itself.
 */
export function decideSuccessors(
	graph: WorkflowGraph,
	settled: StepKey,
	steps: Record<StepKeyId, StepSummary>,
): SuccessorDecisions {
	const decisions: SuccessorDecisions = { toQueue: [], toSkip: [] };
	for (const successorNodeId of getSuccessorNodeIds(graph, settled.nodeId)) {
		const successor: StepKey = { nodeId: successorNodeId, iteration: settled.iteration };
		// An existing row was decided by an earlier settlement, which announced it.
		if (steps[stepKeyId(successor)]) continue;
		const fate = decideNodeFate(graph, successor, steps);
		if (fate === 'queued') decisions.toQueue.push(successor);
		else if (fate === 'skipped') decisions.toSkip.push(successor);
	}
	return decisions;
}

/** One candidate's fate under rules 2–3; undecidable while a predecessor is unsettled. */
function decideNodeFate(
	graph: WorkflowGraph,
	candidate: StepKey,
	steps: Record<StepKeyId, StepSummary>,
): 'queued' | 'skipped' | 'undecidable' {
	// Back-edges aside: loop iteration is CAT-2875.
	const incoming = graph.edges.filter((edge) => edge.to === candidate.nodeId && !edge.isBackEdge);
	const predecessors = [...new Set(incoming.map((edge) => edge.from))];
	const settled = predecessors.every((nodeId) => {
		const row = steps[stepKeyId({ nodeId, iteration: candidate.iteration })];
		return row !== undefined && isSettledStatus(row.status);
	});
	if (!settled) return 'undecidable';
	return incoming.some((edge) => isLiveEdge(edge, candidate.iteration, steps))
		? 'queued'
		: 'skipped';
}

/** Rule 2. A slot beyond the produced list reads undefined — dead, like null. */
function isLiveEdge(
	edge: GraphEdge,
	iteration: number,
	steps: Record<StepKeyId, StepSummary>,
): boolean {
	const source = steps[stepKeyId({ nodeId: edge.from, iteration })];
	return source?.status === 'completed' && Boolean(source.filledOutputSlots[edge.outputIndex]);
}

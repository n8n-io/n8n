import { getSuccessorNodeIds, type GraphEdge, type WorkflowGraph } from '../graph';
import { isSettledStatus } from './execution.types';
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
 *    least one live incoming edge → it runs (queued). Decidable with none →
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
 */

export interface SuccessorDecisions {
	/** Successors with a live input, to enqueue — in edge order. */
	toQueue: string[];
	/** Successors with settled but all-dead inputs, to record as skipped. */
	toSkip: string[];
}

/**
 * Decides the direct successors of `settledNodeId` (rules 2–4). `steps` holds
 * the existing rows for those successors and their predecessors, including
 * `settledNodeId` itself.
 */
export function decideSuccessors(
	graph: WorkflowGraph,
	settledNodeId: string,
	steps: Record<string, StepSummary>,
): SuccessorDecisions {
	const decisions: SuccessorDecisions = { toQueue: [], toSkip: [] };
	for (const successor of getSuccessorNodeIds(graph, settledNodeId)) {
		// An existing row was decided by an earlier settlement, which announced it.
		if (steps[successor]) continue;
		const fate = decideNodeFate(graph, successor, steps);
		if (fate === 'queued') decisions.toQueue.push(successor);
		else if (fate === 'skipped') decisions.toSkip.push(successor);
	}
	return decisions;
}

/** One node's fate under rules 2–3; undecidable while a predecessor is unsettled. */
function decideNodeFate(
	graph: WorkflowGraph,
	nodeId: string,
	steps: Record<string, StepSummary>,
): 'queued' | 'skipped' | 'undecidable' {
	// Back-edges aside: loop iteration is CAT-2875.
	const incoming = graph.edges.filter((edge) => edge.to === nodeId && !edge.isBackEdge);
	const predecessors = [...new Set(incoming.map((edge) => edge.from))];
	const settled = predecessors.every(
		(id) => steps[id] !== undefined && isSettledStatus(steps[id].status),
	);
	if (!settled) return 'undecidable';
	return incoming.some((edge) => isLiveEdge(edge, steps)) ? 'queued' : 'skipped';
}

/** Rule 2. A slot beyond the produced list reads undefined — dead, like null. */
function isLiveEdge(edge: GraphEdge, steps: Record<string, StepSummary>): boolean {
	const source = steps[edge.from];
	return source?.status === 'completed' && Boolean(source.filledOutputSlots[edge.outputIndex]);
}

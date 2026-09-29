import type { GraphEdge, WorkflowGraph, WorkflowLoop } from '../graph';
import { stepKeyId, isSettledStatus, type StepKey, type StepKeyId } from './execution.types';
import { classifyEdge, sourceRow, targetKey, type EdgeClass } from './iteration-mapping';
import { isTerminalStep } from './loop-ledger';
import type { StepSummary } from './step-store';

/**
 * A **step** is one run of one node, identified by `StepKey`, which is
 * `(nodeId, iteration)`. Outside a loop a node has a single step, at iteration
 * 0. A loop member has one step per pass.
 *
 * Settlement rules (design: CAT-2874):
 *
 * 1. Every step the execution creates eventually settles: completed, failed,
 *    skipped, or cancelled. Settled fates are immutable. The execution is
 *    finished exactly when every step it owes has settled, which
 *    `completion.ts` counts.
 * 2. An edge is live iff its source completed and filled the edge's output
 *    slot; it is dead if the source settled any other way, or left the slot
 *    null. An edge whose source is unsettled is neither yet.
 * 3. A step is decidable once every step its incoming edges read has settled.
 *    Decidable with at least one live incoming edge -> it runs (queued).
 *    Decidable with none -> it is skipped: settled at birth, its own out-edges
 *    all dead.
 * 4. A settlement decides only its direct successors; the cascade is the
 *    event loop. A skip is announced as settled like any other settlement,
 *    and its handler decides the next hop.
 * 5. A planner commits its decisions in one batch, then announces only the
 *    steps it created. A settlement whose announcement is lost is detectable
 *    from the steps alone — a settled one whose successors are decidable but
 *    absent — and re-announced by reconciliation (CAT-2938).
 *
 * Fates are pure functions of settled steps, so any planner, at any time,
 * recomputes the same decisions; duplicates and races converge instead of
 * corrupting.
 *
 * Loops extend those rules rather than replacing them (CAT-2875).
 * `iteration-mapping.ts` decides which iterations an edge connects, and two
 * consequences belong to loops alone:
 *
 * - A batch node's step decides one side of its loop. While the loop runs it
 *   decides the body, and on the terminal step, the one whose loop slot stayed
 *   dead, it decides the nodes after the loop instead. Deciding the other side
 *   too early would skip it, and a later step could not take that back.
 * - Body steps exist for running iterations only. The terminal iteration has
 *   none at all, not even skipped ones, or those skips would cascade through
 *   the body into a further iteration, and on forever. The exclusion lives in
 *   `decideNodeFate`, so anything recomputing fates reaches the same answer,
 *   reconciliation included.
 */

export interface SuccessorDecisions {
	/** Successor steps with a live input, to enqueue — in edge order. */
	toQueue: StepKey[];
	/** Successor steps with settled but all-dead inputs, to record as skipped. */
	toSkip: StepKey[];
}

/**
 * Decides the direct successors of the settled step (rules 2–4).
 *
 * `steps` holds the steps `decisionKeys` names, keyed by `stepKeyId`. Anything
 * less and a decision reads an absent step as one that has not settled, leaving
 * the successor undecided forever. `terminalIterations` holds each loop's
 * terminal iteration by batch node id, omitting the loops that have not ended.
 */
export function decideSuccessors(
	graph: WorkflowGraph,
	loops: WorkflowLoop[],
	settled: StepKey,
	steps: Record<StepKeyId, StepSummary>,
	terminalIterations: Map<string, number>,
): SuccessorDecisions {
	const decisions: SuccessorDecisions = { toQueue: [], toSkip: [] };
	const batchStep = loops.some((loop) => loop.batchNodeId === settled.nodeId)
		? steps[stepKeyId(settled)]
		: undefined;
	const decided = new Set<StepKeyId>();
	const outgoingEdges = graph.edges.filter((edge) => edge.from === settled.nodeId);

	for (const edge of outgoingEdges) {
		const edgeClass = classifyEdge(edge, loops);
		if (batchStep && !batchStepDecides(edgeClass, batchStep)) continue;

		const target = targetKey(edge, edgeClass, settled);
		const targetId = stepKeyId(target);
		// An existing step was decided by an earlier settlement, which announced it.
		// Two edges into one step are one candidate, decided once.
		if (steps[targetId] || decided.has(targetId)) continue;
		decided.add(targetId);

		const fate = decideNodeFate(graph, loops, target, steps, terminalIterations);
		if (fate === 'queued') decisions.toQueue.push(target);
		else if (fate === 'skipped') decisions.toSkip.push(target);
	}

	return decisions;
}

/** Which side of its loop a batch step decides: the body, or what follows. */
function batchStepDecides(edgeClass: EdgeClass, batchStep: StepSummary): boolean {
	return isTerminalStep(batchStep) ? edgeClass === 'exit' : edgeClass !== 'exit';
}

/**
 * Decides what happens to one candidate step, under rules 2 and 3.
 *
 * Four answers, and the last two are the ones to understand:
 *
 * - `queued`, so the step runs
 * - `skipped`, so it settles at once, having run nothing
 * - `undecidable`, so ask again later. Something it reads has not settled yet, or
 *   sits in a loop that has not ended.
 * - `outside`, so it never exists. Nothing reaches it at this pass, which is what
 *   keeps a finished loop from cascading skips through its own body.
 */
function decideNodeFate(
	graph: WorkflowGraph,
	loops: WorkflowLoop[],
	candidate: StepKey,
	steps: Record<StepKeyId, StepSummary>,
	terminalIterations: Map<string, number>,
): 'queued' | 'skipped' | 'undecidable' | 'outside' {
	if (isPastLoopEnd(loops, candidate, steps)) return 'outside';

	let applicable = 0;
	let live = false;
	const incomingEdges = graph.edges.filter((edge) => edge.to === candidate.nodeId);

	for (const edge of incomingEdges) {
		const source = sourceRow(
			edge,
			classifyEdge(edge, loops),
			candidate,
			terminalIterations.get(edge.from),
		);
		if (source.kind === 'none') continue;
		if (source.kind === 'pending') return 'undecidable';

		applicable += 1;
		const sourceStep = steps[stepKeyId(source.key)];
		if (!sourceStep || !isSettledStatus(sourceStep.status)) return 'undecidable';
		if (isLive(sourceStep, edge)) live = true;
	}

	// No edge connects to this step at this iteration, so nothing produces it.
	if (applicable === 0) return 'outside';

	return live ? 'queued' : 'skipped';
}

/**
 * Whether the candidate is a body step of a loop that has already ended.
 *
 * Read from the batch step, not from `terminalIterations`, so anything
 * recomputing fates from the steps alone reaches the same answer.
 */
function isPastLoopEnd(
	loops: WorkflowLoop[],
	candidate: StepKey,
	steps: Record<StepKeyId, StepSummary>,
): boolean {
	const loop = loops.find((l) => l.memberIds.has(candidate.nodeId));
	if (!loop || candidate.nodeId === loop.batchNodeId) return false;

	const batchStep = steps[stepKeyId({ nodeId: loop.batchNodeId, iteration: candidate.iteration })];
	return batchStep !== undefined && isTerminalStep(batchStep);
}

/** Rule 2. A slot beyond the produced list reads undefined — dead, like null. */
function isLive(source: StepSummary, edge: GraphEdge): boolean {
	return source.status === 'completed' && Boolean(source.filledOutputSlots[edge.outputIndex]);
}

/**
 * Names every step `decideSuccessors` will read, so the caller can load them in
 * one query.
 *
 * Four kinds, and each one is read for a reason:
 *
 * - the settled step. For a batch node it says which side of the loop to decide.
 * - each candidate successor. One that already exists was decided earlier.
 * - whatever each candidate's own incoming edges read, to judge that candidate.
 * - for a candidate inside a loop, that loop's batch step at the same pass.
 *
 * This walks the same edges the decision walks, so the caller cannot load a
 * different set from the one read. Loading less is the dangerous mistake: a
 * missing step reads as one that has not settled, and its successor then waits
 * forever.
 */
export function decisionKeys(
	graph: WorkflowGraph,
	loops: WorkflowLoop[],
	settled: StepKey,
	terminalIterations: Map<string, number>,
): StepKey[] {
	const keys = new Map<StepKeyId, StepKey>([[stepKeyId(settled), settled]]);
	const add = (key: StepKey) => keys.set(stepKeyId(key), key);

	const outgoingEdges = graph.edges.filter((edge) => edge.from === settled.nodeId);

	for (const edge of outgoingEdges) {
		const target = targetKey(edge, classifyEdge(edge, loops), settled);
		add(target);

		const incomingEdges = graph.edges.filter((inEdge) => inEdge.to === target.nodeId);

		for (const inEdge of incomingEdges) {
			const source = sourceRow(
				inEdge,
				classifyEdge(inEdge, loops),
				target,
				terminalIterations.get(inEdge.from),
			);
			if (source.kind === 'row') add(source.key);
		}

		const loop = loops.find((l) => l.memberIds.has(target.nodeId));
		if (loop) add({ nodeId: loop.batchNodeId, iteration: target.iteration });
	}

	return [...keys.values()];
}

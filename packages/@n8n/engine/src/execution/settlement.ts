import type { GraphEdge, StoredWorkflowGraph, WorkflowGraph, WorkflowLoop } from '../graph';
import {
	isSettledStatus,
	nodePassId,
	type NodePass,
	type NodePassId,
	type StepKey,
	type StepSource,
	type StepSources,
} from './execution.types';
import { classifyEdge, sourceRow, targetKey, type EdgeClass } from './iteration-mapping';
import { isTerminalStep } from './loop-ledger';
import type { StepSummary } from './step-store';

/**
 * A **step** is one run of one node, identified by `StepKey`, which is
 * `(nodeId, iteration, branch)`. A **node-pass** is `(nodeId, iteration)`:
 * outside a loop a node has one node-pass, at iteration 0, and a loop member
 * has one per pass. A node-pass has one step per run (see "Runs" below), so a
 * single step at branch 0 unless something upstream converged.
 *
 * Settlement rules (design: CAT-2874):
 *
 * 1. Every step the execution creates eventually settles: completed, failed,
 *    skipped, or cancelled. Settled fates are immutable. The execution is
 *    finished exactly when every node-pass it owes has settled, which
 *    `completion.ts` counts.
 * 2. An edge is live iff its source completed and filled the edge's output
 *    slot; it is dead if the source settled any other way, or left the slot
 *    null. An edge whose source is unsettled is neither yet.
 * 3. A node-pass is decidable once every node-pass its incoming edges read has
 *    been decided and all of its steps have settled. Decidable with at least
 *    one live arrival -> one queued step per run. Decidable with none -> a
 *    single skipped step: settled at birth, its own out-edges all dead.
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
 * Runs (v1 parity: a node runs once per live delivery into a slot):
 *
 * - An **arrival** is a live step feeding one input slot through one edge.
 *   Each slot lists its arrivals in edge order, then by the source's branch.
 * - A node-pass has as many runs as its longest list. Run `r` reads the `r`-th
 *   arrival of each slot, or nothing where a slot's list is shorter. With one
 *   slot, that is one run per arrival. With several (a join), it pairs the
 *   arrivals by rank.
 * - The arrival a run reads is stored on its step (`StepSource`), so running
 *   the step needs no routing.
 * - The exception is a batch node: it runs once per pass and reads every run of
 *   its sources itself (`store-loop-reader.ts`), so a loop never forks.
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
 *   `decideNodePass`, so anything recomputing fates reaches the same answer,
 *   reconciliation included.
 */

export interface PlannedStep extends StepKey {
	/** What the step reads, per input slot. */
	sources: StepSources;
}

export interface SuccessorDecisions {
	/** Successor steps with a live input, to enqueue — in edge order, then by run. */
	toQueue: PlannedStep[];
	/** Live successors whose outputs were seeded at start, to record as completed. */
	toSeed: PlannedStep[];
	/** Successor node-passes with settled but all-dead inputs, to record as skipped. */
	toSkip: PlannedStep[];
}

/**
 * Decides the direct successors of the settled step (rules 2–4).
 *
 * `passes` holds every step of the node-passes `decisionPasses` names, keyed by
 * `nodePassId`. Anything less and a decision reads an absent node-pass as one
 * that has not been decided, leaving the successor undecided forever.
 * `terminalIterations` holds each loop's terminal iteration by batch node id,
 * omitting the loops that have not ended.
 */
export function decideSuccessors(
	graph: StoredWorkflowGraph,
	loops: WorkflowLoop[],
	settled: StepKey,
	passes: Record<NodePassId, StepSummary[]>,
	terminalIterations: Map<string, number>,
): SuccessorDecisions {
	const decisions: SuccessorDecisions = { toQueue: [], toSeed: [], toSkip: [] };
	const seededIds = new Set(graph.seeded);
	// A batch node runs once per pass, so its node-pass has a single step.
	const batchStep = loops.some((loop) => loop.batchNodeId === settled.nodeId)
		? passes[nodePassId(settled)]?.[0]
		: undefined;
	const decided = new Set<NodePassId>();
	const outgoingEdges = graph.edges.filter((edge) => edge.from === settled.nodeId);

	for (const edge of outgoingEdges) {
		const edgeClass = classifyEdge(edge, loops);
		if (batchStep && !batchStepDecides(edgeClass, batchStep)) continue;

		const target = targetKey(edge, edgeClass, settled);
		const targetId = nodePassId(target);
		// A node-pass with steps was decided by an earlier settlement, which
		// announced them. Two edges into one node-pass are one candidate, decided once.
		if (passes[targetId] || decided.has(targetId)) continue;
		decided.add(targetId);

		const fate = decideNodePass(graph, loops, target, passes, terminalIterations);
		if (fate.kind === 'runs') {
			(seededIds.has(target.nodeId) ? decisions.toSeed : decisions.toQueue).push(...fate.steps);
		} else if (fate.kind === 'skipped') {
			decisions.toSkip.push(fate.step);
		}
	}

	return decisions;
}

/** Which side of its loop a batch step decides: the body, or what follows. */
function batchStepDecides(edgeClass: EdgeClass, batchStep: StepSummary): boolean {
	return isTerminalStep(batchStep) ? edgeClass === 'exit' : edgeClass !== 'exit';
}

/**
 * What happens to one candidate node-pass, under rules 2 and 3.
 *
 * - `runs`, so it runs once per run, see "Runs" above
 * - `skipped`, so it settles at once, having run nothing
 * - `undecidable`, so ask again later. Something it reads has not been decided,
 *   has not settled, or sits in a loop that has not ended.
 * - `outside`, so it never exists. Nothing reaches it at this pass, which is what
 *   keeps a finished loop from cascading skips through its own body.
 */
type NodePassFate =
	| { kind: 'runs'; steps: PlannedStep[] }
	| { kind: 'skipped'; step: PlannedStep }
	| { kind: 'undecidable' }
	| { kind: 'outside' };

function decideNodePass(
	graph: WorkflowGraph,
	loops: WorkflowLoop[],
	candidate: NodePass,
	passes: Record<NodePassId, StepSummary[]>,
	terminalIterations: Map<string, number>,
): NodePassFate {
	if (isPastLoopEnd(loops, candidate, passes)) return { kind: 'outside' };

	let applicable = 0;
	let slotCount = 0;
	// Per input slot: the live steps feeding it, in edge order, then by branch.
	const arrivals: StepSource[][] = [];
	const incomingEdges = graph.edges.filter((edge) => edge.to === candidate.nodeId);

	for (const edge of incomingEdges) {
		const source = sourceRow(
			edge,
			classifyEdge(edge, loops),
			candidate,
			terminalIterations.get(edge.from),
		);
		if (source.kind === 'none') continue;
		if (source.kind === 'pending') return { kind: 'undecidable' };

		applicable += 1;
		// No step means the source node-pass is not decided yet. A decided one always
		// has at least one step, a skipped one if nothing arrived live.
		const sourceSteps = passes[nodePassId(source.key)];
		if (!sourceSteps?.every((step) => isSettledStatus(step.status))) {
			return { kind: 'undecidable' };
		}

		slotCount = Math.max(slotCount, edge.inputIndex + 1);
		const slot = (arrivals[edge.inputIndex] ??= []);
		for (const step of sourceSteps) {
			if (!isLive(step, edge)) continue;
			const { nodeId, iteration, branch } = step;
			slot.push({ nodeId, iteration, branch, outputIndex: edge.outputIndex });
		}
	}

	// No edge connects to this node-pass at this iteration, so nothing produces it.
	if (applicable === 0) return { kind: 'outside' };

	const longest = Math.max(0, ...arrivals.map((slot) => slot?.length ?? 0));
	// A batch node runs once per pass, whatever arrives: it reads every run of its
	// sources itself, so the sources recorded on its step are only the first ones.
	const isBatchNode = loops.some((loop) => loop.batchNodeId === candidate.nodeId);
	const runCount = isBatchNode ? Math.min(longest, 1) : longest;

	const sourcesOfRun = (run: number): StepSources =>
		Array.from({ length: slotCount }, (_, slot) => arrivals[slot]?.[run] ?? null);

	if (runCount === 0) {
		return { kind: 'skipped', step: { ...candidate, branch: 0, sources: sourcesOfRun(0) } };
	}

	return {
		kind: 'runs',
		steps: Array.from({ length: runCount }, (_, run) => ({
			...candidate,
			branch: run,
			sources: sourcesOfRun(run),
		})),
	};
}

/**
 * Whether the candidate is a body node-pass of a loop that has already ended.
 *
 * Read from the batch step, not from `terminalIterations`, so anything
 * recomputing fates from the steps alone reaches the same answer.
 */
function isPastLoopEnd(
	loops: WorkflowLoop[],
	candidate: NodePass,
	passes: Record<NodePassId, StepSummary[]>,
): boolean {
	const loop = loops.find((l) => l.memberIds.has(candidate.nodeId));
	if (!loop || candidate.nodeId === loop.batchNodeId) return false;

	const batchPass = { nodeId: loop.batchNodeId, iteration: candidate.iteration };
	const batchStep = passes[nodePassId(batchPass)]?.[0];
	return batchStep !== undefined && isTerminalStep(batchStep);
}

/** Rule 2. A slot beyond the produced list reads undefined — dead, like null. */
function isLive(source: StepSummary, edge: GraphEdge): boolean {
	return source.status === 'completed' && Boolean(source.filledOutputSlots[edge.outputIndex]);
}

/**
 * Names every node-pass `decideSuccessors` will read, so the caller can load
 * all of their steps in one query.
 *
 * Four kinds, and each one is read for a reason:
 *
 * - the settled step's node-pass. For a batch node it says which side of the
 *   loop to decide.
 * - each candidate successor. One that already has steps was decided earlier.
 * - whatever each candidate's own incoming edges read, to judge that candidate.
 * - for a candidate inside a loop, that loop's batch node at the same pass.
 *
 * This walks the same edges the decision walks, so the caller cannot load a
 * different set from the one read. Loading less is the dangerous mistake: a
 * missing node-pass reads as one that has not been decided, and its successor
 * then waits forever.
 */
export function decisionPasses(
	graph: WorkflowGraph,
	loops: WorkflowLoop[],
	settled: NodePass,
	terminalIterations: Map<string, number>,
): NodePass[] {
	const passes = new Map<NodePassId, NodePass>();
	const add = ({ nodeId, iteration }: NodePass) =>
		passes.set(nodePassId({ nodeId, iteration }), { nodeId, iteration });
	add(settled);

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

	return [...passes.values()];
}

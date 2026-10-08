import { AdmittanceRejectedError, type AdmittanceService } from '../admittance';
import {
	deriveLoops,
	findTriggerNode,
	getDescendantNodeIds,
	GraphValidationError,
	validateExecutableGraph,
	type WorkflowGraph,
	type WorkflowLoop,
} from '../graph';
import type { OrchestrationMessage, WorkQueue } from '../queue';
import type { ResponseExpectation } from '../response-channel';
import type { ExecutionStore } from './execution-store';
import { LOOP_SLOT } from './loop-ledger';
import type {
	CallerContext,
	ExecutionMode,
	SeededSteps,
	TriggerOutputs,
	WorkflowDocument,
} from './execution.types';

export interface StartExecutionRequest {
	workflowId: string;
	graph: WorkflowGraph;
	/**
	 * The workflow the graph came from, stored beside the execution and reported
	 * on the read. The engine never reads a field out of it.
	 */
	workflow: WorkflowDocument;
	/** Trigger step's output slots, one entry per output. */
	triggerOutputs?: TriggerOutputs | null;
	/** Steps to record as completed at start, with the outputs the caller holds. */
	seededSteps?: SeededSteps | null;
	mode?: ExecutionMode;
	/** Stored with the execution and handed to every step executor. */
	callerContext: CallerContext;
	/** What kind of a response the caller expects. Defaults to 'none' */
	responseExpectation?: ResponseExpectation;
	/**
	 * Caller-minted, so the caller can record state against the run before it
	 * starts. The engine never mints one.
	 */
	executionId: string;
}

export interface StartExecutionResult {
	executionId: string;
}

export class StartExecutionService {
	constructor(
		private readonly admittance: AdmittanceService,
		private readonly executionStore: ExecutionStore,
		private readonly workQueue: WorkQueue<OrchestrationMessage>,
		private readonly validateGraph: (graph: WorkflowGraph) => void = validateExecutableGraph,
	) {}

	async start(request: StartExecutionRequest): Promise<StartExecutionResult> {
		// Rejected before admittance: a graph that can never run shouldn't spend
		// admittance capacity, and nothing is persisted for it.
		this.validateGraph(request.graph);
		validateSeededSteps(request.graph, request.seededSteps ?? {});

		const decision = await this.admittance.evaluate({ workflowId: request.workflowId });
		if (!decision.accept) {
			throw new AdmittanceRejectedError(decision.reason);
		}

		// The caller's id is authoritative: it already has a session registered
		// against it, so the store never gets to rename the run.
		const { executionId } = request;

		await this.executionStore.createExecution({
			id: executionId,
			workflowId: request.workflowId,
			// admitted; a worker flips this to 'running' when it starts
			status: 'queued',
			mode: request.mode ?? 'production',
			graph: markSeededNodes(request.graph, request.seededSteps ?? {}),
			workflow: request.workflow,
			triggerOutputs: request.triggerOutputs ?? null,
			seededSteps: request.seededSteps ?? null,
			callerContext: request.callerContext,
			responseExpectation: request.responseExpectation ?? { kind: 'none' },
		});

		// TODO(CAT-2938): the persist above and this publish aren't atomic — a
		// crash between them leaves the execution 'queued' until the
		// reconciliation sweep (not yet built) re-dispatches it.
		await this.workQueue.publish({
			type: 'execution:enqueued',
			executionId,
		});

		return { executionId };
	}
}

/**
 * Labels the graph nodes as seeded according to the steps passed in, so we
 * know to use the seeded data during execution. A label the caller put on a
 * node is dropped: only `seededSteps` decides.
 */
function markSeededNodes(graph: WorkflowGraph, seededSteps: SeededSteps): WorkflowGraph {
	const seeded = new Set(Object.keys(seededSteps));
	return {
		...graph,
		nodes: graph.nodes.map(({ seeded: _, ...node }) =>
			seeded.has(node.id) ? { ...node, seeded: true } : node,
		),
	};
}

/**
 * Rejects seeded steps that a settlement could not record correctly.
 *
 * When the run reaches a seeded node, the settlement that would have queued it
 * records it as completed with the seeded outputs for that pass instead. That
 * only works when:
 *
 * - no entry names the trigger: its outputs arrive as `triggerOutputs`.
 * - the trigger reaches every seeded node: no settlement ever reaches any
 *   other node, so its outputs would never be used.
 * - a node outside any loop has exactly one pass: it has no other.
 * - a loop is seeded whole or not at all: the batch node with t + 1 passes,
 *   filling its loop slot on every pass but the last, and every member with t.
 *   The loop replays through those passes as the back-edge drives it, and the
 *   loop ledger reads the loop's end from the batch node's last pass, so any
 *   other shape would run passes the caller already holds or leave the loop
 *   unfinished.
 */
function validateSeededSteps(graph: WorkflowGraph, seededSteps: SeededSteps): void {
	// The graph was validated first, so the trigger exists.
	const trigger = findTriggerNode(graph);
	const reachable = new Set(trigger ? getDescendantNodeIds(graph, trigger.id) : []);
	const loops = deriveLoops(graph);
	const loopMemberIds = new Set(loops.flatMap((loop) => [...loop.memberIds]));

	for (const [nodeId, passes] of Object.entries(seededSteps)) {
		if (nodeId === trigger?.id) {
			throw new GraphValidationError(
				'The trigger cannot be seeded; send its payload as triggerOutputs',
			);
		}
		if (!reachable.has(nodeId)) {
			throw new GraphValidationError(
				`Seeded step names node ${nodeId}, which the trigger does not reach`,
			);
		}
		if (passes.length === 0) {
			throw new GraphValidationError(`Node ${nodeId} is seeded with no passes`);
		}
		if (!loopMemberIds.has(nodeId) && passes.length > 1) {
			throw new GraphValidationError(
				`Node ${nodeId} is outside any loop and has one pass, so it cannot be seeded with ${passes.length}`,
			);
		}
	}
	for (const loop of loops) validateSeededLoop(loop, seededSteps);
}

/** A loop is seeded whole or not at all. See `validateSeededSteps`. */
function validateSeededLoop(loop: WorkflowLoop, seededSteps: SeededSteps): void {
	const seeded = new Set(Object.keys(seededSteps));
	const seededMemberIds = [...loop.memberIds].filter((id) => seeded.has(id));
	if (seededMemberIds.length === 0) return;

	if (!seeded.has(loop.batchNodeId)) {
		throw new GraphValidationError(
			`Node ${seededMemberIds[0]} is seeded but ${loop.batchNodeId}, the batch node of its loop, is not; a loop is seeded whole or not at all`,
		);
	}

	const batchPasses = seededSteps[loop.batchNodeId];
	const passes = batchPasses.length - 1;
	batchPasses.forEach((outputs, iteration) => {
		const fillsLoopSlot = outputs[LOOP_SLOT] !== null && outputs[LOOP_SLOT] !== undefined;
		if (iteration < passes && !fillsLoopSlot) {
			throw new GraphValidationError(
				`Batch node ${loop.batchNodeId} is seeded past iteration ${iteration}, but that pass does not fill its loop slot, so the loop ended there`,
			);
		}
		if (iteration === passes && fillsLoopSlot) {
			throw new GraphValidationError(
				`Batch node ${loop.batchNodeId} fills its loop slot on its last seeded pass, iteration ${iteration}, so the loop has not ended; a loop is seeded whole or not at all`,
			);
		}
	});

	for (const memberId of loop.memberIds) {
		if (memberId === loop.batchNodeId) continue;
		const count = seeded.has(memberId) ? seededSteps[memberId].length : 0;
		if (count !== passes) {
			throw new GraphValidationError(
				`Node ${memberId} is seeded for ${count} passes of the loop of ${loop.batchNodeId}, which has ${passes}; a loop is seeded whole or not at all`,
			);
		}
	}
}

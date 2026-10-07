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
	SeededStep,
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
	seededSteps?: SeededStep[] | null;
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
		validateSeededSteps(request.graph, request.seededSteps ?? []);

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
			graph: request.graph,
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
 * Rejects seeded steps that the start handler could not record correctly.
 *
 * The start handler turns each seeded step into a completed step row for its
 * node and iteration. That only works when:
 *
 * - no seeded step names the trigger: its outputs arrive as `triggerOutputs`.
 * - the trigger reaches every seeded node: the completion check counts only
 *   reachable nodes, so a completed row outside that set would let the run
 *   finish while other steps are still outstanding.
 * - a node is seeded at most once per iteration, from iteration 0 up without
 *   gaps: the store keeps one row per node and iteration and would silently
 *   drop a second, and a missing pass would never be planned.
 * - a node outside any loop is seeded at iteration 0 only: it has no other pass.
 * - a loop is seeded whole or not at all: the batch node at iterations 0 to t,
 *   with its loop slot filled on every pass but the last, and every member at
 *   iterations 0 to t - 1. The loop ledger reads the loop's end from the batch
 *   node's last row, and the completion check expects exactly these rows, so
 *   any other shape would run passes the caller already holds or leave the
 *   loop unfinished.
 */
function validateSeededSteps(graph: WorkflowGraph, seededSteps: SeededStep[]): void {
	// The graph was validated first, so the trigger exists.
	const trigger = findTriggerNode(graph);
	const reachable = new Set(trigger ? getDescendantNodeIds(graph, trigger.id) : []);

	const stepsByNode = new Map<string, SeededStep[]>();
	for (const step of seededSteps) {
		if (step.nodeId === trigger?.id) {
			throw new GraphValidationError(
				'The trigger cannot be seeded; send its payload as triggerOutputs',
			);
		}
		if (!reachable.has(step.nodeId)) {
			throw new GraphValidationError(
				`Seeded step names node ${step.nodeId}, which the trigger does not reach`,
			);
		}
		const steps = stepsByNode.get(step.nodeId) ?? [];
		steps.push(step);
		stepsByNode.set(step.nodeId, steps);
	}

	// Sorted, a node's iterations must read 0, 1, 2, ...: a repeat or a gap breaks the sequence.
	for (const [nodeId, steps] of stepsByNode) {
		steps.sort((a, b) => iterationOf(a) - iterationOf(b));
		steps.forEach((step, index) => {
			const iteration = iterationOf(step);
			if (index > 0 && iteration === iterationOf(steps[index - 1])) {
				throw new GraphValidationError(
					`Node ${nodeId} is seeded more than once at iteration ${iteration}`,
				);
			}
			if (iteration !== index) {
				throw new GraphValidationError(
					`Node ${nodeId} is seeded at iteration ${iteration} but not at iteration ${index}`,
				);
			}
		});
	}

	const loops = deriveLoops(graph);
	const loopMemberIds = new Set(loops.flatMap((loop) => [...loop.memberIds]));
	for (const [nodeId, steps] of stepsByNode) {
		if (!loopMemberIds.has(nodeId) && steps.length > 1) {
			throw new GraphValidationError(
				`Node ${nodeId} is outside any loop and has one pass, so it cannot be seeded at iteration 1`,
			);
		}
	}
	for (const loop of loops) validateSeededLoop(loop, stepsByNode);
}

/** A loop is seeded whole or not at all. See `validateSeededSteps`. */
function validateSeededLoop(loop: WorkflowLoop, stepsByNode: Map<string, SeededStep[]>): void {
	const seededMemberIds = [...loop.memberIds].filter((id) => stepsByNode.has(id));
	if (seededMemberIds.length === 0) return;

	const batchSteps = stepsByNode.get(loop.batchNodeId);
	if (!batchSteps) {
		throw new GraphValidationError(
			`Node ${seededMemberIds[0]} is seeded but ${loop.batchNodeId}, the batch node of its loop, is not; a loop is seeded whole or not at all`,
		);
	}

	// Already sorted by iteration, with no gaps.
	const passes = batchSteps.length - 1;
	batchSteps.forEach((step, iteration) => {
		const fillsLoopSlot = step.outputs[LOOP_SLOT] !== null && step.outputs[LOOP_SLOT] !== undefined;
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
		const count = stepsByNode.get(memberId)?.length ?? 0;
		if (count !== passes) {
			throw new GraphValidationError(
				`Node ${memberId} is seeded for ${count} passes of the loop of ${loop.batchNodeId}, which has ${passes}; a loop is seeded whole or not at all`,
			);
		}
	}
}

const iterationOf = (step: SeededStep): number => step.iteration ?? 0;

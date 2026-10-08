import { AdmittanceRejectedError, type AdmittanceService } from '../admittance';
import {
	deriveLoops,
	findTriggerNode,
	getDescendantNodeIds,
	GraphValidationError,
	validateExecutableGraph,
	type WorkflowGraph,
} from '../graph';
import type { OrchestrationMessage, WorkQueue } from '../queue';
import type { ResponseExpectation } from '../response-channel';
import type { ExecutionStore } from './execution-store';
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
 * only works for a node that:
 *
 * - is not the trigger: its outputs arrive as `triggerOutputs`.
 * - the trigger can reach: no settlement ever reaches any other node, so its
 *   outputs would never be used.
 * - is not in a loop, and so has exactly one pass. TODO(CAT-4875): accept a
 *   loop's passes.
 */
function validateSeededSteps(graph: WorkflowGraph, seededSteps: SeededSteps): void {
	// The graph was validated first, so the trigger exists.
	const trigger = findTriggerNode(graph);
	const reachable = new Set(trigger ? getDescendantNodeIds(graph, trigger.id) : []);
	const loopByMember = new Map(
		deriveLoops(graph).flatMap((loop) => [...loop.memberIds].map((id) => [id, loop] as const)),
	);
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
		const loop = loopByMember.get(nodeId);
		if (loop) {
			throw new GraphValidationError(
				`Seeded step names node ${nodeId}, which is inside the loop of ${loop.batchNodeId}; a loop member runs once per pass and cannot be seeded`,
			);
		}
		if (passes.length !== 1) {
			throw new GraphValidationError(
				`Node ${nodeId} is seeded with ${passes.length} passes, and a node outside a loop has one`,
			);
		}
	}
}

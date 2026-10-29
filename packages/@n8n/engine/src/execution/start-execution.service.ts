import { AdmittanceRejectedError, type AdmittanceService } from '../admittance';
import {
	deriveLoops,
	findTriggerNode,
	getDescendantNodeIds,
	GraphValidationError,
	validateExecutableGraph,
	type StoredWorkflowGraph,
	type WorkflowGraph,
} from '../graph';
import type { OrchestrationMessage, WorkQueue } from '../queue';
import type { ResponseExpectation } from '../response-channel';
import { ExecutionNotFoundError, type ExecutionStore } from './execution-store';
import {
	isLiveExecutionStatus,
	type CallerContext,
	type ExecutionMode,
	type ParentLink,
	type SeededSteps,
	type TriggerOutputs,
	type WorkflowDocument,
} from './execution.types';
import { StepNotFoundError, type StepStore } from './step-store';

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
	seededSteps?: SeededSteps;
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
	/** The execution and step that asked for this one. Absent for a top-level run. */
	parent?: ParentLink;
}

export interface StartExecutionResult {
	executionId: string;
}

/**
 * The parent link names an execution or a step that cannot have asked for
 * this one. The engine builds the link from rows it holds, so this is a bug
 * in the caller, not a request to refuse politely.
 */
export class InvalidParentLinkError extends Error {
	constructor(
		readonly reason: InvalidParentLinkReason,
		detail: string,
	) {
		super(`Invalid parent link (${reason}): ${detail}`);
		this.name = 'InvalidParentLinkError';
	}
}

export type InvalidParentLinkReason =
	| 'execution-not-found'
	| 'execution-ended'
	| 'step-not-found'
	| 'step-of-another-execution'
	| 'step-not-waiting'
	| 'step-not-running';

export class StartExecutionService {
	constructor(
		private readonly admittance: AdmittanceService,
		private readonly executionStore: ExecutionStore,
		private readonly stepStore: StepStore,
		private readonly workQueue: WorkQueue<OrchestrationMessage>,
		private readonly validateGraph: (graph: WorkflowGraph) => void = validateExecutableGraph,
	) {}

	async start(request: StartExecutionRequest): Promise<StartExecutionResult> {
		// Rejected before admittance: a graph that can never run shouldn't spend
		// admittance capacity, and nothing is persisted for it.
		this.validateGraph(request.graph);
		validateSeededSteps(request.graph, request.seededSteps ?? {});
		if (request.parent) await this.validateParent(request.parent);

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
			graph: toStoredGraph(request.graph, request.seededSteps ?? {}),
			workflow: request.workflow,
			triggerOutputs: request.triggerOutputs ?? null,
			seededSteps: request.seededSteps,
			callerContext: request.callerContext,
			responseExpectation: request.responseExpectation ?? { kind: 'none' },
			parent: request.parent ?? null,
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

	/**
	 * The link has no foreign key: a parent is pruned while its sub-executions
	 * stay, so the rows are independent and this is where the link is checked.
	 * The parent must be live and the step must be its own, in the state that
	 * asks for a sub-execution: suspended when it waits for this one, still
	 * running when it does not. A step starts nothing once it has settled.
	 */
	private async validateParent(parent: ParentLink): Promise<void> {
		const [execution, step] = await Promise.all([
			this.executionStore.loadExecution(parent.executionId).catch(absentAsInvalid),
			this.stepStore.loadStep(parent.stepId).catch(absentAsInvalid),
		]);
		if (!isLiveExecutionStatus(execution.status)) {
			throw new InvalidParentLinkError(
				'execution-ended',
				`execution ${parent.executionId} is ${execution.status}`,
			);
		}
		if (step.executionId !== parent.executionId) {
			throw new InvalidParentLinkError(
				'step-of-another-execution',
				`step ${parent.stepId} belongs to execution ${step.executionId}, not ${parent.executionId}`,
			);
		}
		if (parent.awaited && step.status !== 'waiting') {
			throw new InvalidParentLinkError(
				'step-not-waiting',
				`step ${parent.stepId} is ${step.status}`,
			);
		}
		if (!parent.awaited && step.status !== 'running') {
			throw new InvalidParentLinkError(
				'step-not-running',
				`step ${parent.stepId} is ${step.status}`,
			);
		}
	}
}

/** A missing parent row is an invalid link, not a lookup failure of its own. */
function absentAsInvalid(error: unknown): never {
	if (error instanceof ExecutionNotFoundError) {
		throw new InvalidParentLinkError('execution-not-found', error.message);
	}
	if (error instanceof StepNotFoundError) {
		throw new InvalidParentLinkError('step-not-found', error.message);
	}
	throw error;
}

/**
 * Records which nodes are seeded on the stored graph, so we know to use the
 * seeded data during execution.
 */
function toStoredGraph(graph: WorkflowGraph, seededSteps: SeededSteps): StoredWorkflowGraph {
	return { ...graph, seeded: Object.keys(seededSteps) };
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

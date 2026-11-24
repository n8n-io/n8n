import { AdmittanceRejectedError, type AdmittanceService } from '../admittance';
import {
	createNodeLabeler,
	deriveLoops,
	findTriggerNode,
	getDescendantNodeIds,
	GraphValidationError,
	validateExecutableGraph,
	type StoredWorkflowGraph,
	type WorkflowGraph,
	type WorkflowLoop,
} from '../graph';
import type { LifecycleEventSubscription } from '../lifecycle-events';
import type { OrchestrationMessage, WorkQueuePublisher } from '../queue';
import type { ResponseExpectation } from '../response-channel';
import {
	ExecutionNotFoundError,
	ParentExecutionEndedError,
	type ExecutionStore,
} from './execution-store';
import {
	isLiveExecutionStatus,
	type CallerContext,
	type ExecutionMode,
	type ParentLink,
	type SeededSteps,
	type TriggerOutputs,
	type WorkflowDocument,
} from './execution.types';
import { LOOP_SLOT } from './loop-ledger';
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
	/** Which lifecycle events the caller subscribes to. Missing means none. */
	lifecycleEventSubscription?: LifecycleEventSubscription;
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

/** The parent link names a missing row, or a row that cannot start a sub-execution now. */
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
	| 'execution-not-live'
	| 'step-not-found'
	| 'step-of-another-execution'
	| 'step-not-waiting'
	| 'step-not-running';

export class StartExecutionService {
	constructor(
		private readonly admittance: AdmittanceService,
		private readonly executionStore: ExecutionStore,
		private readonly stepStore: StepStore,
		private readonly workQueue: WorkQueuePublisher<OrchestrationMessage>,
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

		try {
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
				lifecycleEventSubscription: request.lifecycleEventSubscription,
			});
		} catch (error) {
			endedParentAsInvalid(error);
		}

		// The persist above and this publish aren't atomic. A crash between them
		// leaves the execution 'queued' until the reconciliation sweeper
		// publishes the event again.
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
	 *
	 * A parent can end between this check and the insert. The store repeats the
	 * check under a lock when it writes the row, so that case refuses too.
	 */
	private async validateParent(parent: ParentLink): Promise<void> {
		const [status, step] = await Promise.all([
			this.executionStore.loadExecutionStatus(parent.executionId).catch(absentAsInvalid),
			this.stepStore.loadStep(parent.stepId).catch(absentAsInvalid),
		]);
		if (!isLiveExecutionStatus(status)) {
			throw new InvalidParentLinkError(
				'execution-not-live',
				`execution ${parent.executionId} is ${status}`,
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

/** A parent that ended before the row was written is an invalid link. */
function endedParentAsInvalid(error: unknown): never {
	if (error instanceof ParentExecutionEndedError) {
		throw new InvalidParentLinkError('execution-not-live', error.message);
	}
	throw error;
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
 * Rejects seeded steps the run could not use.
 *
 * A seeded node does not run. When the run reaches it, settlement records it
 * as completed with the seeded outputs for that pass, and the run goes on from
 * there. Settlement throws if it reaches a seeded node and finds no outputs
 * for that pass, so this check makes sure that cannot happen:
 *
 * - The trigger cannot be seeded. Its outputs arrive as `triggerOutputs`.
 * - Every seeded node must be downstream of the trigger. The run never
 *   reaches any other node, so its seeded outputs would never be used.
 * - A node outside any loop runs once, so it must have exactly one pass.
 * - A loop is seeded whole or not at all. The caller must seed the batch node
 *   with t + 1 passes, where every pass but the last fills the loop slot and
 *   the last one does not, and every other node in the loop with exactly t
 *   passes. The batch node's outputs decide how many times the loop runs, and
 *   the loop ends when a batch pass does not fill the loop slot. So fewer
 *   member passes would leave a pass without outputs, and a batch node whose
 *   last pass still fills the loop slot would leave the loop unfinished.
 */
function validateSeededSteps(graph: WorkflowGraph, seededSteps: SeededSteps): void {
	// The graph was validated first, so the trigger exists.
	const trigger = findTriggerNode(graph);
	const reachable = new Set(trigger ? getDescendantNodeIds(graph, trigger.id) : []);
	const loops = deriveLoops(graph);
	const loopMemberIds = union(loops.map((loop) => loop.memberIds));
	const name = createNodeLabeler(graph);

	for (const [nodeId, passes] of Object.entries(seededSteps)) {
		if (nodeId === trigger?.id) {
			throw new GraphValidationError(
				'The trigger cannot be seeded; send its payload as triggerOutputs',
			);
		}
		if (!reachable.has(nodeId)) {
			throw new GraphValidationError(
				`Seeded step names node ${name(nodeId)}, which the trigger does not reach`,
			);
		}
		if (passes.length === 0) {
			throw new GraphValidationError(`Node ${name(nodeId)} is seeded with no passes`);
		}
		if (!loopMemberIds.has(nodeId) && passes.length > 1) {
			throw new GraphValidationError(
				`Node ${name(nodeId)} is seeded with ${passes.length} passes, and a node outside a loop has one`,
			);
		}
	}
	for (const loop of loops) validateSeededLoop(loop, seededSteps, name);
}

/** Checks that a loop is seeded whole or not at all. See `validateSeededSteps` for why. */
function validateSeededLoop(
	loop: WorkflowLoop,
	seededSteps: SeededSteps,
	name: (nodeId: string) => string,
): void {
	const seeded = new Set(Object.keys(seededSteps));
	const seededMemberId = find(loop.memberIds, (id) => seeded.has(id));
	if (seededMemberId === undefined) return;

	const batch = name(loop.batchNodeId);
	if (!seeded.has(loop.batchNodeId)) {
		throw new GraphValidationError(
			`Node ${name(seededMemberId)} is seeded but ${batch}, the batch node of its loop, is not; a loop is seeded whole or not at all`,
		);
	}

	const batchPasses = seededSteps[loop.batchNodeId];
	const passes = batchPasses.length - 1;
	batchPasses.forEach((outputs, iteration) => {
		const fillsLoopSlot = outputs[LOOP_SLOT] !== null && outputs[LOOP_SLOT] !== undefined;
		if (iteration < passes && !fillsLoopSlot) {
			throw new GraphValidationError(
				`Batch node ${batch} is seeded past iteration ${iteration}, but that pass does not fill its loop slot, so the loop ended there`,
			);
		}
		if (iteration === passes && fillsLoopSlot) {
			throw new GraphValidationError(
				`Batch node ${batch} fills its loop slot on its last seeded pass, iteration ${iteration}, so the loop has not ended; a loop is seeded whole or not at all`,
			);
		}
	});

	for (const memberId of loop.memberIds) {
		if (memberId === loop.batchNodeId) continue;
		const count = seeded.has(memberId) ? seededSteps[memberId].length : 0;
		if (count !== passes) {
			throw new GraphValidationError(
				`Node ${name(memberId)} is seeded for ${count} passes of the loop of ${batch}, which has ${passes}; a loop is seeded whole or not at all`,
			);
		}
	}
}

function find<T>(items: Iterable<T>, matches: (item: T) => boolean): T | undefined {
	for (const item of items) if (matches(item)) return item;
	return undefined;
}

function union<T>(sets: Array<Set<T>>): Set<T> {
	const result = new Set<T>();
	for (const set of sets) for (const item of set) result.add(item);
	return result;
}

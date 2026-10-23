import { UnexpectedError } from '../common';
import {
	deriveLoops,
	findTriggerNode,
	getDescendantNodeIds,
	getSuccessorNodeIds,
	type GraphNode,
} from '../graph';
import type { LifecycleEventPublisher } from '../lifecycle-events';
import type { ExecutionResponseSender } from '../response-channel';
import type { OrchestrationMessage, StepMessage, StepSettledEvent, WorkQueue } from '../queue';
import { countExpectedSettledSteps } from './completion';
import type { ExecutionRecord, ExecutionStore } from './execution-store';
import {
	isLiveExecutionStatus,
	isSettledStatus,
	stepKeyId,
	type ChildOutcome,
	type ChildResult,
	type StepError,
	type StepKey,
	type StepKeyId,
	type StepSlots,
} from './execution.types';
import { exitSourcesInto, loadTerminalIterations } from './loop-ledger';
import { decideSuccessors, decisionKeys } from './settlement';
import type { ChildCanceller } from './step-ready-handler';
import type { StepRecord, StepStore } from './step-store';
import { validateStepContext } from './validate-step-context';

/**
 * Handles the `step:settled` orchestration event: decides the fate of the
 * settled step's direct successors — queued when a live edge feeds them,
 * skipped when every input is settled dead (see the rules in `settlement.ts`)
 * — and records the execution's outcome once every step the execution owes has
 * settled. Skips are settlements too: each one is announced back onto the
 * orchestration queue, and handling it here decides the next hop, so a dead
 * region cascades through the event loop one settlement at a time.
 *
 * An event whose step and execution disagree is rejected before anything is
 * planned, leaving both executions untouched.
 */
export class StepSettledHandler {
	constructor(
		private readonly executionStore: ExecutionStore,
		private readonly stepStore: StepStore,
		private readonly stepQueue: WorkQueue<StepMessage>,
		private readonly orchestrationQueue: WorkQueue<OrchestrationMessage>,
		private readonly lifecycleEventPublisher: LifecycleEventPublisher,
		private readonly responseSender: ExecutionResponseSender,
		private readonly childCanceller: ChildCanceller,
	) {}

	async handle(event: StepSettledEvent): Promise<void> {
		const [step, execution] = await Promise.all([
			this.stepStore.loadStep(event.stepId),
			this.executionStore.loadExecution(event.executionId),
		]);
		const node = validateStepContext(step, execution);

		// v1 parity: an error that escapes a node ends the whole execution, not
		// just its branch.
		if (step.status === 'failed') {
			await this.failExecution(execution, step, node);
			return;
		}

		// A `waiting` execution is live, and this settlement may be what lets it
		// move on, so only an ended one stops here.
		if (!isLiveExecutionStatus(execution.status)) return;

		let queued = 0;
		if (step.status === 'completed' || step.status === 'skipped') {
			// a failure elsewhere may still have its settled event queued behind
			// this one, so it must end the execution here, before planning
			if (await this.stepStore.hasFailedSteps(execution.id)) {
				await this.failExecution(execution, step, node);
				return;
			}

			queued = await this.planSuccessors(execution, step);
		}

		// If we've queued steps, we know the execution isn't done yet, so we
		// definitely don't need to mark it finished.
		if (queued === 0) await this.finishExecutionIfDone(execution, step, node);

		// If this call just finished the execution, it is no longer live, and the
		// refresh leaves it alone.
		await this.executionStore.refreshLiveStatus(execution.id);
	}

	private async failExecution(
		execution: ExecutionRecord,
		step: StepRecord,
		node: GraphNode,
	): Promise<void> {
		// Only the worker whose write won announces the outcome.
		const finished = await this.executionStore.finishExecution(execution.id, 'failed');
		if (finished) {
			this.lifecycleEventPublisher.publish({
				type: 'execution:failed',
				executionId: execution.id,
				workflowId: execution.workflowId,
				at: finished.finishedAt.toISOString(),
			});
			this.announceEnd(execution, step, node, 'failed');
		}

		await this.stepStore.cancelPendingSteps(execution.id);

		if (finished) await this.endedAsFailed(execution, step);
	}

	/**
	 * What a failed execution owes beyond its own rows: its children end with
	 * it, and a parent step that waits for it fails with the error.
	 */
	private async endedAsFailed(execution: ExecutionRecord, step: StepRecord): Promise<void> {
		await this.childCanceller.cancelChildren(execution.id);
		await this.resumeAwaitingParent(execution, {
			status: 'failed',
			error: await this.failureOf(execution, step),
		});
	}

	/** The error of the step that failed the execution: this one, or the one the count found. */
	private async failureOf(execution: ExecutionRecord, step: StepRecord): Promise<StepError> {
		if (step.status === 'failed' && step.error) return step.error;
		const failed = (await this.stepStore.loadAllSteps(execution.id)).find(
			(row) => row.status === 'failed' && row.error,
		);
		return failed?.error ?? { name: 'Error', message: `Execution ${execution.id} failed` };
	}

	/** Plans the settled step's direct successors, returning how many were queued. */
	private async planSuccessors(execution: ExecutionRecord, step: StepRecord): Promise<number> {
		const loops = deriveLoops(execution.graph);
		// Only the candidates' own edges are resolved, so only the loops those
		// edges leave need their latest row read.
		const candidates = getSuccessorNodeIds(execution.graph, step.nodeId);
		const terminalIterations = await loadTerminalIterations(
			this.stepStore,
			execution.id,
			exitSourcesInto(execution.graph, loops, candidates),
		);
		const steps = await this.stepStore.loadStepSummariesByKeys(
			execution.id,
			decisionKeys(execution.graph, loops, step, terminalIterations),
		);
		const { toQueue, toSeed, toSkip } = decideSuccessors(
			execution.graph,
			loops,
			step,
			steps,
			terminalIterations,
		);
		if (toQueue.length === 0 && toSeed.length === 0 && toSkip.length === 0) return 0;

		// Seeded steps had their outputs passed in at execution start, so we just
		// write them to the step store and announce completion rather than
		// enqueueing them to run.
		const seededOutputs = await this.executionStore.loadSeededOutputs(execution.id, toSeed);

		// One batch, so a settlement's consequence lands atomically and a fan-out
		// costs one round trip. A row another planner got to first isn't
		// returned, so it isn't announced twice either.
		// TODO(CAT-2938): a crash between the insert and the publishes strands
		// the rows forever; the reconciler re-announces stale queued steps and
		// settled steps whose decidable successors have no rows.
		const created = await this.stepStore.createSteps(execution.id, [
			...toQueue.map((key) => ({ ...key, status: 'queued' as const })),
			...toSeed.map((key) => ({
				...key,
				status: 'completed' as const,
				outputs: seededOutputsFor(execution.id, key, seededOutputs),
			})),
			...toSkip.map((key) => ({ ...key, status: 'skipped' as const })),
		]);

		return await this.announceCreatedSteps(execution.id, created, new Set(toQueue.map(stepKeyId)));
	}

	/**
	 * Announces the created rows — `step:ready` for queued ones, `step:settled`
	 * for skips and seeded steps, which settle at birth — and returns how many
	 * were queued. Published only after the rows exist, so a consumer can always
	 * load them.
	 */
	private async announceCreatedSteps(
		executionId: string,
		created: Array<{ id: string } & StepKey>,
		queuedKeys: Set<StepKeyId>,
	): Promise<number> {
		let queued = 0;
		for (const { id: stepId, ...key } of created) {
			if (queuedKeys.has(stepKeyId(key))) {
				queued += 1;
				await this.stepQueue.publish({ type: 'step:ready', executionId, stepId });
			} else {
				await this.orchestrationQueue.publish({ type: 'step:settled', executionId, stepId });
			}
		}
		return queued;
	}

	/**
	 * Records the execution's outcome once every step it owes has settled: `failed`
	 * if any step failed, `completed` otherwise. Steps are unique per
	 * `(node, iteration)`, only exist for reachable nodes, and never unsettle, so
	 * the count comparison cannot pass early — in-flight events and unplanned
	 * successors both leave steps outstanding.
	 */
	private async finishExecutionIfDone(
		execution: ExecutionRecord,
		step: StepRecord,
		node: GraphNode,
	): Promise<void> {
		const reachable = this.reachableNodeIds(execution);
		const loops = deriveLoops(execution.graph);
		const terminalIterations = await loadTerminalIterations(
			this.stepStore,
			execution.id,
			// A loop the trigger cannot reach never receives rows, and the count below
			// leaves it out, so its tip is not worth asking for.
			loops
				.filter((loop) => reachable.has(loop.batchNodeId))
				.map((loop) => loop.batchNodeId),
		);
		const expected = countExpectedSettledSteps(loops, reachable, terminalIterations);
		// A loop still running owes an unknown number of steps, so there is nothing
		// to compare against yet.
		if (expected === undefined) return;

		const settled = await this.stepStore.countSettledSteps(execution.id);
		if (settled < expected) return;

		const failed = await this.stepStore.hasFailedSteps(execution.id);
		const finished = await this.executionStore.finishExecution(
			execution.id,
			failed ? 'failed' : 'completed',
		);
		if (finished) {
			this.lifecycleEventPublisher.publish({
				type: failed ? 'execution:failed' : 'execution:completed',
				executionId: execution.id,
				workflowId: execution.workflowId,
				at: finished.finishedAt.toISOString(),
			});
			this.announceEnd(execution, step, node, failed ? 'failed' : 'completed');
			if (failed) {
				await this.endedAsFailed(execution, step);
			} else {
				await this.resumeAwaitingParent(execution, {
					status: 'completed',
					result: await this.collectResult(execution),
				});
			}
		}
	}

	/**
	 * Resumes the parent step that waits for this execution, with its outcome.
	 * Only the branch that won `finishExecution` gets here, so the parent is
	 * resumed once. Resume first, announce second, as the wait sweep does: the
	 * row is `queued` before any worker can hear of it.
	 *
	 * TODO(CET-342): a crash between the finish and the resume leaves a parent
	 * step waiting on a child that has ended. The rows say so, and a redelivery
	 * cannot repeat a finish it lost, so reconciliation re-issues the resume.
	 */
	private async resumeAwaitingParent(
		execution: ExecutionRecord,
		outcome: ChildOutcome,
	): Promise<void> {
		const { parent } = execution;
		if (!parent?.awaited) return;

		const resumed = await this.stepStore.resumeStep(parent.stepId, {
			kind: 'child',
			executionId: execution.id,
			...outcome,
		});
		// A parent step that is not waiting any more was cancelled with its
		// execution, and nothing is owed to it.
		if (!resumed) return;

		await this.stepQueue.publish({
			type: 'step:ready',
			executionId: parent.executionId,
			stepId: parent.stepId,
		});
		await this.executionStore.refreshLiveStatus(parent.executionId);
	}

	/**
	 * The outputs of every completed terminal step, in graph order and then by
	 * pass. A terminal step is one whose node has no outgoing edge. Several
	 * terminal branches all contribute, which is where engine v1 reports the
	 * last node that ran instead.
	 */
	private async collectResult(execution: ExecutionRecord): Promise<ChildResult> {
		const { graph } = execution;
		const sources = new Set(graph.edges.map((edge) => edge.from));
		const terminalOrder = new Map(
			graph.nodes.filter((node) => !sources.has(node.id)).map((node, index) => [node.id, index]),
		);
		const steps = await this.stepStore.loadAllSteps(execution.id);
		return steps
			.filter((step) => step.status === 'completed' && terminalOrder.has(step.nodeId))
			.sort(
				(a, b) =>
					terminalOrder.get(a.nodeId)! - terminalOrder.get(b.nodeId)! || a.iteration - b.iteration,
			)
			.map(({ nodeId, iteration, outputs }) => ({ nodeId, iteration, outputs: outputs ?? [] }));
	}

	/**
	 * Tells whoever started the execution that it is over.
	 *
	 * Only ever called where `finishExecution` won its CAS, so a run announces
	 * its end exactly once however many workers raced for it.
	 *
	 * `lastStep` is the step whose settling ended the run, reported as it is. A
	 * skip settles at birth and carries no outputs, so a caller that wants the
	 * step which produced data has to look further; the engine has no opinion on
	 * which step an answer should come from.
	 */
	private announceEnd(
		execution: ExecutionRecord,
		step: StepRecord,
		node: GraphNode,
		status: 'completed' | 'failed',
	): void {
		if (!isSettledStatus(step.status)) {
			// Steps never unsettle, and this runs only once a step has settled, so
			// this is a bug in the caller, not a state this step can reach.
			throw new UnexpectedError(
				`Step ${step.nodeId} announced its end from status '${step.status}'`,
			);
		}

		const { kind } = execution.responseExpectation;
		if (kind === 'none') return;

		this.responseSender.send({
			type: 'ended',
			executionId: execution.id,
			workflowId: execution.workflowId,
			status,
			lastStep: {
				nodeId: step.nodeId,
				nodeName: node.name,
				status: step.status,
				outputs: kind === 'runEnd' ? step.outputs : null,
				// Name and message only: the caller reports them, and the rest of the
				// error stays on the step row.
				error: step.error ? { name: step.error.name, message: step.error.message } : undefined,
			},
		});
	}

	private reachableNodeIds(execution: ExecutionRecord): Set<string> {
		const trigger = findTriggerNode(execution.graph);
		if (!trigger) {
			// The start boundary rejects triggerless graphs, so this execution
			// should never have been created.
			throw new UnexpectedError(`Execution ${execution.id} has no trigger node in its graph`);
		}
		return new Set([trigger.id, ...getDescendantNodeIds(execution.graph, trigger.id)]);
	}
}

/**
 * The start boundary stores outputs for every pass of every node it marks, so
 * a marked node without outputs for a pass the run reaches is a bug, not a
 * node to run instead.
 */
function seededOutputsFor(
	executionId: string,
	key: StepKey,
	seededOutputs: Map<StepKeyId, StepSlots>,
): StepSlots {
	const outputs = seededOutputs.get(stepKeyId(key));
	if (outputs === undefined) {
		throw new UnexpectedError(
			`Execution ${executionId} marks node ${key.nodeId} as seeded but holds no outputs for iteration ${key.iteration}`,
		);
	}
	return outputs;
}

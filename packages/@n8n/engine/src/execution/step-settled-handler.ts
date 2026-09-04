import { UnexpectedError } from '../common';
import { deriveLoops, findTriggerNode, getDescendantNodeIds, getSuccessorNodeIds } from '../graph';
import type { LifecycleEventPublisher } from '../lifecycle-events';
import type { OrchestrationMessage, StepMessage, StepSettledEvent, WorkQueue } from '../queue';
import { countExpectedSettledSteps } from './completion';
import type { ExecutionRecord, ExecutionStore } from './execution-store';
import { stepKeyId, type StepKey, type StepKeyId } from './execution.types';
import { exitSourcesInto, loadTerminalIterations } from './loop-ledger';
import { decideSuccessors, decisionKeys } from './settlement';
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
	) {}

	async handle(event: StepSettledEvent): Promise<void> {
		const [step, execution] = await Promise.all([
			this.stepStore.loadStep(event.stepId),
			this.executionStore.loadExecution(event.executionId),
		]);
		validateStepContext(step, execution);

		// v1 parity: an error that escapes a node ends the whole execution, not
		// just its branch.
		if (step.status === 'failed') {
			await this.failExecution(execution);
			return;
		}

		if (execution.status !== 'running') return;

		let queued = 0;
		if (step.status === 'completed' || step.status === 'skipped') {
			// a failure elsewhere may still have its settled event queued behind
			// this one, so it must end the execution here, before planning
			if (await this.stepStore.hasFailedSteps(execution.id)) {
				await this.failExecution(execution);
				return;
			}

			queued = await this.planSuccessors(execution, step);
		}

		// If we've queued steps, we know the execution isn't done yet, so we
		// definitely don't need to mark it finished.
		if (queued > 0) return;

		await this.finishExecutionIfDone(execution);
	}

	private async failExecution(execution: ExecutionRecord): Promise<void> {
		// Only the worker whose write won announces the outcome.
		const finished = await this.executionStore.finishExecution(execution.id, 'failed');
		if (finished) {
			this.lifecycleEventPublisher.publish({
				type: 'execution:failed',
				executionId: execution.id,
				workflowId: execution.workflowId,
				at: new Date().toISOString(),
			});
		}

		// TODO(CAT-3990): this sweep names no rows, so it announces nothing.
		await this.stepStore.cancelQueuedSteps(execution.id);
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
		const { toQueue, toSkip } = decideSuccessors(
			execution.graph,
			loops,
			step,
			steps,
			terminalIterations,
		);
		if (toQueue.length === 0 && toSkip.length === 0) return 0;

		// One batch, so a settlement's consequence lands atomically and a fan-out
		// costs one round trip. A row another planner got to first isn't
		// returned, so it isn't announced twice either.
		// TODO(CAT-2938): a crash between the insert and the publishes strands
		// the rows forever; the reconciler re-announces stale queued steps and
		// settled steps whose decidable successors have no rows.
		const created = await this.stepStore.createSteps(execution.id, [
			...toQueue.map((key) => ({ ...key, status: 'queued' as const })),
			...toSkip.map((key) => ({ ...key, status: 'skipped' as const })),
		]);

		return await this.announceCreatedSteps(execution.id, created, new Set(toQueue.map(stepKeyId)));
	}

	/**
	 * Announces the created rows — `step:ready` for queued ones, `step:settled`
	 * for skips, which settle at birth — and returns how many were queued.
	 * Published only after the rows exist, so a consumer can always load them.
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
	private async finishExecutionIfDone(execution: ExecutionRecord): Promise<void> {
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
				at: new Date().toISOString(),
			});
		}
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

import { findTriggerNode, getPredecessorNodeIds, getSuccessorNodeIds } from '../graph';
import type { ExecutionEnqueuedEvent, StepMessage, WorkQueue } from '../queue';
import type { ExecutionStore } from './execution-store';
import { finishExecutionIfDone } from './finish-execution';
import type { StepStore } from './step-store';

/**
 * Handles the `execution:enqueued` orchestration event: claims the execution
 * (`queued → running`), records the trigger as a completed step, and plans the
 * first step(s).
 */
export class ExecutionStartHandler {
	constructor(
		private readonly executionStore: ExecutionStore,
		private readonly stepStore: StepStore,
		private readonly stepQueue: WorkQueue<StepMessage>,
	) {}

	async handle(event: ExecutionEnqueuedEvent): Promise<void> {
		// Claim via CAS so a duplicate/redelivered event is a no-op.
		const claimed = await this.executionStore.transitionStatus(
			event.executionId,
			'queued',
			'running',
		);
		if (!claimed) return;

		const execution = await this.executionStore.loadExecution(event.executionId);

		const trigger = findTriggerNode(execution.graph);
		if (!trigger) {
			// Malformed graph — no entry point to run.
			await this.executionStore.transitionStatus(event.executionId, 'running', 'failed');
			return;
		}

		// The trigger ran before the execution was enqueued, so its step is recorded
		// already completed, carrying the captured payload as its outputs — that way
		// successors read it exactly as they read any other predecessor's.
		// Planned together with the successors so a fan-out is one round trip.
		// The trigger is the only node that has completed, so a successor sitting
		// behind anything else isn't ready yet — `StepCompletedHandler` plans it once
		// that predecessor finishes.
		const successorNodeIds = getSuccessorNodeIds(execution.graph, trigger.id).filter((nodeId) =>
			getPredecessorNodeIds(execution.graph, nodeId).every((id) => id === trigger.id),
		);
		const created = await this.stepStore.createSteps([
			{
				executionId: event.executionId,
				nodeId: trigger.id,
				status: 'completed',
				// slot 0, so a successor edge from output 0 picks it up like any other
				outputs: [execution.triggerPayload],
			},
			...successorNodeIds.map((nodeId) => ({
				executionId: event.executionId,
				nodeId,
				status: 'queued' as const,
			})),
		]);

		// Published only after the rows exist, so a consumer can always load the
		// step. The trigger's row is already completed, so it isn't announced.
		const successorSteps = created.filter(({ nodeId }) => nodeId !== trigger.id);
		if (successorSteps.length === 0) {
			// Nothing to run, so no step will ever report completion — this is the only
			// chance to notice the execution is already over.
			await finishExecutionIfDone(this.executionStore, this.stepStore, event.executionId);
			return;
		}

		for (const { id: stepId } of successorSteps) {
			await this.stepQueue.publish({
				type: 'step:ready',
				executionId: event.executionId,
				stepId,
			});
		}
	}
}

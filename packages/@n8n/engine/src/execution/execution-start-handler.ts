import { findTriggerNode, getSuccessorNodeIds } from '../graph';
import type { ExecutionEnqueuedEvent, StepMessage, WorkQueue } from '../queue';
import type { ExecutionStore } from './execution-store';
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

		// The trigger's output was captured at execution start; record it as
		// already completed so successors can treat it as a satisfied predecessor.
		// Planned together with the successors so a fan-out is one round trip.
		const successorNodeIds = getSuccessorNodeIds(execution.graph, trigger.id);
		const [, ...successorSteps] = await this.stepStore.createSteps([
			{ executionId: event.executionId, nodeId: trigger.id, status: 'completed' },
			...successorNodeIds.map((nodeId) => ({
				executionId: event.executionId,
				nodeId,
				status: 'queued' as const,
			})),
		]);

		// Published only after the rows exist, so a consumer can always load the step.
		for (const { id: stepId } of successorSteps) {
			await this.stepQueue.publish({
				type: 'step:ready',
				executionId: event.executionId,
				stepId,
			});
		}
	}
}

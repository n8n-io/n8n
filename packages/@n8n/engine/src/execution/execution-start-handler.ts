import { findTriggerNode, getSuccessorNodeIds } from '../graph';
import type { ExecutionEnqueuedEvent, StepMessage, WorkQueue } from '../queue';
import type { ExecutionStore } from './execution-store';
import type { StepStore } from './step-store';

/**
 * Handles the `execution:enqueued` orchestration event: claims the execution
 * (`queued → running`), records the trigger as a completed step, and plans the
 * first hop — a queued step record per successor, each enqueued on the step
 * queue. Actually running a step is CAT-2870.
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
			await this.executionStore.failExecution(event.executionId);
			return;
		}

		// The trigger's output was captured at execution start; record it as
		// already completed so successors can treat it as a satisfied predecessor.
		await this.stepStore.createStep({
			executionId: event.executionId,
			nodeId: trigger.id,
			status: 'completed',
		});

		// Plan only the first hop: a queued step record per successor, enqueued for
		// execution. Later hops are planned as each step completes (CAT-2871); a
		// trigger with no successors leaves the execution 'running' until completion
		// detection lands (CAT-2872).
		const successorNodeIds = getSuccessorNodeIds(execution.graph, trigger.id);
		for (const nodeId of successorNodeIds) {
			const { id: stepId } = await this.stepStore.createStep({
				executionId: event.executionId,
				nodeId,
				status: 'queued',
			});
			await this.stepQueue.publish({
				type: 'step:ready',
				executionId: event.executionId,
				stepId,
			});
		}
	}
}

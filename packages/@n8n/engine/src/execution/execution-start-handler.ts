import { UnexpectedError } from '../common';
import { findTriggerNode } from '../graph';
import type { ExecutionEnqueuedEvent, OrchestrationMessage, WorkQueue } from '../queue';
import type { ExecutionStore } from './execution-store';
import type { StepStore } from './step-store';

/**
 * Handles the `execution:enqueued` orchestration event: claims the execution
 * (`queued → running`), records the trigger as a completed step, and announces
 * that completion. The first step(s) are planned by the step completion handler
 * that handles the trigger completion.
 * NOTE: this means an extra trip through the queue, but it eliminates some
 * special-casing for triggers and simplifies the completion logic.
 */
export class ExecutionStartHandler {
	constructor(
		private readonly executionStore: ExecutionStore,
		private readonly stepStore: StepStore,
		private readonly orchestrationQueue: WorkQueue<OrchestrationMessage>,
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
			// The start boundary rejects triggerless graphs, so this execution
			// should never have been created.
			throw new UnexpectedError(`Execution ${event.executionId} has no trigger node in its graph`);
		}

		// The trigger's output was captured at execution start; record it as
		// already completed so successors can treat it as a satisfied predecessor.
		// The claim above makes this the only writer, so the row cannot exist yet.
		// NOTE: trigger payloads are not really supported yet — the raw payload is
		// not item-shaped, so the v1 shim coerces it to zero items. Proper trigger
		// handling will decide its shape.
		const [triggerStep] = await this.stepStore.createSteps([
			{
				executionId: event.executionId,
				nodeId: trigger.id,
				status: 'completed',
				outputs: [execution.triggerPayload ?? {}],
			},
		]);
		if (!triggerStep) {
			throw new UnexpectedError(
				`Trigger step for execution ${event.executionId} already existed despite the claim`,
			);
		}

		// Published only after the row exists, so the consumer can always load it.
		await this.orchestrationQueue.publish({
			type: 'step:completed',
			executionId: event.executionId,
			stepId: triggerStep.id,
		});
	}
}

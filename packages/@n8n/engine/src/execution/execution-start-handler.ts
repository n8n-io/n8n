import { UnexpectedError } from '../common';
import { findTriggerNode } from '../graph';
import type { LifecycleEventPublisher } from '../lifecycle-events';
import type { ExecutionEnqueuedEvent, OrchestrationMessage, WorkQueue } from '../queue';
import type { ExecutionStore } from './execution-store';
import { DEFAULT_TRIGGER_OUTPUTS } from './execution.types';
import type { StepStore } from './step-store';

/**
 * Handles the `execution:enqueued` orchestration event: claims the execution
 * (`queued -> running`), records the trigger as a completed step, and announces
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
		private readonly lifecycleEventPublisher: LifecycleEventPublisher,
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

		// This worker won the claim, so it is the one that announces the start.
		// After the load, because the ids it carries save consumers a round trip.
		this.lifecycleEventPublisher.publish({
			type: 'execution:started',
			executionId: execution.id,
			workflowId: execution.workflowId,
			mode: execution.mode,
			at: new Date().toISOString(),
		});

		const trigger = findTriggerNode(execution.graph);
		if (!trigger) {
			// The start boundary rejects triggerless graphs, so this execution
			// should never have been created.
			throw new UnexpectedError(`Execution ${event.executionId} has no trigger node in its graph`);
		}

		// The trigger's outputs were captured at execution start; record them as
		// already completed so successors read them like any predecessor's slots.
		// No payload means no slots at all: every successor edge reads undefined
		// and is treated as dead, same as any other step that produced nothing.
		// The claim above makes this the only writer, so the row cannot exist yet.
		const [triggerStep] = await this.stepStore.createSteps(event.executionId, [
			{
				nodeId: trigger.id,
				iteration: 0,
				status: 'completed',
				outputs: execution.triggerOutputs ?? DEFAULT_TRIGGER_OUTPUTS,
			},
		]);
		if (!triggerStep) {
			throw new UnexpectedError(
				`Trigger step for execution ${event.executionId} already existed despite the claim`,
			);
		}

		// Published only after the row exists, so the consumer can always load it.
		await this.orchestrationQueue.publish({
			type: 'step:settled',
			executionId: event.executionId,
			stepId: triggerStep.id,
		});
	}
}

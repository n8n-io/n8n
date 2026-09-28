import { UnexpectedError } from '../common';
import { findTriggerNode } from '../graph';
import type { LifecycleEventPublisher } from '../lifecycle-events';
import type { ExecutionEnqueuedEvent, OrchestrationMessage, WorkQueue } from '../queue';
import type { ExecutionStore } from './execution-store';
import { DEFAULT_TRIGGER_OUTPUTS, isLiveExecutionStatus } from './execution.types';
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
			// The insert also refuses once the execution has ended, and a cancel can
			// land between the claim and here. That run is over, so nothing follows.
			const current = await this.executionStore.loadExecution(event.executionId);
			if (!isLiveExecutionStatus(current.status)) return;

			throw new UnexpectedError(
				`Trigger step for execution ${event.executionId} already existed despite the claim`,
			);
		}

		// This worker won the claim, so it is the one that announces the start.
		// After the trigger row, so a run cancelled before it began announces nothing.
		this.lifecycleEventPublisher.publish({
			type: 'execution:started',
			executionId: execution.id,
			workflowId: execution.workflowId,
			mode: execution.mode,
			hostMode: execution.callerContext.hostMode,
			at: new Date().toISOString(),
		});

		// Published only after the row exists, so the consumer can always load it.
		await this.orchestrationQueue.publish({
			type: 'step:settled',
			executionId: event.executionId,
			stepId: triggerStep.id,
		});
	}
}

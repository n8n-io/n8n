import { UnexpectedError } from '../common';
import { findTriggerNode } from '../graph';
import type { LifecycleEventPublisher } from '../lifecycle-events';
import type { ExecutionEnqueuedEvent, OrchestrationMessage, WorkQueue } from '../queue';
import type { ExecutionStore } from './execution-store';
import { DEFAULT_TRIGGER_OUTPUTS } from './execution.types';
import type { StepStore } from './step-store';

/**
 * Handles the `execution:enqueued` orchestration event: claims the execution
 * (`queued -> running`), records the trigger and any seeded steps as completed,
 * and announces each completion. The first step(s) are planned by the step
 * completion handler that handles those completions.
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
			hostMode: execution.callerContext.hostMode,
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
		// Seeded steps are recorded the same way, in the same batch, so a planner
		// never queues a node the caller already holds the outputs of.
		// The claim above makes this the only writer, so no row can exist yet.
		const seededSteps = Object.entries(execution.seededSteps ?? {}).flatMap(([nodeId, passes]) =>
			passes.map((outputs, iteration) => ({
				nodeId,
				iteration,
				status: 'completed' as const,
				outputs,
			})),
		);
		const created = await this.stepStore.createSteps(event.executionId, [
			{
				nodeId: trigger.id,
				iteration: 0,
				status: 'completed',
				outputs: execution.triggerOutputs ?? DEFAULT_TRIGGER_OUTPUTS,
			},
			...seededSteps,
		]);
		if (created.length !== 1 + seededSteps.length) {
			throw new UnexpectedError(
				`Start steps for execution ${event.executionId} already existed despite the claim`,
			);
		}

		// Published only after the rows exist, so the consumer can always load
		// them. A seeded step's successors are planned from its settlement like
		// any other; a predecessor that settles later finds the row and plans
		// nothing for it.
		for (const step of created) {
			await this.orchestrationQueue.publish({
				type: 'step:settled',
				executionId: event.executionId,
				stepId: step.id,
			});
		}
	}
}

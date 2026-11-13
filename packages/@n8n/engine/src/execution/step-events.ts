import type { GraphNode } from '../graph';
import type { LifecycleEventPublisherFactory } from '../lifecycle-events';
import type { OrchestrationMessage, WorkQueue } from '../queue';
import type { ExecutionRecord } from './execution-store';
import type { StepRecord } from './step-store';

/** The identifiers every step event carries. */
export function stepEventFields(step: StepRecord, node: GraphNode) {
	return {
		executionId: step.executionId,
		stepId: step.id,
		nodeId: step.nodeId,
		nodeName: node.name,
		iteration: step.iteration,
		at: new Date().toISOString(),
	};
}

/**
 * Announces a failure that the caller wrote on the step row: the `step:failed`
 * lifecycle event, then `step:settled` on the orchestration queue. Only the
 * caller whose write changed the row calls this.
 */
export async function announceStepFailed(
	lifecycleEventPublisherFactory: LifecycleEventPublisherFactory,
	orchestrationQueue: WorkQueue<OrchestrationMessage>,
	execution: ExecutionRecord,
	step: StepRecord,
	node: GraphNode,
): Promise<void> {
	// Before the settled event, or the execution could announce its end first.
	lifecycleEventPublisherFactory
		.create(execution)
		.publish({ type: 'step:failed', ...stepEventFields(step, node) });
	await orchestrationQueue.publish({
		type: 'step:settled',
		executionId: execution.id,
		stepId: step.id,
	});
}

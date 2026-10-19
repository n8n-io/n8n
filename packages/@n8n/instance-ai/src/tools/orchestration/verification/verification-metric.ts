import { emitBuilderMetric } from '../../../tracing/builder-metric-event';
import type { InstanceAiTraceContext } from '../../../types';
import type { VerificationClaim } from '../../../workflow-loop/workflow-loop-state';

/**
 * Where the verification evidence came from:
 * - `verify`: a `verify-built-workflow` run.
 * - `live_run`: a live `executions(action="run")` that proved the whole workflow.
 * - `blocked`: verification did not run.
 */
export type WorkflowVerificationSource = 'verify' | 'live_run' | 'blocked';

/**
 * Records one stored verification claim. The claim is derived from the run, not
 * from the model, so a workflow counts as verified only at claim level `verified`.
 */
export async function emitWorkflowVerificationMetric(
	tracing: InstanceAiTraceContext | undefined,
	args: {
		source: WorkflowVerificationSource;
		workflowId: string;
		workItemId: string;
		executionId?: string;
		claim?: VerificationClaim;
		/** Why verification did not run, for the `blocked` source. */
		reason?: string;
	},
): Promise<void> {
	const { source, workflowId, workItemId, executionId, claim, reason } = args;
	await emitBuilderMetric(tracing, 'workflow_verification', {
		success: claim?.level === 'verified',
		source,
		claim_level: claim?.level,
		planned_node_count: claim?.plannedNodeCount,
		reached_node_count: claim?.reachedNodeCount,
		nodes_not_reached_count: claim?.nodesNotReached.length,
		simulated_node_count: claim?.simulatedNodes.length,
		live_test_recommended: claim?.liveTestRecommended,
		reason,
		workflow_id: workflowId,
		work_item_id: workItemId,
		execution_id: executionId,
	});
}

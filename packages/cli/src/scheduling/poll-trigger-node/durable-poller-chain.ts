import type { SchedulerConfig, WorkflowsConfig } from '@n8n/config';

/**
 * Whether durable pollers have effectively taken over poll scheduling.
 *
 * Durable poll jobs and durable poll cursors are one feature block riding on
 * the durable scheduler and the workflow publication service; every consumer
 * of that fact must agree on this one condition, or one of them ends up
 * running durably while the rest have degraded to the legacy in-memory
 * engine.
 */
export function isDurablePollerChainEnabled(
	schedulerConfig: SchedulerConfig,
	workflowsConfig: WorkflowsConfig,
): boolean {
	return (
		schedulerConfig.enabled &&
		schedulerConfig.enabledForPollTriggers &&
		workflowsConfig.useWorkflowPublicationService
	);
}

import { ScheduledJobOwnerType } from '@n8n/constants';
import { ScheduledJobOwnerRegistry } from '@n8n/scheduler';

import type { SystemTaskScheduledJobOwner } from './system-tasks/system-task-scheduled-job-owner';
import type { WorkflowScheduledJobOwner } from './workflow-scheduled-job-owner';

/**
 * The one place an owner type is claimed: provisioning refuses a type this
 * manifest does not declare, and the reconciliation pass queries its resolvers.
 */
export function createScheduledJobOwnerRegistry(
	workflowOwner: WorkflowScheduledJobOwner,
	systemTaskOwner: SystemTaskScheduledJobOwner,
): ScheduledJobOwnerRegistry {
	const owners = new ScheduledJobOwnerRegistry();
	owners.register(ScheduledJobOwnerType.Workflow, workflowOwner);
	owners.register(ScheduledJobOwnerType.SystemTask, systemTaskOwner);
	return owners;
}

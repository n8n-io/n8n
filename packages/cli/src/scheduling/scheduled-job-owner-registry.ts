import { ScheduledJobOwnerType } from '@n8n/constants';
import { ScheduledJobOwnerRegistry } from '@n8n/scheduler';

import type { WorkflowScheduledJobOwner } from './workflow-scheduled-job-owner';

/**
 * Builds the scheduled job owner registry with every owner module declared, so
 * a reader holds a complete registry the moment it is constructed.
 *
 * This is the one place an owner type is claimed. Both readers build their
 * registry here: provisioning refuses an owner type this manifest does not
 * declare, and the scheduler's reconciliation pass queries its resolvers.
 */
export function createScheduledJobOwnerRegistry(
	workflowOwner: WorkflowScheduledJobOwner,
): ScheduledJobOwnerRegistry {
	const owners = new ScheduledJobOwnerRegistry();
	owners.register(ScheduledJobOwnerType.Workflow, workflowOwner);
	return owners;
}

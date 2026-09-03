import { ScheduledJobOwnerType } from '@n8n/constants';
import type { ScheduledJobOwner } from '@n8n/db';
import { Service } from '@n8n/di';
import type { ScheduledJobOwnerResolver } from '@n8n/scheduler';
import { OperationalError } from 'n8n-workflow';

/**
 * Marks a system task as the owner of its own durable job. One job per task,
 * so `ownerId` is the task name and there is no member.
 */
@Service()
export class SystemTaskScheduledJobOwner implements ScheduledJobOwnerResolver {
	readonly ownerType = ScheduledJobOwnerType.SystemTask;

	/** The owner of the one job a task provisions. */
	owner(taskName: string): ScheduledJobOwner {
		return { ownerType: this.ownerType, ownerId: taskName, ownerMemberId: null };
	}

	/**
	 * Always throws, so the sweep leaves every system task job alone. Answering
	 * needs a task inventory that holds across a mixed-version deploy, which
	 * CAT-4158 adds; this instance's own registry only covers the version it runs.
	 */
	async findExisting(_ownerIds: string[]): Promise<Set<string>> {
		throw new OperationalError('System task liveness needs a cross-version task inventory');
	}
}

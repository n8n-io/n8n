import { ScheduledJobOwnerType } from '@n8n/constants';
import type { ScheduledJobOwner } from '@n8n/db';
import { ScheduledJobRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { ScheduledJobOwnerResolver } from '@n8n/scheduler';

import { stampedByNewerVersion } from './system-task-version-stamp';

/**
 * Marks a system task as the owner of its own durable job, one per task, so
 * `ownerId` is the task name and there is no member. For reconciliation and for
 * the startup cleanup, a task exists while this instance runs it durably or
 * while a newer version stamped its job.
 */
@Service()
export class SystemTaskScheduledJobOwner implements ScheduledJobOwnerResolver {
	readonly ownerType = ScheduledJobOwnerType.SystemTask;

	private readonly durableTaskNames = new Set<string>();

	constructor(private readonly jobs: ScheduledJobRepository) {}

	/** The owner of the one job a task provisions. */
	owner(taskName: string): ScheduledJobOwner {
		return { ownerType: this.ownerType, ownerId: taskName, ownerMemberId: null };
	}

	/** Record that this instance runs the task on the durable scheduler. */
	declareDurable(taskName: string): void {
		this.durableTaskNames.add(taskName);
	}

	async findExisting(ownerIds: string[]): Promise<Set<string>> {
		const existing = new Set(ownerIds.filter((name) => this.durableTaskNames.has(name)));
		const undeclared = ownerIds.filter((name) => !existing.has(name));
		if (undeclared.length > 0) {
			const rows = await this.jobs.findPayloadsByOwnerIds(this.ownerType, undeclared);
			for (const { ownerId, payload } of rows) {
				if (this.isAlive(ownerId, payload)) {
					existing.add(ownerId);
				}
			}
		}
		return existing;
	}

	/** Whether a stored job's task exists: this instance runs it durably, or a newer version stamped it. */
	isAlive(ownerId: string, payload: Record<string, unknown>): boolean {
		return this.durableTaskNames.has(ownerId) || stampedByNewerVersion(payload);
	}
}

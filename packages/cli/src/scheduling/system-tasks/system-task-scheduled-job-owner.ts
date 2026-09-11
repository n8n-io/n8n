import { ScheduledJobOwnerType } from '@n8n/constants';
import type { ScheduledJobOwner } from '@n8n/db';
import { ScheduledJobRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { ScheduledJobOwnerResolver } from '@n8n/scheduler';
import { gt, valid } from 'semver';

import { N8N_VERSION } from '@/constants';

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

	/** The payload of the job a task provisions: the version that wrote the row. */
	jobPayload(): { n8nVersion: string } {
		return { n8nVersion: N8N_VERSION };
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
				if (stampedByNewerVersion(payload)) {
					existing.add(ownerId);
				}
			}
		}
		return existing;
	}

	/** The stored tasks this instance does not run durably and no newer version stamped. */
	async findStale(): Promise<string[]> {
		const rows = await this.jobs.findPayloadsByOwnerType(this.ownerType);
		return rows
			.filter(
				({ ownerId, payload }) =>
					!this.durableTaskNames.has(ownerId) && !stampedByNewerVersion(payload),
			)
			.map(({ ownerId }) => ownerId);
	}
}

function stampedByNewerVersion(payload: Record<string, unknown>): boolean {
	const { n8nVersion } = payload;
	return (
		typeof n8nVersion === 'string' && valid(n8nVersion) !== null && gt(n8nVersion, N8N_VERSION)
	);
}

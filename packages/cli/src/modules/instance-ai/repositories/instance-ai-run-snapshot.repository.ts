import { Service } from '@n8n/di';
import { And, DataSource, LessThan, MoreThanOrEqual, Repository } from '@n8n/typeorm';

import { InstanceAiRunSnapshot } from '../entities/instance-ai-run-snapshot.entity';

@Service()
export class InstanceAiRunSnapshotRepository extends Repository<InstanceAiRunSnapshot> {
	constructor(dataSource: DataSource) {
		super(InstanceAiRunSnapshot, dataSource.manager);
	}

	/**
	 * Snapshots written inside the half-open window `[since, before)`, oldest
	 * first; an open bound means unbounded on that side. `(threadId, createdAt)`
	 * is indexed, so this is a range scan and the `tree` column is only read for
	 * the rows in the window.
	 */
	async findInWindow(
		threadId: string,
		window: { since?: Date; before?: Date },
	): Promise<InstanceAiRunSnapshot[]> {
		const { since, before } = window;
		const createdAt =
			since && before
				? And(MoreThanOrEqual(since), LessThan(before))
				: since
					? MoreThanOrEqual(since)
					: before
						? LessThan(before)
						: undefined;
		return await this.find({
			where: { threadId, ...(createdAt ? { createdAt } : {}) },
			order: { createdAt: 'ASC' },
		});
	}
}

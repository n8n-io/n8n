import { Service } from '@n8n/di';
import { Between, DataSource, LessThanOrEqual, MoreThanOrEqual, Repository } from '@n8n/typeorm';

import { InstanceAiRunSnapshot } from '../entities/instance-ai-run-snapshot.entity';

@Service()
export class InstanceAiRunSnapshotRepository extends Repository<InstanceAiRunSnapshot> {
	constructor(dataSource: DataSource) {
		super(InstanceAiRunSnapshot, dataSource.manager);
	}

	/**
	 * Snapshots written inside the window, oldest first; an open bound means
	 * unbounded on that side. `(threadId, createdAt)` is indexed, so this is a
	 * range scan and the `tree` column is only read for the rows in the window.
	 */
	async findInWindow(
		threadId: string,
		window: { since?: Date; until?: Date },
	): Promise<InstanceAiRunSnapshot[]> {
		const { since, until } = window;
		const createdAt =
			since && until
				? Between(since, until)
				: since
					? MoreThanOrEqual(since)
					: until
						? LessThanOrEqual(until)
						: undefined;
		return await this.find({
			where: { threadId, ...(createdAt ? { createdAt } : {}) },
			order: { createdAt: 'ASC' },
		});
	}
}

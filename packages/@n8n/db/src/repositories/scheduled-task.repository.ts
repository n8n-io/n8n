import { Service } from '@n8n/di';
import { DataSource, type EntityManager, Repository } from '@n8n/typeorm';
import type { QueryDeepPartialEntity } from '@n8n/typeorm/query-builder/QueryPartialEntity';

import { ScheduledTask } from '../entities/scheduled-task';

@Service()
export class ScheduledTaskRepository extends Repository<ScheduledTask> {
	constructor(dataSource: DataSource) {
		super(ScheduledTask, dataSource.manager);
	}

	async findAll(): Promise<ScheduledTask[]> {
		return await this.find();
	}

	/**
	 * Insert a task occurrence through the caller's transaction. Idempotent on the
	 * occurrence identity `(jobId, scheduledFor)`: `orIgnore()` becomes
	 * `ON CONFLICT DO NOTHING` (Postgres) / `INSERT OR IGNORE` (SQLite), so a repeated
	 * insert for the same occurrence is a no-op against the unique index.
	 */
	async insertOccurrence(
		trx: EntityManager,
		occurrence: QueryDeepPartialEntity<ScheduledTask>,
	): Promise<void> {
		await trx
			.createQueryBuilder()
			.insert()
			.into(ScheduledTask)
			.values(occurrence)
			.orIgnore()
			.execute();
	}
}

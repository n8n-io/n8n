import { Service } from '@n8n/di';
import { DataSource, type EntityManager, LessThanOrEqual, Repository } from '@n8n/typeorm';

import { ScheduledJob } from '../entities/scheduled-job';

@Service()
export class ScheduledJobRepository extends Repository<ScheduledJob> {
	constructor(dataSource: DataSource) {
		super(ScheduledJob, dataSource.manager);
	}

	async findAll(): Promise<ScheduledJob[]> {
		return await this.find();
	}

	/**
	 * Enabled jobs due to fire at or before `now`, ordered by `nextRunAt` and
	 * capped at `limit`, read through the caller's transaction. A null `nextRunAt`
	 * never matches.
	 */
	async findDue(trx: EntityManager, now: Date, limit: number): Promise<ScheduledJob[]> {
		return await trx.find(ScheduledJob, {
			where: { enabled: true, nextRunAt: LessThanOrEqual(now) },
			order: { nextRunAt: 'ASC' },
			take: limit,
		});
	}

	/** Update a job's `nextRunAt` and `lastFiredAt` through the caller's transaction. */
	async updateSchedulingState(
		trx: EntityManager,
		id: ScheduledJob['id'],
		state: Pick<ScheduledJob, 'nextRunAt' | 'lastFiredAt'>,
	): Promise<void> {
		await trx.update(ScheduledJob, id, state);
	}
}

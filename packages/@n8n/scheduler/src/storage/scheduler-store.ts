import { Service } from '@n8n/di';
import { DataSource, type EntityManager } from '@n8n/typeorm';

/**
 * Storage seam for the scheduler: owns transaction scoping so a caller can run
 * several repository calls as one atomic unit. The repositories
 * (`ScheduledJobRepository` / `ScheduledTaskRepository`) are injected by the caller
 * and take the transaction's `EntityManager`, keeping the transaction lifecycle in
 * one place.
 */
@Service()
export class SchedulerStore {
	constructor(private readonly dataSource: DataSource) {}

	/** Run `fn` in a single database transaction, passing it the transaction's `EntityManager`. */
	async transaction<T>(fn: (trx: EntityManager) => Promise<T>): Promise<T> {
		return await this.dataSource.transaction(fn);
	}
}

import { Service } from '@n8n/di';
import { DataSource, IsNull, Repository } from '@n8n/typeorm';

import { ExecutionQuotaCounter } from '../entities/execution-quota-counter';

@Service()
export class ExecutionQuotaCounterRepository extends Repository<ExecutionQuotaCounter> {
	constructor(dataSource: DataSource) {
		super(ExecutionQuotaCounter, dataSource.manager);
	}

	/**
	 * Atomically increment a counter, creating it if it doesn't exist.
	 * Uses upsert to handle concurrent increments safely.
	 */
	async incrementCounter(
		projectId: string,
		workflowId: string | null,
		periodStart: Date,
		incrementBy: number = 1,
	): Promise<void> {
		// Try to find existing counter
		const existing = await this.findOne({
			where: {
				projectId,
				workflowId: workflowId ?? IsNull(),
				periodStart,
			},
		});

		if (existing) {
			await this.increment({ id: existing.id }, 'count', incrementBy);
		} else {
			await this.upsert(
				{
					projectId,
					workflowId,
					periodStart,
					count: incrementBy,
				},
				['projectId', 'workflowId', 'periodStart'],
			);
		}
	}

	/** Get the current count for a specific counter */
	async getCount(projectId: string, workflowId: string | null, periodStart: Date): Promise<number> {
		const counter = await this.findOne({
			where: {
				projectId,
				workflowId: workflowId ?? IsNull(),
				periodStart,
			},
		});

		return counter?.count ?? 0;
	}

	/** Delete counters older than the given date */
	async pruneOldCounters(olderThan: Date): Promise<number> {
		const result = await this.createQueryBuilder()
			.delete()
			.where('periodStart < :olderThan', { olderThan })
			.execute();

		return result.affected ?? 0;
	}

	/**
	 * Get all counters for a project within a time range (for dashboard).
	 * Returns both project-level and workflow-level counters.
	 */
	async getProjectCounters(
		projectId: string,
		from: Date,
		to: Date,
	): Promise<ExecutionQuotaCounter[]> {
		return await this.createQueryBuilder('counter')
			.where('counter.projectId = :projectId', { projectId })
			.andWhere('counter.periodStart >= :from', { from })
			.andWhere('counter.periodStart <= :to', { to })
			.orderBy('counter.periodStart', 'DESC')
			.getMany();
	}
}

import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { ProjectExecutionCounter } from '../entities/project-execution-counter';
import type { ExecutionQuotaPeriodUnit } from '../entities/project-execution-quota';

@Service()
export class ProjectExecutionCounterRepository extends Repository<ProjectExecutionCounter> {
	constructor(
		dataSource: DataSource,
		private readonly logger: Logger,
	) {
		super(ProjectExecutionCounter, dataSource.manager);
	}

	async getProjectPeriodTotal(
		projectId: string,
		periodUnit: ExecutionQuotaPeriodUnit,
		periodStart: string,
	): Promise<number> {
		const result = await this.createQueryBuilder('counter')
			.select('COALESCE(SUM(counter.count), 0)', 'total')
			.where('counter.projectId = :projectId', { projectId })
			.andWhere('counter.periodUnit = :periodUnit', { periodUnit })
			.andWhere('counter.periodStart = :periodStart', { periodStart })
			.getRawOne<{ total: string }>();

		return Number(result?.total ?? 0);
	}

	/**
	 * Race-safe upsert: the unique constraint on (projectId, workflowId,
	 * periodUnit, periodStart) means a concurrent insert from another
	 * execution starting at the same instant fails with a constraint
	 * violation here, which we treat as "someone else created the row" and
	 * retry as an increment.
	 */
	async incrementWorkflowCount(
		projectId: string,
		workflowId: string,
		periodUnit: ExecutionQuotaPeriodUnit,
		periodStart: string,
	): Promise<void> {
		const existing = await this.findOneBy({ projectId, workflowId, periodUnit, periodStart });
		if (existing) {
			await this.increment({ id: existing.id }, 'count', 1);
			return;
		}

		try {
			await this.insert({ projectId, workflowId, periodUnit, periodStart, count: 1 });
		} catch (error) {
			// Expected case: a concurrent insert for the same bucket won the race
			// and we fall through to incrementing its row. But this catch is not
			// narrowed to that specific constraint violation (no cross-DB way to
			// detect it cleanly here), so any other insert failure — a dropped
			// connection, a full disk, a FK violation from a concurrently deleted
			// workflow — also falls through to `increment`, which is a silent
			// no-op when no row matches. Log so a masked failure still leaves a
			// trace instead of disappearing entirely.
			if (error instanceof Error) {
				this.logger.error('Insert failed while incrementing project execution count', {
					error,
					projectId,
					workflowId,
					periodUnit,
					periodStart,
				});
			}
			await this.increment({ projectId, workflowId, periodUnit, periodStart }, 'count', 1);
		}
	}

	async findByProjectId(
		projectId: string,
		periodUnit: ExecutionQuotaPeriodUnit,
		periodStart: string,
	): Promise<Array<{ workflowId: string; count: number }>> {
		return await this.find({
			where: { projectId, periodUnit, periodStart },
			select: ['workflowId', 'count'],
		});
	}

	async getWorkflowDailyCount(workflowId: string, day: string): Promise<number> {
		const result = await this.createQueryBuilder('counter')
			.select('COALESCE(SUM(counter.count), 0)', 'total')
			.where('counter.workflowId = :workflowId', { workflowId })
			.andWhere("counter.periodUnit = 'day'")
			.andWhere('counter.periodStart = :day', { day })
			.getRawOne<{ total: string }>();

		return Number(result?.total ?? 0);
	}
}

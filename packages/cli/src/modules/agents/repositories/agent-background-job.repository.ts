import { Service } from '@n8n/di';
import { DataSource, In, LessThan, Repository } from '@n8n/typeorm';
import { OperationalError } from 'n8n-workflow';

import {
	AgentBackgroundJob,
	type AgentBackgroundJobKind,
	type AgentBackgroundJobStatus,
} from '../entities/agent-background-job.entity';

export type NewAgentBackgroundJob = Pick<
	AgentBackgroundJob,
	'id' | 'kind' | 'parentAgentId' | 'parentThreadId' | 'projectId' | 'title'
> &
	Partial<
		Pick<
			AgentBackgroundJob,
			'subAgentId' | 'childThreadId' | 'childExecutionId' | 'workflowId' | 'dedupeKey' | 'timeoutAt'
		>
	>;

export type AgentBackgroundJobSettlement = {
	status: Exclude<AgentBackgroundJobStatus, 'running'>;
	result?: string | null;
	error?: string | null;
};

export type InsertJobOutcome =
	| { inserted: true }
	| { inserted: false; existing: AgentBackgroundJob };

@Service()
export class AgentBackgroundJobRepository extends Repository<AgentBackgroundJob> {
	constructor(dataSource: DataSource) {
		super(AgentBackgroundJob, dataSource.manager);
	}

	/**
	 * Insert a job row as `running`. The unique `(parentThreadId, dedupeKey)`
	 * index doubles as the single-flight gate: `orIgnore` (`ON CONFLICT DO
	 * NOTHING` on both supported drivers) lets a concurrent or earlier insert
	 * win silently, and the winner row is read back by the unique key so the
	 * caller can report the duplicate instead of erroring.
	 *
	 * The second attempt covers the winner settling (which clears its dedupe
	 * key, reopening the gate) between our ignored insert and the readback.
	 */
	async insertJob(job: NewAgentBackgroundJob): Promise<InsertJobOutcome> {
		for (let attempt = 0; attempt < 2; attempt++) {
			await this.createQueryBuilder()
				.insert()
				.into(AgentBackgroundJob)
				.values({ ...job, status: 'running' })
				.orIgnore()
				.execute();

			// Without a dedupe key nothing can conflict (the unique index skips NULLs).
			if (!job.dedupeKey) return { inserted: true };

			const inserted = await this.existsBy({ id: job.id });
			if (inserted) return { inserted: true };

			const existing = await this.findOne({
				where: { parentThreadId: job.parentThreadId, dedupeKey: job.dedupeKey },
			});
			if (existing) return { inserted: false, existing };
		}

		throw new OperationalError('Failed to register background job amid concurrent updates');
	}

	async countRunningByParentThread(parentThreadId: string): Promise<number> {
		return await this.count({ where: { parentThreadId, status: 'running' } });
	}

	async findByParentThread(parentThreadId: string, ids?: string[]): Promise<AgentBackgroundJob[]> {
		return await this.find({
			where: ids?.length ? { parentThreadId, id: In(ids) } : { parentThreadId },
			order: { createdAt: 'ASC' },
		});
	}

	async findRunningWorkflowJobByExecutionId(
		executionId: string,
	): Promise<AgentBackgroundJob | null> {
		return await this.findOne({
			where: { kind: 'workflow', status: 'running', childExecutionId: executionId },
		});
	}

	async findRunningJobs(kind?: AgentBackgroundJobKind): Promise<AgentBackgroundJob[]> {
		return await this.find({ where: kind ? { status: 'running', kind } : { status: 'running' } });
	}

	/** Running jobs whose timeout has passed — reconciliation fails these. */
	async findRunningPastTimeout(now: Date): Promise<AgentBackgroundJob[]> {
		return await this.find({ where: { status: 'running', timeoutAt: LessThan(now) } });
	}

	/**
	 * Settle the job iff it is still running. Every writer that ends a job —
	 * child settle, cancel, timeout, sweeper reconciliation — funnels through
	 * this guarded update, so the first writer wins and the rest are no-ops.
	 * The dedupe key is cleared so the single-flight gate only ever holds
	 * running jobs.
	 */
	async settleIfRunning(id: string, settlement: AgentBackgroundJobSettlement): Promise<boolean> {
		const result = await this.update(
			{ id, status: 'running' },
			{
				status: settlement.status,
				result: settlement.result ?? null,
				error: settlement.error ?? null,
				dedupeKey: null,
				settledAt: new Date(),
			},
		);
		return result.affected === 1;
	}
}

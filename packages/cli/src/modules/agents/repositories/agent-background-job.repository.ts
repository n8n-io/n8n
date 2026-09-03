import { Service } from '@n8n/di';
import { DataSource, In, IsNull, LessThan, Not, Repository } from '@n8n/typeorm';
import { OperationalError } from 'n8n-workflow';

import {
	AgentBackgroundJob,
	type AgentBackgroundJobKind,
	type AgentBackgroundJobStatus,
} from '../entities/agent-background-job.entity';

type NewAgentBackgroundJobBase = {
	id: string;
	parentAgentId: string;
	parentThreadId: string;
	parentResourceId: string;
	parentPrincipalHash: string;
	title: string;
};

export type NewSubAgentJob = NewAgentBackgroundJobBase & {
	kind: 'subagent';
	subAgentId: string;
	childThreadId: string;
	timeoutAt: Date;
};

export type NewWorkflowJob = NewAgentBackgroundJobBase & {
	kind: 'workflow';
	workflowId: string;
	childExecutionId: string;
};

export type NewAgentBackgroundJob = NewSubAgentJob | NewWorkflowJob;

export type AgentBackgroundJobSettlement = {
	status: Exclude<AgentBackgroundJobStatus, 'running'>;
	result?: string | null;
	error?: string | null;
};

@Service()
export class AgentBackgroundJobRepository extends Repository<AgentBackgroundJob> {
	constructor(dataSource: DataSource) {
		super(AgentBackgroundJob, dataSource.manager);
	}

	async insertJob(job: NewAgentBackgroundJob): Promise<void> {
		await this.insert({ ...job, status: 'running' });
	}

	/**
	 * Insert a workflow job, or read back the job already tracking the same
	 * execution.
	 */
	async insertWorkflowJobOrGetExisting(
		job: NewWorkflowJob,
	): Promise<{ inserted: true } | { inserted: false; existing: AgentBackgroundJob }> {
		await this.createQueryBuilder()
			.insert()
			.into(AgentBackgroundJob)
			.values({ ...job, status: 'running' })
			.orIgnore()
			.execute();

		const inserted = await this.existsBy({ id: job.id });
		if (inserted) return { inserted: true };

		const existing = await this.findOne({ where: { childExecutionId: job.childExecutionId } });
		if (existing) return { inserted: false, existing };

		throw new OperationalError('Failed to register workflow background job');
	}

	/** Running sub-agent jobs only: parked workflow jobs do not count toward the cap. */
	async countRunningSubAgentsByParentThread(parentThreadId: string): Promise<number> {
		return await this.count({ where: { parentThreadId, kind: 'subagent', status: 'running' } });
	}

	async findByParentThread(parentThreadId: string, ids?: string[]): Promise<AgentBackgroundJob[]> {
		return await this.find({
			where: ids?.length ? { parentThreadId, id: In(ids) } : { parentThreadId },
			order: { createdAt: 'ASC' },
		});
	}

	async findById(id: string): Promise<AgentBackgroundJob | null> {
		return await this.findOneBy({ id });
	}

	async findWakeableUnconsumedSettled(parentThreadId: string): Promise<AgentBackgroundJob[]> {
		return await this.createQueryBuilder('job')
			.where('job.parentThreadId = :parentThreadId', { parentThreadId })
			.andWhere('job.settledAt IS NOT NULL')
			.andWhere('job.notifiedAt IS NULL')
			.andWhere('job.parentResourceId IS NOT NULL')
			.andWhere('job.parentPrincipalHash IS NOT NULL')
			.orderBy('job.settledAt', 'ASC')
			.addOrderBy('job.createdAt', 'ASC')
			.getMany();
	}

	async markMailConsumed(parentThreadId: string, ids: string[]): Promise<number> {
		if (ids.length === 0) return 0;

		const result = await this.update(
			{
				parentThreadId,
				id: In(ids),
				settledAt: Not(IsNull()),
				notifiedAt: IsNull(),
			},
			{ notifiedAt: new Date() },
		);
		return result.affected ?? 0;
	}

	/** Threads with pending mail that has enough identity to run automatically. */
	async findThreadsWithUnconsumedMail(): Promise<string[]> {
		const rows = await this.createQueryBuilder('job')
			.select('DISTINCT job.parentThreadId', 'parentThreadId')
			.where('job.settledAt IS NOT NULL')
			.andWhere('job.notifiedAt IS NULL')
			.andWhere('job.parentResourceId IS NOT NULL')
			.andWhere('job.parentPrincipalHash IS NOT NULL')
			.getRawMany<{ parentThreadId: string }>();

		return rows.map(({ parentThreadId }) => parentThreadId);
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
	 */
	async settleIfRunning(id: string, settlement: AgentBackgroundJobSettlement): Promise<boolean> {
		const result = await this.update(
			{ id, status: 'running' },
			{
				status: settlement.status,
				result: settlement.result ?? null,
				error: settlement.error ?? null,
				settledAt: new Date(),
			},
		);
		return result.affected === 1;
	}

	/** Retention: drop settled rows past the cutoff. */
	async deleteSettledBefore(cutoff: Date): Promise<void> {
		await this.delete({ status: Not('running'), settledAt: LessThan(cutoff) });
	}
}

import { Service } from '@n8n/di';
import { DataSource, In, IsNull, LessThan, Not, Repository } from '@n8n/typeorm';
import { OperationalError } from 'n8n-workflow';

import {
	AgentBackgroundJob,
	type AgentBackgroundJobKind,
	type AgentBackgroundJobStatus,
} from '../entities/agent-background-job.entity';
import { AgentCheckpoint } from '../entities/agent-checkpoint.entity';

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
	status: Exclude<AgentBackgroundJobStatus, 'running' | 'suspended'>;
	result?: string | null;
	error?: string | null;
};

export type ExpectedBackgroundJobState = {
	status: 'running' | 'suspended';
	timeoutAt?: Date | null;
};

export type BackgroundJobGroupItem = Pick<
	AgentBackgroundJob,
	'id' | 'kind' | 'title' | 'status' | 'createdAt' | 'settledAt' | 'notifiedAt'
>;

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

	/** Suspended children still occupy a job slot. */
	async countActiveSubAgentsByParentThread(parentThreadId: string): Promise<number> {
		return await this.count({
			where: { parentThreadId, kind: 'subagent', status: In(['running', 'suspended']) },
		});
	}

	async findByParentThread(parentThreadId: string, ids?: string[]): Promise<AgentBackgroundJob[]> {
		return await this.find({
			where: ids?.length ? { parentThreadId, id: In(ids) } : { parentThreadId },
			order: { createdAt: 'ASC' },
		});
	}

	async findGroupCandidates(
		parentAgentId: string,
		parentThreadId: string,
	): Promise<BackgroundJobGroupItem[]> {
		return await this.find({
			where: { parentAgentId, parentThreadId },
			select: ['id', 'kind', 'title', 'status', 'createdAt', 'settledAt', 'notifiedAt'],
			order: { createdAt: 'ASC' },
		});
	}

	async findById(id: string): Promise<AgentBackgroundJob | null> {
		return await this.findOneBy({ id });
	}

	/** Results and approval requests that still need delivery. */
	async findWakeableUnconsumed(parentThreadId: string): Promise<AgentBackgroundJob[]> {
		return await this.createQueryBuilder('job')
			.where('job.parentThreadId = :parentThreadId', { parentThreadId })
			.andWhere("job.status <> 'running'")
			.andWhere('job.notifiedAt IS NULL')
			.orderBy('COALESCE(job.settledAt, job.updatedAt)', 'ASC')
			.addOrderBy('job.createdAt', 'ASC')
			.getMany();
	}

	async markMailConsumed(parentThreadId: string, ids: string[]): Promise<number> {
		if (ids.length === 0) return 0;

		const result = await this.createQueryBuilder()
			.update()
			.set({ notifiedAt: new Date() })
			.where({ parentThreadId, id: In(ids) })
			.andWhere('settledAt IS NOT NULL')
			.andWhere('notifiedAt IS NULL')
			.execute();
		return result.affected ?? 0;
	}

	async markApprovalDelivered(id: string, runId: string, state: string): Promise<void> {
		await this.createQueryBuilder()
			.update()
			.set({ notifiedAt: new Date() })
			.where({ id, status: 'suspended', notifiedAt: IsNull() })
			.andWhere(this.matchCheckpoint(), { runId, state, expired: false })
			.execute();
	}

	private matchCheckpoint(): string {
		const checkpoint = this.createQueryBuilder()
			.subQuery()
			.select('1')
			.from(AgentCheckpoint, 'checkpoint')
			.where('checkpoint.runId = :runId')
			.andWhere('checkpoint.state = :state')
			.andWhere('checkpoint.expired = :expired')
			.getQuery();
		return `EXISTS ${checkpoint}`;
	}

	/** Threads with results or approvals that still need delivery. */
	async findThreadsWithUnconsumedMail(): Promise<string[]> {
		const rows = await this.createQueryBuilder('job')
			.select('DISTINCT job.parentThreadId', 'parentThreadId')
			.where("job.status <> 'running'")
			.andWhere('job.notifiedAt IS NULL')
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

	async findSettledSubAgentsWithCheckpoints(): Promise<AgentBackgroundJob[]> {
		return await this.createQueryBuilder('job')
			.innerJoin(
				AgentCheckpoint,
				'checkpoint',
				'checkpoint.agentId = job.subAgentId AND checkpoint.threadId = job.childThreadId',
			)
			.where("job.kind = 'subagent'")
			.andWhere("job.status NOT IN ('running', 'suspended')")
			.andWhere('checkpoint.state IS NOT NULL')
			.distinct(true)
			.getMany();
	}

	/** Active jobs whose execution or approval deadline has passed. */
	async findActivePastTimeout(now: Date): Promise<AgentBackgroundJob[]> {
		return await this.find({
			where: { status: In(['running', 'suspended']), timeoutAt: LessThan(now) },
		});
	}

	async suspendIfRunning(
		id: string,
		timeoutAt: Date,
		runId: string,
		state: string,
	): Promise<boolean> {
		const result = await this.createQueryBuilder()
			.update()
			.set({ status: 'suspended', timeoutAt, notifiedAt: null })
			.where({ id, status: 'running' })
			.andWhere(this.matchCheckpoint(), { runId, state, expired: false })
			.execute();
		return result.affected === 1;
	}

	async resumeIfSuspended(id: string, timeoutAt: Date): Promise<boolean> {
		const result = await this.update(
			{ id, status: 'suspended' },
			{ status: 'running', timeoutAt, notifiedAt: null },
		);
		return result.affected === 1;
	}

	/**
	 * Settle the job if it is still active. Every writer that ends a job —
	 * child settle, cancel, timeout, sweeper reconciliation — funnels through
	 * this guarded update, so the first writer wins and the rest are no-ops.
	 */
	async settleIfActive(
		id: string,
		settlement: AgentBackgroundJobSettlement,
		expected?: ExpectedBackgroundJobState,
	): Promise<boolean> {
		const result = await this.update(
			{
				id,
				status: expected?.status ?? In(['running', 'suspended']),
				...(expected?.timeoutAt !== undefined ? { timeoutAt: expected.timeoutAt ?? IsNull() } : {}),
			},
			{
				status: settlement.status,
				result: settlement.result ?? null,
				error: settlement.error ?? null,
				settledAt: new Date(),
				notifiedAt: null,
			},
		);
		return result.affected === 1;
	}

	/** Delete settled jobs older than the cutoff only if their results are marked as delivered. */
	async deleteSettledBefore(cutoff: Date): Promise<void> {
		await this.delete({
			status: In(['completed', 'failed', 'cancelled']),
			settledAt: LessThan(cutoff),
			notifiedAt: Not(IsNull()),
		});
	}
}

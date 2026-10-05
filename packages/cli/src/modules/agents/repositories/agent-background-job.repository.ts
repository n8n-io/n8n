import { BaseRepository, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, In, IsNull, LessThan, Not } from '@n8n/typeorm';
import { OperationalError, UserError } from 'n8n-workflow';

import {
	AgentBackgroundJob,
	type AgentBackgroundJobKind,
	type AgentBackgroundJobStatus,
} from '../entities/agent-background-job.entity';
import { AgentCheckpoint } from '../entities/agent-checkpoint.entity';
import { AgentExecution } from '../entities/agent-execution.entity';
import { AgentExecutionThreadRepository } from './agent-execution-thread.repository';

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

export type AgentBackgroundJobSettlement = {
	status: Exclude<AgentBackgroundJobStatus, 'running' | 'suspended' | 'paused'>;
	result?: string | null;
	error?: string | null;
};

export type ExpectedBackgroundJobState = {
	status: 'running' | 'suspended' | 'paused';
	timeoutAt?: Date | null;
	pauseRequestId?: string | null;
};

export type BackgroundJobGroupItem = Pick<
	AgentBackgroundJob,
	'id' | 'kind' | 'title' | 'status' | 'createdAt' | 'settledAt' | 'notifiedAt'
>;

@Service()
export class AgentBackgroundJobRepository extends BaseRepository<AgentBackgroundJob> {
	constructor(
		dataSource: DataSource,
		transactionRunner: TransactionRunner,
		private readonly threadRepository: AgentExecutionThreadRepository,
	) {
		super(AgentBackgroundJob, dataSource.manager, transactionRunner);
	}

	async insertSubAgentJobIfCapacity(job: NewSubAgentJob, limit: number): Promise<boolean> {
		return await this.runInTransaction({}, async (manager, ctx) => {
			if (!(await this.threadRepository.lockById(job.parentThreadId, ctx))) {
				throw new UserError('Session not found');
			}
			if ((await this.countActiveSubAgentsByParentThread(job.parentThreadId, ctx)) >= limit)
				return false;
			await manager.insert(AgentBackgroundJob, { ...job, status: 'running' });
			return true;
		});
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
	async countActiveSubAgentsByParentThread(
		parentThreadId: string,
		ctx: OperationContext = {},
	): Promise<number> {
		return await this.managerFor(ctx).count(AgentBackgroundJob, {
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
		const activePauseGroup = this.createQueryBuilder()
			.subQuery()
			.select('1')
			.from(AgentBackgroundJob, 'member')
			.leftJoin(
				AgentExecution,
				'execution',
				"execution.threadId = member.childThreadId AND execution.status = 'running'",
			)
			.where('member.pauseRequestId = job.pauseRequestId')
			.andWhere('member.parentThreadId = job.parentThreadId')
			.andWhere("(member.status IN ('running', 'suspended') OR execution.id IS NOT NULL)")
			.getQuery();
		return await this.createQueryBuilder('job')
			.where('job.parentThreadId = :parentThreadId', { parentThreadId })
			.andWhere("job.status <> 'running'")
			.andWhere('job.notifiedAt IS NULL')
			.andWhere(`(job.pauseRequestId IS NULL OR NOT EXISTS ${activePauseGroup})`)
			.orderBy('COALESCE(job.settledAt, job.updatedAt)', 'ASC')
			.addOrderBy('job.createdAt', 'ASC')
			.getMany();
	}

	async markMailConsumed(
		parentThreadId: string,
		ids: string[],
		includePauseReports = false,
	): Promise<number> {
		if (ids.length === 0) return 0;

		const query = this.createQueryBuilder()
			.update()
			.set({ notifiedAt: new Date() })
			.where({ parentThreadId, id: In(ids) })
			.andWhere('settledAt IS NOT NULL')
			.andWhere('notifiedAt IS NULL');
		if (!includePauseReports) query.andWhere('pauseRequestId IS NULL');
		const result = await query.execute();
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

	async findRequestedPauses(parentThreadId?: string): Promise<AgentBackgroundJob[]> {
		return await this.find({
			where: {
				kind: 'subagent',
				pauseRequestId: Not(IsNull()),
				status: In(['running', 'suspended', 'paused']),
				...(parentThreadId ? { parentThreadId } : {}),
			},
		});
	}

	async findSettledSubAgentsWithCheckpoints(): Promise<AgentBackgroundJob[]> {
		return await this.createQueryBuilder('job')
			.innerJoin(
				AgentCheckpoint,
				'checkpoint',
				'checkpoint.agentId = job.subAgentId AND checkpoint.threadId = job.childThreadId',
			)
			.where("job.kind = 'subagent'")
			.andWhere("job.status NOT IN ('running', 'suspended', 'paused')")
			.andWhere('checkpoint.state IS NOT NULL')
			.distinct(true)
			.getMany();
	}

	async findPausedWithoutCheckpoint(
		updatedAfter: Date,
		parentThreadId?: string,
	): Promise<AgentBackgroundJob[]> {
		const checkpoint = this.createQueryBuilder()
			.subQuery()
			.select('1')
			.from(AgentCheckpoint, 'checkpoint')
			.where('checkpoint.agentId = job.subAgentId')
			.andWhere('checkpoint.threadId = job.childThreadId')
			.andWhere('checkpoint.expired = :expired')
			.andWhere('checkpoint.state IS NOT NULL')
			.andWhere('checkpoint.updatedAt > :updatedAfter')
			.getQuery();
		const query = this.createQueryBuilder('job')
			.where({ kind: 'subagent', status: 'paused' })
			.andWhere(`NOT EXISTS ${checkpoint}`, { expired: false, updatedAfter });
		if (parentThreadId) query.andWhere('job.parentThreadId = :parentThreadId', { parentThreadId });
		return await query.getMany();
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
			{ id, status: 'suspended', pauseRequestId: IsNull() },
			{ status: 'running', timeoutAt, notifiedAt: null },
		);
		return result.affected === 1;
	}

	async requestPause(
		parentAgentId: string,
		parentThreadId: string,
		parentResourceId: string,
		pauseRequestId: string,
	): Promise<void> {
		await this.update(
			{
				parentAgentId,
				parentThreadId,
				parentResourceId,
				kind: 'subagent',
				status: In(['running', 'suspended']),
				pauseRequestId: IsNull(),
			},
			{ pauseRequestId, notifiedAt: null },
		);
	}

	async pauseIfRequested(
		job: AgentBackgroundJob,
		resultText: string,
		runId: string,
		state: string,
	): Promise<boolean> {
		const running = this.createQueryBuilder()
			.subQuery()
			.select('1')
			.from(AgentExecution, 'execution')
			.where('execution.threadId = :childThreadId')
			.andWhere("execution.status = 'running'")
			.getQuery();
		const result = await this.createQueryBuilder()
			.update()
			.set({
				status: 'paused',
				result: resultText,
				timeoutAt: null,
				settledAt: new Date(),
				notifiedAt: null,
			})
			.where({ id: job.id, status: In(['running', 'suspended']), pauseRequestId: Not(IsNull()) })
			.andWhere(this.matchCheckpoint(), { runId, state, expired: false })
			.andWhere(`NOT EXISTS ${running}`, { childThreadId: job.childThreadId })
			.execute();
		return result.affected === 1;
	}

	async resumeIfPaused(
		id: string,
		pauseRequestId: string,
		status: 'running' | 'suspended',
		timeoutAt: Date,
	): Promise<boolean> {
		const result = await this.update(
			{ id, status: 'paused', pauseRequestId, notifiedAt: Not(IsNull()) },
			{ status, pauseRequestId: null, timeoutAt, settledAt: null, notifiedAt: null, result: null },
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
				status: expected?.status ?? In(['running', 'suspended', 'paused']),
				...(expected?.timeoutAt !== undefined ? { timeoutAt: expected.timeoutAt ?? IsNull() } : {}),
				...(expected?.pauseRequestId !== undefined
					? { pauseRequestId: expected.pauseRequestId ?? IsNull() }
					: {}),
			},
			{
				status: settlement.status,
				result: settlement.result ?? null,
				error: settlement.error ?? null,
				settledAt: new Date(),
				notifiedAt:
					settlement.status === 'cancelled' || expected?.status === 'paused'
						? () => 'CASE WHEN "status" = \'paused\' THEN "notifiedAt" ELSE NULL END'
						: null,
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

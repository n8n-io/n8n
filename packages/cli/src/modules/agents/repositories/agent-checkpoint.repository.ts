import { BaseRepository, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import {
	DataSource,
	In,
	IsNull,
	LessThan,
	MoreThan,
	Not,
	Raw,
	type EntityManager,
} from '@n8n/typeorm';
import { isRecord } from '@n8n/utils/is-record';
import { UnexpectedError } from '@n8n/errors';

import { AgentCheckpoint } from '../entities/agent-checkpoint.entity';
import { AgentBackgroundJob } from '../entities/agent-background-job.entity';

type ExpiredCheckpoints = {
	affected: number;
	threadIds: string[];
};

@Service()
export class AgentCheckpointRepository extends BaseRepository<AgentCheckpoint> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(AgentCheckpoint, dataSource.manager, transactionRunner);
	}

	async findByRunId(runId: string, ctx: OperationContext = {}): Promise<AgentCheckpoint | null> {
		return await this.managerFor(ctx).findOneBy(AgentCheckpoint, { runId });
	}

	async findByRunIdAndAgentId(
		runId: string,
		agentId: string,
		ctx: OperationContext = {},
	): Promise<AgentCheckpoint | null> {
		return await this.managerFor(ctx).findOneBy(AgentCheckpoint, { runId, agentId });
	}

	async findActiveForThread(
		agentId: string,
		threadId: string,
		updatedAfter: Date,
		ctx: OperationContext = {},
	): Promise<AgentCheckpoint[]> {
		const retained = this.retainedApprovalCheckpoints().select('retained.runId');
		return await this.managerFor(ctx)
			.createQueryBuilder(AgentCheckpoint, 'checkpoint')
			.where({ agentId, threadId, expired: false })
			.andWhere(
				`(checkpoint.updatedAt > :updatedAfter OR checkpoint.runId IN (${retained.getQuery()}))`,
				{ updatedAfter },
			)
			.setParameters(retained.getParameters())
			.orderBy('checkpoint.updatedAt', 'DESC')
			.getMany();
	}

	async saveCheckpoint(checkpoint: AgentCheckpoint, ctx: OperationContext): Promise<void> {
		await this.managerFor(ctx).save(AgentCheckpoint, checkpoint);
	}

	async findRetainedByThreadId(threadId: string): Promise<AgentCheckpoint[]> {
		return await this.find({ where: { threadId } });
	}

	async findForSandboxReconciliation(agentId: string): Promise<AgentCheckpoint[]> {
		return await this.find({
			where: { agentId, expired: false },
			order: { updatedAt: 'DESC' },
			take: 101,
		});
	}

	async claimForResume(
		runId: string,
		agentId: string,
		suspendedState: string,
		runningState: string,
		updatedAfter?: Date,
	): Promise<boolean> {
		const result = await this.update(
			{
				runId,
				agentId,
				expired: false,
				state: suspendedState,
				...(updatedAfter && { updatedAt: MoreThan(updatedAfter) }),
			},
			{ state: runningState },
		);

		return (result.affected ?? 0) > 0;
	}

	async cancelSuspended(
		runId: string,
		agentId: string,
		suspendedState: string,
		ctx: OperationContext = {},
	): Promise<boolean> {
		const result = await this.managerFor(ctx).update(
			AgentCheckpoint,
			{ runId, agentId, expired: false, state: suspendedState },
			{ expired: true },
		);

		return (result.affected ?? 0) > 0;
	}

	async markUserPaused(
		runId: string,
		agentId: string,
		state: string,
		pausedState: string,
		updatedAt: Date,
	): Promise<boolean> {
		const result = await this.update(
			{ runId, agentId, state, expired: false, updatedAt },
			{ state: pausedState, updatedAt },
		);
		return result.affected === 1;
	}

	async expireByRunIdAndAgentId(
		runId: string,
		agentId: string,
		ctx: OperationContext = {},
	): Promise<void> {
		await this.managerFor(ctx).update(
			AgentCheckpoint,
			{ runId, agentId },
			{ expired: true, state: null },
		);
		await this.managerFor(ctx).update(
			AgentBackgroundJob,
			{
				parentRunId: runId,
				parentAgentId: agentId,
				kind: 'approval',
				status: In(['completed', 'failed', 'cancelled']),
				notifiedAt: IsNull(),
			},
			{ notifiedAt: new Date() },
		);
	}

	/**
	 * Expires checkpoints that still hold state and were last updated before
	 * `olderThan`. Returns affected threads without a retained approval request.
	 * A save that refreshes a checkpoint first keeps that row. Its thread id is
	 * not returned.
	 */
	async expireStale(olderThan: Date): Promise<ExpiredCheckpoints> {
		// Postgres returns changed rows. SQLite reads and updates them in one write transaction.
		const expired =
			this.manager.connection.options.type === 'postgres'
				? await this.expireStaleOnPostgres(olderThan)
				: await this.expireStaleOnSqlite(olderThan);
		if (expired.threadIds.length === 0) return expired;
		const retained = await this.retainedApprovalCheckpoints()
			.select('retained.threadId', 'threadId')
			.distinct(true)
			.andWhere('retained.threadId IN (:...threadIds)', { threadIds: expired.threadIds })
			.getRawMany<{ threadId: string }>();
		const retainedThreads = new Set(retained.map(({ threadId }) => threadId));
		// An older checkpoint can expire while another request still retains the same thread.
		return { ...expired, threadIds: expired.threadIds.filter((id) => !retainedThreads.has(id)) };
	}

	private async expireStaleOnPostgres(olderThan: Date): Promise<ExpiredCheckpoints> {
		const result = await this.staleExpiration(this.manager, olderThan)
			.returning(['threadId'])
			.execute();
		if (!Array.isArray(result.raw)) {
			throw new UnexpectedError('Checkpoint expiration did not return the updated rows');
		}
		const threadIds = threadIdsFromRows(result.raw);
		const affected = result.affected ?? result.raw.length;
		if (affected > result.raw.length) {
			throw new UnexpectedError('Checkpoint expiration did not return the updated rows');
		}
		return { affected, threadIds };
	}

	private async expireStaleOnSqlite(olderThan: Date): Promise<ExpiredCheckpoints> {
		return await this.manager.transaction(async (manager) => {
			const retained = this.retainedApprovalCheckpoints().select('retained.runId');
			const rows = await manager.find(AgentCheckpoint, {
				select: { runId: true, threadId: true },
				where: {
					updatedAt: LessThan(olderThan),
					state: Not(IsNull()),
					runId: Raw(
						(alias) => `${alias} NOT IN (${retained.getQuery()})`,
						retained.getParameters(),
					),
				},
			});
			const result = await this.staleExpiration(manager, olderThan).execute();
			return {
				affected: result.affected ?? 0,
				threadIds: threadIdsFromRows(rows),
			};
		});
	}

	private staleExpiration(manager: EntityManager, olderThan: Date) {
		const retained = this.retainedApprovalCheckpoints().select('retained.runId');
		return manager
			.createQueryBuilder()
			.update(AgentCheckpoint)
			.set({ expired: true, state: null })
			.where('updatedAt < :olderThan', { olderThan })
			.andWhere('state IS NOT NULL')
			.andWhere(`"runId" NOT IN (${retained.getQuery()})`, retained.getParameters());
	}

	private retainedApprovalCheckpoints() {
		return this.createQueryBuilder('retained')
			.innerJoin(
				AgentBackgroundJob,
				'job',
				'job.parentAgentId = retained.agentId AND job.parentRunId = retained.runId',
			)
			.where('job.kind = :approvalKind', { approvalKind: 'approval' })
			.andWhere('job.notifiedAt IS NULL');
	}

	async isRetainedForApproval(runId: string): Promise<boolean> {
		return await this.retainedApprovalCheckpoints()
			.andWhere('retained.runId = :runId', { runId })
			.getExists();
	}
}

function threadIdsFromRows(rows: unknown[]): string[] {
	const threadIds = new Set<string>();
	for (const row of rows) {
		if (!isRecord(row)) continue;
		if (typeof row.threadId === 'string') threadIds.add(row.threadId);
	}
	return [...threadIds];
}

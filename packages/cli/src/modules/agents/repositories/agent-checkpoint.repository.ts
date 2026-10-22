import { BaseRepository, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, IsNull, LessThan, MoreThan, Not, type EntityManager } from '@n8n/typeorm';
import { isRecord } from '@n8n/utils/is-record';
import { UnexpectedError } from 'n8n-workflow';

import { AgentCheckpoint } from '../entities/agent-checkpoint.entity';

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
		return await this.managerFor(ctx).find(AgentCheckpoint, {
			where: { agentId, threadId, expired: false, updatedAt: MoreThan(updatedAfter) },
			order: { updatedAt: 'DESC' },
		});
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
		updatedAfter: Date,
	): Promise<boolean> {
		const result = await this.update(
			{ runId, agentId, expired: false, state: suspendedState, updatedAt: MoreThan(updatedAfter) },
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
	}

	/**
	 * Expires checkpoints that still hold state and were last updated before
	 * `olderThan`. Returns the thread ids of the rows this update changed.
	 * A save that refreshes a checkpoint first keeps that row. Its thread id is
	 * not returned.
	 */
	async expireStale(olderThan: Date): Promise<ExpiredCheckpoints> {
		// Postgres returns the changed rows from the UPDATE. The sqlite driver
		// does not. Read those rows and update them in one write transaction.
		// BEGIN IMMEDIATE stops a save from landing between the two statements.
		if (this.manager.connection.options.type === 'postgres') {
			return await this.expireStaleOnPostgres(olderThan);
		}
		return await this.expireStaleOnSqlite(olderThan);
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
			const rows = await manager.find(AgentCheckpoint, {
				select: { runId: true, threadId: true },
				where: { updatedAt: LessThan(olderThan), state: Not(IsNull()) },
			});
			const result = await this.staleExpiration(manager, olderThan).execute();
			return {
				affected: result.affected ?? 0,
				threadIds: threadIdsFromRows(rows),
			};
		});
	}

	private staleExpiration(manager: EntityManager, olderThan: Date) {
		return manager
			.createQueryBuilder()
			.update(AgentCheckpoint)
			.set({ expired: true, state: null })
			.where('updatedAt < :olderThan', { olderThan })
			.andWhere('state IS NOT NULL');
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

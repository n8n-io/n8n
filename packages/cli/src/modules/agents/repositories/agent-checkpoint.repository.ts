import { BaseRepository, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, MoreThan } from '@n8n/typeorm';

import { AgentCheckpoint } from '../entities/agent-checkpoint.entity';

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

	async markExpired(olderThan: Date): Promise<number> {
		const result = await this.createQueryBuilder()
			.update()
			.set({ expired: true, state: null })
			.where('updatedAt < :olderThan', { olderThan })
			.andWhere('state IS NOT NULL')
			.execute();

		return result.affected ?? 0;
	}
}

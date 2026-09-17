import { BaseRepository, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { UnexpectedError } from 'n8n-workflow';

import { AgentCheckpoint } from '../entities/agent-checkpoint.entity';

@Service()
export class AgentCheckpointRepository extends BaseRepository<AgentCheckpoint> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(AgentCheckpoint, dataSource.manager, transactionRunner);
	}

	async saveState(
		runId: string,
		agentId: string,
		state: string,
		ctx: OperationContext,
	): Promise<void> {
		const manager = this.managerFor(ctx);
		const existing = await manager.findOneBy(AgentCheckpoint, { runId });
		if (existing && existing.agentId !== agentId) {
			throw new UnexpectedError('Agent checkpoint is owned by a different agent');
		}
		await manager.save(
			AgentCheckpoint,
			manager.create(AgentCheckpoint, {
				...existing,
				runId,
				agentId,
				state,
				expired: false,
			}),
		);
	}

	async findByRunIdAndAgentId(runId: string, agentId: string): Promise<AgentCheckpoint | null> {
		return await this.findOneBy({ runId, agentId });
	}

	async findActiveForAgent(agentId: string): Promise<AgentCheckpoint[]> {
		return await this.find({
			where: { agentId, expired: false },
			order: { updatedAt: 'DESC' },
		});
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
		ctx: OperationContext,
	): Promise<boolean> {
		const result = await this.managerFor(ctx).update(
			AgentCheckpoint,
			{ runId, agentId, expired: false, state: suspendedState },
			{ state: runningState },
		);

		return (result.affected ?? 0) > 0;
	}

	async cancelSuspended(
		runId: string,
		agentId: string,
		suspendedState: string,
		ctx: OperationContext,
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
		ctx: OperationContext,
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

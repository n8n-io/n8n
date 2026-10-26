import { BaseRepository, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, In, IsNull, MoreThan } from '@n8n/typeorm';

import { AgentCheckpoint } from '../entities/agent-checkpoint.entity';
import { AgentBackgroundJob } from '../entities/agent-background-job.entity';

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

	async markExpired(olderThan: Date): Promise<number> {
		const retained = this.retainedApprovalCheckpoints().select('retained.runId');
		const result = await this.createQueryBuilder()
			.update()
			.set({ expired: true, state: null })
			.where('updatedAt < :olderThan', { olderThan })
			.andWhere('state IS NOT NULL')
			.andWhere(`"runId" NOT IN (${retained.getQuery()})`, retained.getParameters())
			.execute();

		return result.affected ?? 0;
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

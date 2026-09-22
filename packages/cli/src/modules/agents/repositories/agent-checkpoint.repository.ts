import { BaseRepository, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { UnexpectedError, UserError } from 'n8n-workflow';

import { AgentCheckpoint } from '../entities/agent-checkpoint.entity';
import { AgentExecution } from '../entities/agent-execution.entity';
import { AgentExecutionThread } from '../entities/agent-execution-thread.entity';

interface SaveCheckpointInput {
	runId: string;
	agentId: string;
	threadId: string | null;
	state: string;
}

@Service()
export class AgentCheckpointRepository extends BaseRepository<AgentCheckpoint> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(AgentCheckpoint, dataSource.manager, transactionRunner);
	}

	async saveCheckpoint(input: SaveCheckpointInput, ctx: OperationContext = {}): Promise<void> {
		const manager = this.managerFor(ctx);
		const existing = await manager.findOneBy(AgentCheckpoint, { runId: input.runId });
		if (existing && existing.agentId !== input.agentId) {
			throw new UnexpectedError('Agent checkpoint is owned by a different agent');
		}
		if (existing?.expired) throw new UserError('This action has expired and cannot be resumed');

		if (existing) {
			const result = await manager.update(
				AgentCheckpoint,
				{ runId: input.runId, agentId: input.agentId, expired: false },
				{ threadId: input.threadId, state: input.state },
			);
			if (result.affected !== 1) {
				throw new UserError('This action has expired and cannot be resumed');
			}
			return;
		}

		await manager.insert(AgentCheckpoint, { ...input, expired: false });
	}

	async saveForRunningExecution(
		input: SaveCheckpointInput & { projectId: string; executionId: string },
		ctx: OperationContext,
	): Promise<void> {
		const manager = this.managerFor(ctx);
		if (!input.threadId) throw new UserError('Agent checkpoint has no session');
		const threadExists = await manager.exists(AgentExecutionThread, {
			where: { id: input.threadId, agentId: input.agentId, projectId: input.projectId },
		});
		const executionIsRunning = await manager.exists(AgentExecution, {
			where: { id: input.executionId, threadId: input.threadId, status: 'running' },
		});
		if (!threadExists || !executionIsRunning) {
			throw new UserError('Agent session is no longer active');
		}
		await this.saveCheckpoint(input, ctx);
	}

	async sessionExists(projectId: string, agentId: string, threadId: string): Promise<boolean> {
		return await this.manager.exists(AgentExecutionThread, {
			where: { id: threadId, projectId, agentId },
		});
	}

	async findByRunId(runId: string): Promise<AgentCheckpoint | null> {
		return await this.findOneBy({ runId });
	}

	async findByRunIdAndAgentId(runId: string, agentId: string): Promise<AgentCheckpoint | null> {
		return await this.findOneBy({ runId, agentId });
	}

	async findActiveForThread(agentId: string, threadId: string): Promise<AgentCheckpoint[]> {
		return await this.find({
			where: { agentId, threadId, expired: false },
			order: { updatedAt: 'DESC' },
		});
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
	): Promise<boolean> {
		const result = await this.update(
			{ runId, agentId, expired: false, state: suspendedState },
			{ state: runningState },
		);

		return (result.affected ?? 0) > 0;
	}

	async cancelSuspended(runId: string, agentId: string, suspendedState: string): Promise<boolean> {
		const result = await this.update(
			{ runId, agentId, expired: false, state: suspendedState },
			{ expired: true },
		);

		return (result.affected ?? 0) > 0;
	}

	async expireByRunIdAndAgentId(runId: string, agentId: string): Promise<void> {
		await this.update({ runId, agentId }, { expired: true, state: null });
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

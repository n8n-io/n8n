import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { AgentCheckpoint } from '../entities/agent-checkpoint.entity';

@Service()
export class AgentCheckpointRepository extends Repository<AgentCheckpoint> {
	constructor(dataSource: DataSource) {
		super(AgentCheckpoint, dataSource.manager);
	}

	async findByRunId(runId: string): Promise<AgentCheckpoint | null> {
		return await this.findOneBy({ runId });
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

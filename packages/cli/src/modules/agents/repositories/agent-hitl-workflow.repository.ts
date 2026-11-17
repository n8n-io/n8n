import { BaseRepository, TransactionRunner, WorkflowEntity, WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { NotFoundError } from '@n8n/errors';
import { DataSource } from '@n8n/typeorm';

import { Agent } from '../entities/agent.entity';
import { AgentProjectDeletionRepository } from './agent-project-deletion.repository';

class AgentTable extends BaseRepository<Agent> {
	constructor(dataSource: DataSource, transactions: TransactionRunner) {
		super(Agent, dataSource.manager, transactions);
	}
}

/** Private execution owners have no workflow shares. User workflow APIs cannot read or change them. */
@Service()
export class AgentHitlWorkflowRepository {
	private readonly table: AgentTable;

	constructor(
		dataSource: DataSource,
		private readonly transactions: TransactionRunner,
		private readonly workflows: WorkflowRepository,
		private readonly deletion: AgentProjectDeletionRepository,
	) {
		this.table = new AgentTable(dataSource, transactions);
	}

	async findExecutionProject(workflowId: string) {
		const agent = await this.table.managerFor({}).findOne(Agent, {
			where: { approvalWorkflowId: workflowId, scope: 'project' },
			relations: { project: true },
		});
		return agent?.project ?? undefined;
	}

	async deleteExecutionOwner(
		projectId: string,
		agentId: string,
		workflowId: string,
	): Promise<void> {
		await this.transactions.run({}, async (ctx) => {
			const manager = this.table.managerFor(ctx);
			const result = await manager.update(
				Agent,
				{ id: agentId, projectId, approvalWorkflowId: workflowId },
				{ approvalWorkflowId: null, updatedAt: () => '"updatedAt"' },
			);
			if (result.affected === 1) await manager.delete(WorkflowEntity, { id: workflowId });
		});
	}

	async ensureExecutionOwner(projectId: string, agentId: string): Promise<string> {
		return await this.deletion.withWritableProject(projectId, async (ctx) => {
			const manager = this.table.managerFor(ctx);
			// Lock the Agent on both supported databases before checking or creating its owner.
			await manager
				.createQueryBuilder()
				.update(Agent)
				.set({
					approvalWorkflowId: () => '"approvalWorkflowId"',
					updatedAt: () => '"updatedAt"',
				})
				.where({ id: agentId, projectId, scope: 'project' })
				.execute();
			const agent = await manager.findOneBy(Agent, { id: agentId, projectId, scope: 'project' });
			if (!agent) throw new NotFoundError('Agent not found');
			if (agent.approvalWorkflowId) return agent.approvalWorkflowId;
			const workflowId = await this.workflows.createPrivateExecutionOwner(ctx);
			await manager.update(
				Agent,
				{ id: agentId },
				{ approvalWorkflowId: workflowId, updatedAt: () => '"updatedAt"' },
			);
			return workflowId;
		});
	}
}

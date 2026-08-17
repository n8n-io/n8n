import { BaseRepository, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { AgentTask } from '../entities/agent-task.entity';

@Service()
export class AgentTaskRepository extends BaseRepository<AgentTask> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(AgentTask, dataSource.manager, transactionRunner);
	}

	async findByAgentId(agentId: string): Promise<AgentTask[]> {
		return await this.find({ where: { agentId }, order: { createdAt: 'ASC' } });
	}

	async findByIdAndAgentId(id: string, agentId: string): Promise<AgentTask | null> {
		return await this.findOne({ where: { id, agentId } });
	}

	/**
	 * Insert the task row when its id is free, inside the transaction that
	 * `ctx` carries. The task id is the only primary key of the table, and
	 * writers that accept external ids (config import) must not update a row
	 * that another agent owns. The insert never raises on a conflict — a
	 * raised error aborts a Postgres transaction — so the method reads the row
	 * back and returns true only when this agent owns the id.
	 */
	async claimTaskDefinition(task: AgentTask, ctx: OperationContext): Promise<boolean> {
		const manager = this.managerFor(ctx);
		await manager
			.createQueryBuilder()
			.insert()
			.into(AgentTask)
			.values({
				id: task.id,
				agentId: task.agentId,
				name: task.name,
				objective: task.objective,
				cronExpression: task.cronExpression,
			})
			.orIgnore()
			.updateEntity(false)
			.execute();

		const row = await manager.findOne(AgentTask, {
			where: { id: task.id },
			select: ['id', 'agentId'],
		});
		return row?.agentId === task.agentId;
	}
}

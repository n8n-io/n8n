import type { AgentTaskConfig } from '@n8n/api-types';
import { BaseRepository, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, In } from '@n8n/typeorm';
import isEqual from 'lodash/isEqual';

import { AgentTask } from '../entities/agent-task.entity';
import { getAgentTaskBody } from '../utils/agent-definition';

@Service()
export class AgentTaskRepository extends BaseRepository<AgentTask> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(AgentTask, dataSource.manager, transactionRunner);
	}

	async findByAgentId(agentId: string, ctx: OperationContext = {}): Promise<AgentTask[]> {
		return await this.managerFor(ctx).find(AgentTask, {
			where: { agentId },
			order: { createdAt: 'ASC' },
		});
	}

	async findByIdAndAgentId(id: string, agentId: string): Promise<AgentTask | null> {
		return await this.findOne({ where: { id, agentId } });
	}

	async saveDefinitions(tasks: AgentTask[], ctx: OperationContext): Promise<AgentTask[]> {
		return await this.managerFor(ctx).save(AgentTask, tasks);
	}

	async deleteForAgent(agentId: string, ids: string[], ctx: OperationContext): Promise<void> {
		if (ids.length === 0) return;
		await this.managerFor(ctx).delete(AgentTask, { agentId, id: In(ids) });
	}

	/** Restore task bodies without changing their owner or creation time. */
	async replaceForAgent(
		agentId: string,
		definitions: ReadonlyMap<string, AgentTaskConfig>,
		ctx: OperationContext,
	): Promise<boolean> {
		const repo = this.managerFor(ctx).getRepository(AgentTask);
		const existing = await this.findByAgentId(agentId, ctx);
		const existingBodies = new Map(existing.map((task) => [task.id, getAgentTaskBody(task)]));
		const nextBodies = new Map([...definitions].map(([id, task]) => [id, getAgentTaskBody(task)]));
		const changed = !isEqual(existingBodies, nextBodies);

		await this.deleteForAgent(
			agentId,
			existing.filter((task) => !definitions.has(task.id)).map((task) => task.id),
			ctx,
		);
		for (const [id, body] of nextBodies) {
			if (existingBodies.has(id)) {
				await repo.update({ id, agentId }, body);
			} else {
				// A task ID owned by another agent must fail, not move to this agent.
				await repo.insert({ id, agentId, ...body });
			}
		}
		return changed;
	}
}

import type { AgentTaskConfig } from '@n8n/api-types';
import { BaseRepository, chunkIds, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, In, IsNull } from '@n8n/typeorm';
import isEqual from 'lodash/isEqual';

import { AgentTask } from '../entities/agent-task.entity';
import { getAgentTaskBody } from '../utils/agent-definition';

export type AgentTaskImportIdentity = Pick<AgentTask, 'id' | 'agentId' | 'sourceTaskId'>;

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

	async findImportCandidates(
		agentId: string,
		sourceTaskIds: string[],
	): Promise<AgentTaskImportIdentity[]> {
		const tasks: AgentTaskImportIdentity[] = [];
		for (const ids of chunkIds([...new Set(sourceTaskIds)])) {
			tasks.push(
				...(await this.find({
					select: ['id', 'agentId', 'sourceTaskId'],
					where: [
						{ agentId, sourceTaskId: In(ids) },
						{ agentId, id: In(ids), sourceTaskId: IsNull() },
					],
				})),
			);
		}
		return tasks;
	}

	async findImportIdOwners(taskIds: string[]): Promise<Array<Pick<AgentTask, 'id' | 'agentId'>>> {
		const tasks: Array<Pick<AgentTask, 'id' | 'agentId'>> = [];
		for (const ids of chunkIds([...new Set(taskIds)])) {
			tasks.push(...(await this.find({ select: ['id', 'agentId'], where: { id: In(ids) } })));
		}
		return tasks;
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

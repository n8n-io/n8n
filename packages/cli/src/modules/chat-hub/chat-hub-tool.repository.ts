import { BaseRepository, TransactionRunner, contextFromEntityManager } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, EntityManager } from '@n8n/typeorm';

import { NotFoundError } from '@n8n/errors';

import { ChatHubAgent } from './chat-hub-agent.entity';
import { ChatHubSession } from './chat-hub-session.entity';
import { ChatHubTool, type IChatHubTool } from './chat-hub-tool.entity';

@Service()
export class ChatHubToolRepository extends BaseRepository<ChatHubTool> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(ChatHubTool, dataSource.manager, transactionRunner);
	}

	async updateOwnedTool(
		id: string,
		userId: string,
		updates: Partial<IChatHubTool>,
		trx?: EntityManager,
	) {
		return await this.runInTransaction(contextFromEntityManager(trx), async (em) => {
			if (!(await this.getOneById(id, userId, em))) {
				throw new NotFoundError('Chat hub tool not found');
			}
			return await this.updateTool(id, userId, updates, em);
		});
	}

	async deleteOwnedTool(id: string, userId: string, trx?: EntityManager): Promise<void> {
		await this.runInTransaction(contextFromEntityManager(trx), async (em) => {
			if (!(await this.getOneById(id, userId, em))) {
				throw new NotFoundError('Chat hub tool not found');
			}
			await this.deleteTool(id, userId, em);
		});
	}

	async createTool(tool: Partial<IChatHubTool> & Pick<IChatHubTool, 'id'>, trx?: EntityManager) {
		const em = trx ?? this.manager;
		await em.insert(ChatHubTool, tool);
		return await em.findOneOrFail(ChatHubTool, {
			where: { id: tool.id },
		});
	}

	async updateTool(
		id: string,
		userId: string,
		updates: Partial<IChatHubTool>,
		trx?: EntityManager,
	) {
		const em = trx ?? this.manager;
		const result = await em.update(ChatHubTool, { id, ownerId: userId }, updates);
		if (!result.affected) throw new NotFoundError('Chat hub tool not found');
		const tool = await em.findOne(ChatHubTool, { where: { id, ownerId: userId } });
		if (!tool) throw new NotFoundError('Chat hub tool not found');
		return tool;
	}

	async deleteTool(id: string, userId: string, trx?: EntityManager) {
		const em = trx ?? this.manager;
		const result = await em.delete(ChatHubTool, { id, ownerId: userId });
		if (!result.affected) throw new NotFoundError('Chat hub tool not found');
	}

	async getManyByUserId(userId: string) {
		return await this.find({
			where: { ownerId: userId },
			order: { createdAt: 'ASC' },
		});
	}

	async getEnabledByUserId(userId: string, trx?: EntityManager) {
		const em = trx ?? this.manager;
		return await em.find(ChatHubTool, {
			where: { ownerId: userId, enabled: true },
			order: { createdAt: 'ASC' },
		});
	}

	async getOneById(id: string, userId: string, trx?: EntityManager) {
		const em = trx ?? this.manager;
		return await em.findOne(ChatHubTool, {
			where: { id, ownerId: userId },
		});
	}

	async getByIds(ids: string[], userId: string, trx?: EntityManager) {
		const em = trx ?? this.manager;
		if (ids.length === 0) return [];
		return await em
			.createQueryBuilder(ChatHubTool, 'tool')
			.where('tool.id IN (:...ids)', { ids })
			.andWhere('tool.ownerId = :userId', { userId })
			.orderBy('tool.createdAt', 'ASC')
			.getMany();
	}

	async getToolsForSession(sessionId: string, trx?: EntityManager): Promise<ChatHubTool[]> {
		const em = trx ?? this.manager;
		const session = await em
			.createQueryBuilder(ChatHubSession, 'session')
			.innerJoinAndSelect('session.tools', 'tool')
			.where('session.id = :sessionId', { sessionId })
			.orderBy('tool.createdAt', 'ASC')
			.getOne();
		return session?.tools ?? [];
	}

	async getToolsForAgent(agentId: string, trx?: EntityManager): Promise<ChatHubTool[]> {
		const em = trx ?? this.manager;
		const agent = await em
			.createQueryBuilder(ChatHubAgent, 'agent')
			.innerJoinAndSelect('agent.tools', 'tool')
			.where('agent.id = :agentId', { agentId })
			.orderBy('tool.createdAt', 'ASC')
			.getOne();
		return agent?.tools ?? [];
	}

	async getToolIdsForSession(sessionId: string, trx?: EntityManager): Promise<string[]> {
		const em = trx ?? this.manager;
		const rows = await em
			.createQueryBuilder(ChatHubSession, 'session')
			.innerJoin('session.tools', 'tool')
			.select('tool.id', 'toolId')
			.where('session.id = :sessionId', { sessionId })
			.getRawMany<{ toolId: string }>();
		return rows.map((r) => r.toolId);
	}

	async getToolIdsForAgent(agentId: string, trx?: EntityManager): Promise<string[]> {
		const em = trx ?? this.manager;
		const rows = await em
			.createQueryBuilder(ChatHubAgent, 'agent')
			.innerJoin('agent.tools', 'tool')
			.select('tool.id', 'toolId')
			.where('agent.id = :agentId', { agentId })
			.getRawMany<{ toolId: string }>();
		return rows.map((r) => r.toolId);
	}

	async setSessionTools(sessionId: string, toolIds: string[], trx?: EntityManager): Promise<void> {
		const em = trx ?? this.manager;
		const currentToolIds = await this.getToolIdsForSession(sessionId, em);
		await em
			.createQueryBuilder()
			.relation(ChatHubSession, 'tools')
			.of(sessionId)
			.addAndRemove(toolIds, currentToolIds);
	}

	async setAgentTools(agentId: string, toolIds: string[], trx?: EntityManager): Promise<void> {
		const em = trx ?? this.manager;
		const currentToolIds = await this.getToolIdsForAgent(agentId, em);
		await em
			.createQueryBuilder()
			.relation(ChatHubAgent, 'tools')
			.of(agentId)
			.addAndRemove(toolIds, currentToolIds);
	}
}

import { Service } from '@n8n/di';
import { DataSource, EntityManager, Repository } from '@n8n/typeorm';

import { ChatHubAgent, IChatHubAgent } from './chat-hub-agent.entity';

@Service()
export class ChatHubAgentRepository extends Repository<ChatHubAgent> {
	constructor(dataSource: DataSource) {
		super(ChatHubAgent, dataSource.manager);
	}

	async createAgent(
		agent: Partial<IChatHubAgent> & Pick<IChatHubAgent, 'id'>,
		trx?: EntityManager,
	) {
		const em = trx ?? this.manager;
		await em.insert(ChatHubAgent, agent);
		return await em.findOneOrFail(ChatHubAgent, {
			where: { id: agent.id },
		});
	}

	async updateAgent(id: string, updates: Partial<IChatHubAgent>, trx?: EntityManager) {
		const em = trx ?? this.manager;
		await em.update(ChatHubAgent, { id }, updates);
		return await em.findOneOrFail(ChatHubAgent, {
			where: { id },
		});
	}

	async deleteAgent(id: string, trx?: EntityManager) {
		const em = trx ?? this.manager;
		return await em.delete(ChatHubAgent, { id });
	}

	async getManyByUserId(userId: string) {
		return await this.find({
			where: { ownerId: userId },
			order: { createdAt: 'DESC' },
		});
	}

	async getManyByUserIdWithToolIds(userId: string) {
		return await this.createQueryBuilder('agent')
			.leftJoin('agent.tools', 'tool')
			.addSelect('tool.id')
			.where('agent.ownerId = :userId', { userId })
			.orderBy('agent.createdAt', 'DESC')
			.getMany();
	}

	async getOneById(id: string, userId: string, trx?: EntityManager) {
		const em = trx ?? this.manager;
		return await em.findOne(ChatHubAgent, {
			where: { id, ownerId: userId },
		});
	}
}

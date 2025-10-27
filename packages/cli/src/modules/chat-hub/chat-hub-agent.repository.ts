import { withTransaction } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, EntityManager, Repository } from '@n8n/typeorm';

import { ChatHubAgent } from './chat-hub-agent.entity';

@Service()
export class ChatHubAgentRepository extends Repository<ChatHubAgent> {
	constructor(dataSource: DataSource) {
		super(ChatHubAgent, dataSource.manager);
	}

	async createAgent(agent: Partial<ChatHubAgent>, trx?: EntityManager) {
		return await withTransaction(this.manager, trx, async (em) => {
			await em.insert(ChatHubAgent, agent);
			return await em.findOneOrFail(ChatHubAgent, {
				where: { id: agent.id },
			});
		});
	}

	async updateAgent(
		id: string,
		updates: Partial<
			Pick<
				ChatHubAgent,
				'name' | 'description' | 'systemPrompt' | 'provider' | 'model' | 'credentialId'
			>
		>,
		trx?: EntityManager,
	) {
		return await withTransaction(this.manager, trx, async (em) => {
			await em.update(ChatHubAgent, { id }, updates);
			return await em.findOneOrFail(ChatHubAgent, {
				where: { id },
			});
		});
	}

	async deleteAgent(id: string, trx?: EntityManager) {
		return await withTransaction(this.manager, trx, async (em) => {
			return await em.delete(ChatHubAgent, { id });
		});
	}

	async getManyByUserId(userId: string) {
		return await this.find({
			where: { ownerId: userId },
			order: { createdAt: 'DESC' },
		});
	}

	async getOneById(id: string, userId: string, trx?: EntityManager) {
		return await withTransaction(
			this.manager,
			trx,
			async (em) => {
				return await em.findOne(ChatHubAgent, {
					where: { id, ownerId: userId },
				});
			},
			false,
		);
	}
}

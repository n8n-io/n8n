import { withTransaction } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, EntityManager, Repository } from '@n8n/typeorm';

import { ChatSession } from './chat-session.entity';

@Service()
export class ChatSessionRepository extends Repository<ChatSession> {
	constructor(dataSource: DataSource) {
		super(ChatSession, dataSource.manager);
	}

	async createChatSession(session: Partial<ChatSession>, trx?: EntityManager) {
		return await withTransaction(this.manager, trx, async (em) => {
			const chatSession = em.create(ChatSession, session);
			const saved = await em.save(chatSession);
			return await em.findOneOrFail(ChatSession, {
				where: { id: saved.id },
				relations: ['messages'],
			});
		});
	}

	async updateLastMessageAt(id: string, lastMessageAt: Date, trx?: EntityManager) {
		return await withTransaction(this.manager, trx, async (em) => {
			await em.update(ChatSession, { id }, { lastMessageAt });
			return await em.findOneOrFail(ChatSession, {
				where: { id },
				relations: ['messages'],
			});
		});
	}

	async updateChatTitle(id: string, title: string, trx?: EntityManager) {
		return await withTransaction(this.manager, trx, async (em) => {
			await em.update(ChatSession, { id }, { title });
			return await em.findOneOrFail(ChatSession, {
				where: { id },
				relations: ['messages'],
			});
		});
	}

	async deleteChatSession(id: string, trx?: EntityManager) {
		return await withTransaction(this.manager, trx, async (em) => {
			return await em.delete(ChatSession, { id });
		});
	}

	async getManyByUserId(userId: string) {
		return await this.find({
			where: { ownerId: userId },
			order: { lastMessageAt: 'DESC' },
		});
	}

	async getOneById(id: string, userId: string) {
		return await this.findOne({
			where: { id, ownerId: userId },
			relations: ['messages'],
		});
	}
}

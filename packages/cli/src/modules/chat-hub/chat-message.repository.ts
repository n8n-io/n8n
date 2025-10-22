import type { ChatHubMessageStatus, ChatMessageId, ChatSessionId } from '@n8n/api-types';
import { withTransaction } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, EntityManager, Repository } from '@n8n/typeorm';

import { ChatHubMessage } from './chat-hub-message.entity';
import { ChatHubSessionRepository } from './chat-session.repository';

@Service()
export class ChatHubMessageRepository extends Repository<ChatHubMessage> {
	constructor(
		dataSource: DataSource,
		private chatSessionRepository: ChatHubSessionRepository,
	) {
		super(ChatHubMessage, dataSource.manager);
	}

	async createChatMessage(message: Partial<ChatHubMessage>, trx?: EntityManager) {
		return await withTransaction(this.manager, trx, async (em) => {
			const chatMessage = em.create(ChatHubMessage, message);
			const saved = await em.save(chatMessage);
			await this.chatSessionRepository.updateLastMessageAt(saved.sessionId, saved.createdAt, em);
			return saved;
		});
	}

	async updateChatMessage(
		id: ChatMessageId,
		fields: { status?: ChatHubMessageStatus; content?: string },
		trx?: EntityManager,
	) {
		return await withTransaction(this.manager, trx, async (em) => {
			return await em.update(ChatHubMessage, { id }, fields);
		});
	}

	async deleteChatMessage(id: ChatMessageId, trx?: EntityManager) {
		return await withTransaction(this.manager, trx, async (em) => {
			return await em.delete(ChatHubMessage, { id });
		});
	}

	async getManyBySessionId(sessionId: string) {
		return await this.find({
			where: { sessionId },
			order: { createdAt: 'ASC', id: 'DESC' },
		});
	}

	async getOneById(id: ChatMessageId, sessionId: ChatSessionId, relations: string[] = []) {
		return await this.findOne({
			where: { id, sessionId },
			relations,
		});
	}
}

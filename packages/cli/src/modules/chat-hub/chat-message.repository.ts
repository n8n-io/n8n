import { withTransaction } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, EntityManager, Repository } from '@n8n/typeorm';

import { ChatMessage } from './chat-message.entity';
import { ChatSessionRepository } from './chat-session.repository';

@Service()
export class ChatMessageRepository extends Repository<ChatMessage> {
	constructor(
		dataSource: DataSource,
		private chatSessionRepository: ChatSessionRepository,
	) {
		super(ChatMessage, dataSource.manager);
	}

	async createChatMessage(message: Partial<ChatMessage>, trx?: EntityManager) {
		return await withTransaction(this.manager, trx, async (em) => {
			const chatMessage = em.create(ChatMessage, message);
			const saved = await em.save(chatMessage);
			await this.chatSessionRepository.updateLastMessageAt(saved.sessionId, saved.createdAt, em);
			return saved;
		});
	}

	async deleteChatMessage(id: string, trx?: EntityManager) {
		return await withTransaction(this.manager, trx, async (em) => {
			return await em.delete(ChatMessage, { id });
		});
	}

	async getManyBySessionId(sessionId: string) {
		return await this.find({
			where: { sessionId },
			order: { createdAt: 'ASC' },
		});
	}
}

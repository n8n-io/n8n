import { withTransaction } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, EntityManager, Repository } from '@n8n/typeorm';

import { ChatMessage, ChatMessageRole, ChatMessageType } from './chat-message.entity';
import { ChatSessionRepository } from './chat-session.repository';

@Service()
export class ChatMessageRepository extends Repository<ChatMessage> {
	constructor(
		dataSource: DataSource,
		private chatSessionRepository: ChatSessionRepository,
	) {
		super(ChatMessage, dataSource.manager);
	}

	async createChatMessage(
		id: string,
		sessionId: string,
		type: ChatMessageType,
		role: ChatMessageRole,
		name: string,
		content: string,
		additionalKwargs: string | null,
		toolCallId: string | null,
		trx?: EntityManager,
	) {
		return await withTransaction(this.manager, trx, async (em) => {
			const chatMessage = em.create(ChatMessage, {
				id,
				sessionId,
				type,
				role,
				name,
				content,
				additionalKwargs,
				toolCallId,
			});
			const saved = await em.save(chatMessage);
			await this.chatSessionRepository.updateLastMessageAt(sessionId, saved.createdAt, em);
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

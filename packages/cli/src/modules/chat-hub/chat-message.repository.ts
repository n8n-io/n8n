import type { ChatHubMessageStatus, ChatMessageId, ChatSessionId } from '@n8n/api-types';
import { withTransaction } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, EntityManager, Repository } from '@n8n/typeorm';

import { ChatHubMessage } from './chat-hub-message.entity';
import { ChatHubSessionRepository } from './chat-session.repository';
import { UnexpectedError, type IBinaryData } from 'n8n-workflow';
import { QueryDeepPartialEntity } from '@n8n/typeorm/query-builder/QueryPartialEntity';

@Service()
export class ChatHubMessageRepository extends Repository<ChatHubMessage> {
	constructor(
		dataSource: DataSource,
		private chatSessionRepository: ChatHubSessionRepository,
	) {
		super(ChatHubMessage, dataSource.manager);
	}

	async createChatMessage(message: QueryDeepPartialEntity<ChatHubMessage>, trx?: EntityManager) {
		const messageId = message.id;
		if (typeof messageId === 'function') {
			throw new UnexpectedError('Message ID is required and must be a string value');
		}

		return await withTransaction(
			this.manager,
			trx,
			async (em) => {
				await em.insert(ChatHubMessage, message);
				const saved = await em.findOneOrFail(ChatHubMessage, {
					where: { id: messageId },
				});
				await this.chatSessionRepository.updateLastMessageAt(saved.sessionId, saved.createdAt, em);
				return saved;
			},
			false,
		);
	}

	async updateChatMessage(
		id: ChatMessageId,
		fields: { status?: ChatHubMessageStatus; content?: string; attachments?: IBinaryData[] },
		trx?: EntityManager,
	) {
		return await withTransaction(
			this.manager,
			trx,
			async (em) => {
				return await em.update(ChatHubMessage, { id }, fields);
			},
			false,
		);
	}

	async deleteChatMessage(id: ChatMessageId, trx?: EntityManager) {
		return await withTransaction(
			this.manager,
			trx,
			async (em) => {
				return await em.delete(ChatHubMessage, { id });
			},
			false,
		);
	}

	async getManyBySessionId(sessionId: string, trx?: EntityManager) {
		return await withTransaction(
			this.manager,
			trx,
			async (em) => {
				return await em.find(ChatHubMessage, {
					where: { sessionId },
					order: { createdAt: 'ASC', id: 'DESC' },
				});
			},
			false,
		);
	}

	async getOneById(
		id: ChatMessageId,
		sessionId: ChatSessionId,
		relations: string[] = [],
		trx?: EntityManager,
	) {
		return await withTransaction(
			this.manager,
			trx,
			async (em) => {
				return await em.findOne(ChatHubMessage, {
					where: { id, sessionId },
					relations,
				});
			},
			false,
		);
	}
}

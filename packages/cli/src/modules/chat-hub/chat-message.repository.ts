import type {
	ChatHubConversationModel,
	ChatHubMessageStatus,
	ChatMessageId,
	ChatSessionId,
} from '@n8n/api-types';
import { User, withTransaction } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, EntityManager, Repository } from '@n8n/typeorm';
import { QueryDeepPartialEntity } from '@n8n/typeorm/query-builder/QueryPartialEntity';
import { UnexpectedError, type IBinaryData } from 'n8n-workflow';

import { ChatHubMessage } from './chat-hub-message.entity';
import { EditMessagePayload, HumanMessagePayload } from './chat-hub.types';
import { ChatHubSessionRepository } from './chat-session.repository';

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
		const sessionId = message.sessionId;

		if (typeof messageId === 'function' || !messageId) {
			throw new UnexpectedError('Message ID is required and must be a string value');
		}

		if (typeof sessionId === 'function' || !sessionId) {
			throw new UnexpectedError('Session ID is required and must be a string value');
		}

		return await withTransaction(this.manager, trx, async (em) => {
			await em.insert(ChatHubMessage, message);
			await this.chatSessionRepository.updateChatSession(
				sessionId,
				{ lastMessageAt: new Date() },
				em,
			);
		});
	}

	async createHumanMessage(
		payload: HumanMessagePayload | EditMessagePayload,
		attachments: IBinaryData[],
		user: User,
		previousMessageId: ChatMessageId | null,
		model: ChatHubConversationModel,
		revisionOfMessageId?: ChatMessageId,
		trx?: EntityManager,
	) {
		await this.createChatMessage(
			{
				id: payload.messageId,
				sessionId: payload.sessionId,
				type: 'human',
				status: 'success',
				content: payload.message,
				previousMessageId,
				revisionOfMessageId,
				name: user.firstName || 'User',
				attachments,
				...model,
			},
			trx,
		);
	}

	async createAIMessage({
		id,
		sessionId,
		executionId,
		previousMessageId,
		content,
		model,
		retryOfMessageId,
		status,
	}: {
		id: ChatMessageId;
		sessionId: ChatSessionId;
		previousMessageId: ChatMessageId | null;
		content: string;
		model: ChatHubConversationModel;
		executionId?: string;
		retryOfMessageId: ChatMessageId | null;
		editOfMessageId?: ChatMessageId;
		status?: ChatHubMessageStatus;
	}) {
		await this.createChatMessage({
			id,
			sessionId,
			previousMessageId,
			executionId: executionId ? parseInt(executionId, 10) : null,
			type: 'ai',
			name: 'AI',
			status,
			content,
			retryOfMessageId,
			...model,
		});
	}

	async updateChatMessage(
		id: ChatMessageId,
		fields: { status?: ChatHubMessageStatus; content?: string; attachments?: IBinaryData[] },
		trx?: EntityManager,
	) {
		const em = trx ?? this.manager;
		return await em.update(ChatHubMessage, { id }, fields);
	}

	async deleteChatMessage(id: ChatMessageId, trx?: EntityManager) {
		const em = trx ?? this.manager;
		return await em.delete(ChatHubMessage, { id });
	}

	async getManyBySessionId(sessionId: string, trx?: EntityManager) {
		const em = trx ?? this.manager;
		return await em.find(ChatHubMessage, {
			where: { sessionId },
			order: { createdAt: 'ASC', id: 'DESC' },
		});
	}

	async getOneById(
		id: ChatMessageId,
		sessionId: ChatSessionId,
		relations: string[] = [],
		trx?: EntityManager,
	) {
		const em = trx ?? this.manager;
		return await em.findOne(ChatHubMessage, {
			where: { id, sessionId },
			relations,
		});
	}
}

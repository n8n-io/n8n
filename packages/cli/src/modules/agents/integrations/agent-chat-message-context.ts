import type { AgentIntegrationConfig } from '@n8n/api-types';
import type { Message, MessageSubject, Thread } from 'chat';
import type { Logger } from 'n8n-workflow';

import type { IntegrationMessageContextService } from './integration-message-context.service';
import {
	buildIntegrationConnectionId,
	type IntegrationMessageContext,
	type IntegrationMessageSubject,
} from './integration-tools';

interface UpdateLatestMessageContextOptions {
	messageId?: string;
	interactingUserId?: string;
	agentUserId?: string;
	subject?: IntegrationMessageSubject;
}

export class AgentChatMessageContextBridge {
	constructor(
		private readonly messageContextStore: IntegrationMessageContextService | undefined,
		private readonly integration: AgentIntegrationConfig,
		private readonly agentId: string,
		private readonly logger: Logger,
	) {}

	async updateLatest(
		threadId: string,
		resourceId: string,
		thread: Thread<unknown, unknown>,
		options: UpdateLatestMessageContextOptions = {},
	): Promise<IntegrationMessageContext | undefined> {
		if (!this.messageContextStore) return undefined;

		const integrationConnectionId = buildIntegrationConnectionId(this.integration);
		const previousContext = await this.getPreviousContext(threadId, integrationConnectionId);
		const agentUserId = options.agentUserId ?? previousContext?.agentUserId;
		const context: IntegrationMessageContext = {
			integrationConnectionId,
			platform: this.integration.type,
			target: {
				type: 'thread',
				threadId: thread.id,
				channelId: thread.channelId,
			},
			...(options.messageId ? { messageId: options.messageId } : {}),
			...(options.interactingUserId ? { interactingUserId: options.interactingUserId } : {}),
			...(agentUserId ? { agentUserId } : {}),
			...(options.subject ? { subject: options.subject } : {}),
			...(!options.subject && previousContext?.subject ? { subject: previousContext.subject } : {}),
			updatedAt: new Date().toISOString(),
		};

		try {
			await this.messageContextStore.setLatest(threadId, resourceId, context);
			return context;
		} catch (error) {
			this.logger.warn('[AgentChatBridge] Failed to update latest message context', {
				agentId: this.agentId,
				threadId,
				error: error instanceof Error ? error.message : String(error),
			});
			return undefined;
		}
	}

	async resolveSubject(message: Message<unknown>): Promise<IntegrationMessageSubject | undefined> {
		try {
			return toIntegrationMessageSubject(await message.subject);
		} catch (error) {
			this.logger.debug(
				`[AgentChatBridge] Failed to fetch message subject: ${
					error instanceof Error ? error.message : String(error)
				}`,
			);
			return undefined;
		}
	}

	private async getPreviousContext(
		threadId: string,
		integrationConnectionId: string,
	): Promise<IntegrationMessageContext | undefined> {
		if (!this.messageContextStore) return undefined;
		try {
			const previousContext = await this.messageContextStore.getLatest(threadId);
			if (previousContext?.integrationConnectionId !== integrationConnectionId) {
				return undefined;
			}
			return previousContext;
		} catch (error) {
			this.logger.warn('[AgentChatBridge] Failed to read previous message context', {
				agentId: this.agentId,
				threadId,
				error: error instanceof Error ? error.message : String(error),
			});
			return undefined;
		}
	}
}

function toIntegrationMessageSubject(
	subject: MessageSubject | null | undefined,
): IntegrationMessageSubject | undefined {
	if (!subject || typeof subject.type !== 'string' || typeof subject.id !== 'string') {
		return undefined;
	}

	const assignee = toIntegrationSubjectPerson(subject.assignee);
	const author = toIntegrationSubjectPerson(subject.author);
	const labels = subject.labels?.filter((label) => typeof label === 'string');

	return {
		type: subject.type,
		id: subject.id,
		...(typeof subject.title === 'string' ? { title: subject.title } : {}),
		...(typeof subject.description === 'string' ? { description: subject.description } : {}),
		...(typeof subject.url === 'string' ? { url: subject.url } : {}),
		...(typeof subject.status === 'string' ? { status: subject.status } : {}),
		...(labels && labels.length > 0 ? { labels } : {}),
		...(assignee ? { assignee } : {}),
		...(author ? { author } : {}),
	};
}

function toIntegrationSubjectPerson(
	person: MessageSubject['assignee'] | MessageSubject['author'],
): IntegrationMessageSubject['assignee'] | undefined {
	if (!person || typeof person.id !== 'string' || typeof person.name !== 'string') {
		return undefined;
	}
	return {
		id: person.id,
		name: person.name,
	};
}

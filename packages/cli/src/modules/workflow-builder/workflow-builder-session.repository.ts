import {
	mapChatMessagesToStoredMessages,
	mapStoredMessagesToChatMessages,
} from '@langchain/core/messages';
import {
	isLangchainMessagesArray,
	type ISessionStorage,
	type LangchainMessage,
	type StoredSession,
} from '@n8n/ai-workflow-builder';
import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { WorkflowBuilderSession } from './workflow-builder-session.entity';

@Service()
export class WorkflowBuilderSessionRepository
	extends Repository<WorkflowBuilderSession>
	implements ISessionStorage
{
	constructor(dataSource: DataSource) {
		super(WorkflowBuilderSession, dataSource.manager);
	}

	async getSession(threadId: string): Promise<StoredSession | null> {
		const { workflowId, userId } = this.parseThreadId(threadId);
		const entity = await this.findOne({ where: { workflowId, userId } });

		if (!entity) return null;

		const restoredMessages = mapStoredMessagesToChatMessages(entity.messages);
		const messages: LangchainMessage[] = isLangchainMessagesArray(restoredMessages)
			? restoredMessages
			: [];

		return {
			messages,
			previousSummary: entity.previousSummary ?? undefined,
			updatedAt: entity.updatedAt,
		};
	}

	async saveSession(threadId: string, data: StoredSession): Promise<void> {
		const { workflowId, userId } = this.parseThreadId(threadId);

		await this.upsert(
			{
				workflowId,
				userId,
				messages: mapChatMessagesToStoredMessages(data.messages),
				previousSummary: data.previousSummary ?? null,
			},
			['workflowId', 'userId'],
		);
	}

	async deleteSession(threadId: string): Promise<void> {
		const { workflowId, userId } = this.parseThreadId(threadId);
		await this.delete({ workflowId, userId });
	}

	private parseThreadId(threadId: string): { workflowId: string; userId: string } {
		// Format: "workflow-{workflowId}-user-{userId}"
		const match = threadId.match(/^workflow-(.+)-user-(.+)$/);
		if (!match) {
			throw new Error(`Invalid thread ID format: ${threadId}`);
		}
		return { workflowId: match[1], userId: match[2] };
	}
}

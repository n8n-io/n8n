import { stripHydratedFileData, type AgentDbMessage } from '@n8n/agents';
import { BaseRepository, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, In } from '@n8n/typeorm';
import type { QueryDeepPartialEntity } from '@n8n/typeorm/query-builder/QueryPartialEntity';

import { AgentMessageEntity } from '../entities/agent-message.entity';

@Service()
export class AgentMessageRepository extends BaseRepository<AgentMessageEntity> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(AgentMessageEntity, dataSource.manager, transactionRunner);
	}

	async saveMessages(
		args: { threadId: string; resourceId: string; messages: AgentDbMessage[] },
		ctx: OperationContext,
	): Promise<void> {
		const now = new Date();
		const entities = args.messages.map((message) => {
			const dbMsg = stripHydratedFileData(message);
			return {
				id: dbMsg.id,
				threadId: args.threadId,
				resourceId: args.resourceId,
				role: 'role' in dbMsg ? dbMsg.role : 'custom',
				type: 'type' in dbMsg ? dbMsg.type : null,
				content: dbMsg as unknown as Record<string, unknown>,
				createdAt: dbMsg.createdAt,
				updatedAt: now,
			} as QueryDeepPartialEntity<AgentMessageEntity>;
		});
		await this.managerFor(ctx).upsert(AgentMessageEntity, entities, ['id']);
	}

	async deleteMessages(ids: string[], ctx: OperationContext, threadId?: string): Promise<void> {
		await this.managerFor(ctx).delete(AgentMessageEntity, {
			id: In(ids),
			...(threadId !== undefined ? { threadId } : {}),
		});
	}

	async deleteMessagesByThread(
		threadId: string,
		resourceId: string | undefined,
		ctx: OperationContext,
	): Promise<void> {
		await this.managerFor(ctx).delete(AgentMessageEntity, {
			threadId,
			...(resourceId !== undefined ? { resourceId } : {}),
		});
	}

	/** Threads the resource has posted in, most recent activity first. */
	async findRecentThreadIdsByResourceId(
		agentId: string,
		resourceId: string,
		limit: number,
	): Promise<string[]> {
		// Thread IDs start with the agent ID because this table has no agent column.
		const rows = await this.createQueryBuilder('message')
			.select('message.threadId', 'threadId')
			.where('message.resourceId = :resourceId', { resourceId })
			.andWhere('message.threadId LIKE :threadPrefix', { threadPrefix: `${agentId}:%` })
			.groupBy('message.threadId')
			.orderBy('MAX(message.createdAt)', 'DESC')
			.limit(limit)
			.getRawMany<{ threadId: string }>();

		return rows.map(({ threadId }) => threadId);
	}
}

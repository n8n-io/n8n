import { stripHydratedFileData, type AgentDbMessage } from '@n8n/agents';
import { BaseRepository, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import type { QueryDeepPartialEntity } from '@n8n/typeorm/query-builder/QueryPartialEntity';

import { AgentMessageEntity } from '../entities/agent-message.entity';

@Service()
export class AgentMessageRepository extends BaseRepository<AgentMessageEntity> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(AgentMessageEntity, dataSource.manager, transactionRunner);
	}

	async saveMessages(
		threadId: string,
		resourceId: string,
		messages: AgentDbMessage[],
		ctx: OperationContext = {},
	): Promise<void> {
		if (messages.length === 0) return;
		const now = new Date();
		const entities = messages.map((message) => {
			const content = stripHydratedFileData(message);
			return {
				id: content.id,
				threadId,
				resourceId,
				role: 'role' in content ? content.role : 'custom',
				type: content.type ?? null,
				content,
				createdAt: content.createdAt,
				updatedAt: now,
			};
		});
		// Upsert retains message IDs and timestamps across normal turn persistence.
		await this.managerFor(ctx).upsert(
			AgentMessageEntity,
			entities as QueryDeepPartialEntity<AgentMessageEntity>[],
			['id'],
		);
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

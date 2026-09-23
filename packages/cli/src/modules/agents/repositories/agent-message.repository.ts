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

	/** Inserts the messages, or updates the ones whose id exists. */
	async upsertMessages(
		messages: Array<QueryDeepPartialEntity<AgentMessageEntity>>,
		ctx: OperationContext,
	): Promise<void> {
		await this.managerFor(ctx).upsert(AgentMessageEntity, messages, ['id']);
	}

	async deleteByIds(messageIds: string[], ctx: OperationContext): Promise<void> {
		await this.managerFor(ctx).delete(AgentMessageEntity, messageIds);
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

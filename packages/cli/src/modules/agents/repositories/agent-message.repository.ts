import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { AgentMessageEntity } from '../entities/agent-message.entity';

@Service()
export class AgentMessageRepository extends Repository<AgentMessageEntity> {
	constructor(dataSource: DataSource) {
		super(AgentMessageEntity, dataSource.manager);
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

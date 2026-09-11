import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { AgentMessageEntity } from '../entities/agent-message.entity';

@Service()
export class AgentMessageRepository extends Repository<AgentMessageEntity> {
	constructor(dataSource: DataSource) {
		super(AgentMessageEntity, dataSource.manager);
	}

	/** Threads the resource has posted in, most recent activity first. */
	async findRecentThreadIdsByResourceId(resourceId: string, limit: number): Promise<string[]> {
		const rows = await this.createQueryBuilder('message')
			.select('message.threadId', 'threadId')
			.where('message.resourceId = :resourceId', { resourceId })
			.groupBy('message.threadId')
			.orderBy('MAX(message.createdAt)', 'DESC')
			.limit(limit)
			.getRawMany<{ threadId: string }>();

		return rows.map(({ threadId }) => threadId);
	}
}

import { BaseRepository, TransactionRunner, type OperationContext, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { AgentPublishHistory } from '../entities/agent-publish-history.entity';
import { renderAuthor } from './agent-history.repository';

@Service()
export class AgentPublishHistoryRepository extends BaseRepository<AgentPublishHistory> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(AgentPublishHistory, dataSource.manager, transactionRunner);
	}

	async record(
		agentId: string,
		versionId: string | null,
		event: AgentPublishHistory['event'],
		user: User,
		ctx: OperationContext,
	): Promise<void> {
		await this.managerFor(ctx).insert(AgentPublishHistory, {
			agentId,
			versionId,
			event,
			userId: user.id,
			author: renderAuthor(user),
		});
	}

	async hasPublication(agentId: string, versionId?: string): Promise<boolean> {
		return await this.existsBy({
			agentId,
			event: 'activated',
			...(versionId ? { versionId } : {}),
		});
	}

	async list(agentId: string, take: number, skip: number): Promise<AgentPublishHistory[]> {
		return await this.createQueryBuilder('publication')
			.leftJoin('publication.version', 'version')
			.addSelect(['version.versionId', 'version.name', 'version.description'])
			.where('publication.agentId = :agentId', { agentId })
			.orderBy('publication.id', 'DESC')
			.take(take)
			.skip(skip)
			.getMany();
	}
}

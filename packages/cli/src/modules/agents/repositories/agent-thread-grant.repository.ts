import { BaseRepository, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { AgentThreadGrant } from '../entities/agent-thread-grant.entity';

@Service()
export class AgentThreadGrantRepository extends BaseRepository<AgentThreadGrant> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(AgentThreadGrant, dataSource.manager, transactionRunner);
	}

	async grant(threadId: string, grantKey: string): Promise<void> {
		await this.createQueryBuilder().insert().values({ threadId, grantKey }).orIgnore().execute();
	}

	async findKeys(threadId: string): Promise<Set<string>> {
		const grants = await this.find({ where: { threadId }, select: ['grantKey'] });
		return new Set(grants.map(({ grantKey }) => grantKey));
	}
}

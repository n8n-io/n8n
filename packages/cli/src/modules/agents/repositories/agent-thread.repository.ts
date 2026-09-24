import { BaseRepository, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { AgentThreadEntity } from '../entities/agent-thread.entity';

@Service()
export class AgentThreadRepository extends BaseRepository<AgentThreadEntity> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(AgentThreadEntity, dataSource.manager, transactionRunner);
	}

	async ensureExists(id: string, resourceId: string, ctx: OperationContext): Promise<void> {
		await this.managerFor(ctx)
			.createQueryBuilder()
			.insert()
			.into(AgentThreadEntity)
			.values({ id, resourceId, title: null, metadata: null })
			.orIgnore()
			.execute();
	}
}

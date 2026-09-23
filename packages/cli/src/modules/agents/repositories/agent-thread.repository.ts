import { BaseRepository, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { AgentThreadEntity } from '../entities/agent-thread.entity';

@Service()
export class AgentThreadRepository extends BaseRepository<AgentThreadEntity> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(AgentThreadEntity, dataSource.manager, transactionRunner);
	}

	async findByIdInContext(id: string, ctx: OperationContext): Promise<AgentThreadEntity | null> {
		return await this.managerFor(ctx).findOneBy(AgentThreadEntity, { id });
	}

	async saveInContext(
		thread: AgentThreadEntity,
		ctx: OperationContext,
	): Promise<AgentThreadEntity> {
		return await this.managerFor(ctx).save(AgentThreadEntity, thread);
	}
}

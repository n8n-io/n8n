import { BaseRepository, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { AgentThreadEntity } from '../entities/agent-thread.entity';

@Service()
export class AgentThreadRepository extends BaseRepository<AgentThreadEntity> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(AgentThreadEntity, dataSource.manager, transactionRunner);
	}

	/** The ids of the memory threads of one memory resource. */
	async findIdsByResourceId(resourceId: string): Promise<string[]> {
		const threads = await this.find({ select: { id: true }, where: { resourceId } });
		return threads.map(({ id }) => id);
	}
}

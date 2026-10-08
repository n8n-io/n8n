import { BaseRepository, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { AgentThreadEntity } from '../entities/agent-thread.entity';

@Service()
export class AgentThreadRepository extends BaseRepository<AgentThreadEntity> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(AgentThreadEntity, dataSource.manager, transactionRunner);
	}
}

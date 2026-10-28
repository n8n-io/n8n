import { BaseRepository, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, In } from '@n8n/typeorm';

import { AgentFileGrant } from '../entities/agent-file-grant.entity';

class AgentFileGrantTable extends BaseRepository<AgentFileGrant> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(AgentFileGrant, dataSource.manager, transactionRunner);
	}
}

@Service()
export class AgentFileGrantRepository {
	private readonly table: AgentFileGrantTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new AgentFileGrantTable(dataSource, transactionRunner);
	}

	/** Granting a file twice is a no-op. */
	async grant(
		attachmentIds: string[],
		threadId: string,
		ctx: OperationContext = {},
	): Promise<void> {
		if (attachmentIds.length === 0) return;
		await this.table
			.managerFor(ctx)
			.createQueryBuilder()
			.insert()
			.into(AgentFileGrant)
			.values(attachmentIds.map((attachmentId) => ({ attachmentId, threadId })))
			.orIgnore()
			.execute();
	}

	async isGranted(
		attachmentId: string,
		threadId: string,
		ctx: OperationContext = {},
	): Promise<boolean> {
		return await this.table.managerFor(ctx).existsBy(AgentFileGrant, { attachmentId, threadId });
	}

	/** The ids among `attachmentIds` that are granted to the thread. */
	async findGrantedIds(
		attachmentIds: string[],
		threadId: string,
		ctx: OperationContext = {},
	): Promise<Set<string>> {
		if (attachmentIds.length === 0) return new Set();
		const grants = await this.table.managerFor(ctx).findBy(AgentFileGrant, {
			attachmentId: In(attachmentIds),
			threadId,
		});
		return new Set(grants.map((grant) => grant.attachmentId));
	}
}

import { BaseRepository, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { isRecord } from '@n8n/utils/is-record';
import { jsonParse } from 'n8n-workflow';

import { AgentResourceEntity } from '../entities/agent-resource.entity';

class AgentMemoryScopeTable extends BaseRepository<AgentResourceEntity> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(AgentResourceEntity, dataSource.manager, transactionRunner);
	}
}

/** Serialize memory writes and scope retirement without removing session history. */
@Service()
export class AgentMemoryScopeRepository {
	private readonly table: AgentMemoryScopeTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new AgentMemoryScopeTable(dataSource, transactionRunner);
	}

	/** The caller must hold a transaction until its memory writes finish. */
	async lockActiveScope(resourceId: string, ctx: OperationContext): Promise<boolean> {
		const metadata = await this.lockScope(resourceId, ctx);
		return metadata.memoryRetired !== true;
	}

	async retireScope(resourceId: string, ctx: OperationContext): Promise<void> {
		const metadata = await this.lockScope(resourceId, ctx);
		await this.table
			.managerFor(ctx)
			.update(
				AgentResourceEntity,
				{ id: resourceId },
				{ metadata: JSON.stringify({ ...metadata, memoryRetired: true }) },
			);
	}

	private async lockScope(
		resourceId: string,
		ctx: OperationContext,
	): Promise<Record<string, unknown>> {
		const manager = this.table.managerFor(ctx);
		await manager
			.createQueryBuilder()
			.insert()
			.into(AgentResourceEntity)
			.values({ id: resourceId, metadata: null })
			.orIgnore()
			.execute();
		// A write locks the row on both SQLite and PostgreSQL before metadata is read.
		await manager.update(AgentResourceEntity, { id: resourceId }, { updatedAt: new Date() });
		const row = await manager.findOneByOrFail(AgentResourceEntity, { id: resourceId });
		const metadata = jsonParse<unknown>(row.metadata ?? '{}', { fallbackValue: {} });
		return isRecord(metadata) ? metadata : {};
	}
}

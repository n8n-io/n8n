import { BaseRepository, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, IsNull } from '@n8n/typeorm';

import { McpServer } from './mcp-server.entity';

class McpServerTable extends BaseRepository<McpServer> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(McpServer, dataSource.manager, transactionRunner);
	}
}

@Service()
export class McpServerRepository {
	private readonly table: McpServerTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new McpServerTable(dataSource, transactionRunner);
	}

	/** A deleted server is gone for the builder, so this returns `null` for it. */
	async findLiveInProject(
		projectId: string,
		serverId: string,
		ctx: OperationContext = {},
	): Promise<McpServer | null> {
		return await this.table
			.managerFor(ctx)
			.findOneBy(McpServer, { id: serverId, projectId, deletedAt: IsNull() });
	}
}

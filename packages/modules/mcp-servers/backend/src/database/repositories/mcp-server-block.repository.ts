import {
	BaseRepository,
	isUniqueConstraintError,
	TransactionRunner,
	type OperationContext,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { McpServerBlock } from '../database/entities/mcp-server-block.entity';

class McpServerBlockTable extends BaseRepository<McpServerBlock> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(McpServerBlock, dataSource.manager, transactionRunner);
	}
}

export type NewMcpServerBlock = Pick<McpServerBlock, 'serverId' | 'userId' | 'blockedById'>;

@Service()
export class McpServerBlockRepository {
	private readonly table: McpServerBlockTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new McpServerBlockTable(dataSource, transactionRunner);
	}

	async isBlocked(serverId: string, userId: string, ctx: OperationContext = {}): Promise<boolean> {
		return await this.table.managerFor(ctx).existsBy(McpServerBlock, { serverId, userId });
	}

	async findForPerson(
		serverId: string,
		userId: string,
		ctx: OperationContext = {},
	): Promise<McpServerBlock | null> {
		return await this.table.managerFor(ctx).findOneBy(McpServerBlock, { serverId, userId });
	}

	/** Returns `false` when the person is already blocked. The first block stays as it is. */
	async insertIfAbsent(row: NewMcpServerBlock, ctx: OperationContext = {}): Promise<boolean> {
		try {
			await this.table.managerFor(ctx).insert(McpServerBlock, { ...row, blockedAt: new Date() });
			return true;
		} catch (error) {
			if (isUniqueConstraintError(error)) return false;
			throw error;
		}
	}

	/** Returns `false` when the person was not blocked. */
	async deleteForPerson(
		serverId: string,
		userId: string,
		ctx: OperationContext = {},
	): Promise<boolean> {
		const result = await this.table.managerFor(ctx).delete(McpServerBlock, { serverId, userId });
		return (result.affected ?? 0) > 0;
	}

	/** The newest block first. */
	async listByServer(serverId: string, ctx: OperationContext = {}): Promise<McpServerBlock[]> {
		return await this.table.managerFor(ctx).find(McpServerBlock, {
			where: { serverId },
			order: { blockedAt: 'DESC', userId: 'ASC' },
		});
	}
}

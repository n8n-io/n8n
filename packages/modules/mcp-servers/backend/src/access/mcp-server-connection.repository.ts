import {
	BaseRepository,
	isUniqueConstraintError,
	TransactionRunner,
	type OperationContext,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, LessThan } from '@n8n/typeorm';

import { McpServerBlock } from '../database/entities/mcp-server-block.entity';
import { McpServerConnection } from '../database/entities/mcp-server-connection.entity';

class McpServerConnectionTable extends BaseRepository<McpServerConnection> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(McpServerConnection, dataSource.manager, transactionRunner);
	}
}

/** One AI client of one person on one server. */
export type McpServerConnectionKey = Pick<
	McpServerConnection,
	'serverId' | 'userId' | 'oauthClientId'
>;

@Service()
export class McpServerConnectionRepository {
	private readonly table: McpServerConnectionTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new McpServerConnectionTable(dataSource, transactionRunner);
	}

	async findForClient(
		key: McpServerConnectionKey,
		ctx: OperationContext = {},
	): Promise<McpServerConnection | null> {
		return await this.table.managerFor(ctx).findOneBy(McpServerConnection, key);
	}

	/**
	 * Writes the row of a first use. Returns `false` when the row already exists, for example
	 * because another main instance wrote it a moment earlier.
	 */
	async insertFirstUse(
		key: McpServerConnectionKey,
		clientName: string,
		usedAt: Date,
		ctx: OperationContext = {},
	): Promise<boolean> {
		try {
			await this.table.managerFor(ctx).insert(McpServerConnection, {
				...key,
				clientName,
				firstUsedAt: usedAt,
				lastUsedAt: usedAt,
			});
			return true;
		} catch (error) {
			if (isUniqueConstraintError(error)) return false;
			throw error;
		}
	}

	/** Sets the last use, only when the stored one is older than `olderThan`. */
	async updateLastUse(
		key: McpServerConnectionKey,
		usedAt: Date,
		olderThan: Date,
		ctx: OperationContext = {},
	): Promise<void> {
		await this.table
			.managerFor(ctx)
			.update(
				McpServerConnection,
				{ ...key, lastUsedAt: LessThan(olderThan) },
				{ lastUsedAt: usedAt },
			);
	}

	/** The last use first. */
	async listByServer(serverId: string, ctx: OperationContext = {}): Promise<McpServerConnection[]> {
		return await this.table.managerFor(ctx).find(McpServerConnection, {
			where: { serverId },
			order: { lastUsedAt: 'DESC', userId: 'ASC', oauthClientId: 'ASC' },
		});
	}

	/** Count of active (non-blocked) connections for each server. */
	async countActiveByServers(
		serverIds: string[],
		ctx: OperationContext = {},
	): Promise<Map<string, number>> {
		if (serverIds.length === 0) return new Map();
		const rows = await this.table
			.managerFor(ctx)
			.createQueryBuilder(McpServerConnection, 'connection')
			.leftJoin(
				McpServerBlock,
				'block',
				'block.serverId = connection.serverId AND block.userId = connection.userId',
			)
			.select('connection.serverId', 'serverId')
			.addSelect('COUNT(*)', 'count')
			.where('connection.serverId IN (:...serverIds)', { serverIds })
			.andWhere('block.userId IS NULL')
			.groupBy('connection.serverId')
			.getRawMany<{ serverId: string; count: string | number }>();
		return new Map(rows.map((row) => [row.serverId, Number(row.count)]));
	}

	/** Deletes every client of the person on the server. */
	async deleteForPerson(
		serverId: string,
		userId: string,
		ctx: OperationContext = {},
	): Promise<number> {
		const result = await this.table
			.managerFor(ctx)
			.delete(McpServerConnection, { serverId, userId });
		return result.affected ?? 0;
	}
}

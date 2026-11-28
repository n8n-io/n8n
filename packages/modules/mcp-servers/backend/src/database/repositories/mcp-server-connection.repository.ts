import {
	BaseRepository,
	isUniqueConstraintError,
	TransactionRunner,
	type OperationContext,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, LessThan } from '@n8n/typeorm';

import { McpServerConnection } from '../entities/mcp-server-connection.entity';

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

export type McpServerConnectionFixtureRow = McpServerConnectionKey &
	Pick<McpServerConnection, 'clientName'> &
	Partial<Pick<McpServerConnection, 'firstUsedAt' | 'lastUsedAt'>>;

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

	/** Inserts a connection row with only the given columns, so database defaults apply. For test fixtures. */
	async insertFixture(row: McpServerConnectionFixtureRow): Promise<McpServerConnection> {
		await this.table.manager.insert(McpServerConnection, row);
		return await this.table.manager.findOneByOrFail(McpServerConnection, {
			serverId: row.serverId,
			userId: row.userId,
			oauthClientId: row.oauthClientId,
		});
	}

	/** Lists every connection row across all servers. For test fixtures. */
	async findAll(): Promise<McpServerConnection[]> {
		return await this.table.manager.find(McpServerConnection);
	}

	/** Sets the last-used timestamp directly. For test fixtures. */
	async setLastUsedAt(key: McpServerConnectionKey, lastUsedAt: Date): Promise<void> {
		await this.table.manager.update(McpServerConnection, key, { lastUsedAt });
	}

	/** Deletes every connection row. For test fixtures. */
	async deleteAll(): Promise<void> {
		await this.table.manager.delete(McpServerConnection, {});
	}
}

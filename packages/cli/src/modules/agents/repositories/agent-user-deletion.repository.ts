import { BaseRepository, User, Settings, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { UserError } from 'n8n-workflow';

class UserDeletionTable extends BaseRepository<User> {
	constructor(dataSource: DataSource, transactions: TransactionRunner) {
		super(User, dataSource.manager, transactions);
	}
}

/** Fence private chat creation and admission before account cleanup starts. */
@Service()
export class AgentUserDeletionRepository {
	private readonly table: UserDeletionTable;

	constructor(
		dataSource: DataSource,
		private readonly transactions: TransactionRunner,
	) {
		this.table = new UserDeletionTable(dataSource, transactions);
	}

	private markerKey(userId: string): string {
		return `agents.userDeletion.${userId}`;
	}

	async completeDeletion(userId: string): Promise<void> {
		await this.table.manager.delete(Settings, { key: this.markerKey(userId) });
	}

	async beginDeletion(userId: string): Promise<void> {
		await this.transactions.run({}, async (ctx) => {
			const manager = this.table.managerFor(ctx);
			// SQLite write transactions serialize this operation. PostgreSQL needs a row lock.
			const user = await manager.findOne(User, {
				where: { id: userId },
				loadEagerRelations: false,
				lock:
					manager.connection.options.type === 'postgres'
						? { mode: 'pessimistic_write' }
						: undefined,
			});
			if (!user) throw new UserError('User not found');
			await manager.upsert(
				Settings,
				{ key: this.markerKey(userId), value: 'true', loadOnStartup: false },
				['key'],
			);
		});
	}

	async assertActiveUser(userId: string, ctx: OperationContext): Promise<void> {
		await this.withActiveUser(userId, async () => {}, ctx);
	}

	/** Keep the read lock until the write finishes. Deletion waits for these operations. */
	async withActiveUser<T>(
		userId: string,
		write: (ctx: OperationContext) => Promise<T>,
		ctx: OperationContext = {},
	): Promise<T> {
		return await this.transactions.run(ctx, async (ctx) => {
			const manager = this.table.managerFor(ctx);
			const user = await manager.findOne(User, {
				where: { id: userId },
				loadEagerRelations: false,
				lock:
					manager.connection.options.type === 'postgres' ? { mode: 'pessimistic_read' } : undefined,
			});
			if (!user) throw new UserError('Session not found');
			if (await manager.existsBy(Settings, { key: this.markerKey(userId) }))
				throw new UserError('This user is being deleted. Agent chats are unavailable.');
			return await write(ctx);
		});
	}
}

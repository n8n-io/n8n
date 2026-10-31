import { BaseRepository, TransactionRunner, User, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, type EntityManager, In, MoreThan } from '@n8n/typeorm';

import { AccessToken } from '../entities/oauth-access-token.entity';
import { AuthorizationCode } from '../entities/oauth-authorization-code.entity';
import { RefreshToken } from '../entities/oauth-refresh-token.entity';
import { UserConsent } from '../entities/oauth-user-consent.entity';

@Service()
export class OAuthGrantRepository extends BaseRepository<User> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(User, dataSource.manager, transactionRunner);
	}

	async deleteGrantsForDisabledUsers(): Promise<void> {
		const batchSize = 100;
		let afterId: string | undefined;
		while (true) {
			const ids = await this.runInTransaction({}, async (manager) => {
				// Keep locks within one batch and serialize reactivation with cleanup of all four tables.
				const users = await manager.find(User, {
					where: { disabled: true, ...(afterId ? { id: MoreThan(afterId) } : {}) },
					select: ['id'],
					order: { id: 'ASC' },
					take: batchSize,
					// Name the table: Postgres cannot lock the outer join to `ServiceAccount.details`.
					...(manager.connection.options.type === 'postgres'
						? { lock: { mode: 'pessimistic_write' as const, tables: ['user'] } }
						: {}),
				});
				const userIds = users.map(({ id }) => id);
				if (userIds.length > 0) {
					for (const entity of [AccessToken, RefreshToken, AuthorizationCode, UserConsent]) {
						await manager.delete(entity, { userId: In(userIds) });
					}
				}
				return userIds;
			});
			if (ids.length < batchSize) return;
			afterId = ids.at(-1);
		}
	}

	async lockUserForGrant(userId: string, ctx: OperationContext): Promise<User | null> {
		return await this.findLockedUser(this.managerFor(ctx), userId);
	}

	private async findLockedUser(manager: EntityManager, userId: string): Promise<User | null> {
		// Updates to this row serialize with grant issuance on PostgreSQL.
		// SQLite serializes writes and rejects a conflicting read-to-write upgrade.
		// Name the table: Postgres cannot lock the outer join to `ServiceAccount.details`.
		return await manager.findOne(User, {
			where: { id: userId },
			...(manager.connection.options.type === 'postgres'
				? { lock: { mode: 'pessimistic_write' as const, tables: ['user'] } }
				: {}),
		});
	}

	async deleteUserGrants(userId: string, ctx: OperationContext): Promise<void> {
		const manager = this.managerFor(ctx);
		await manager.delete(AccessToken, { userId });
		await manager.delete(RefreshToken, { userId });
		await manager.delete(AuthorizationCode, { userId });
		await manager.delete(UserConsent, { userId });
	}
}

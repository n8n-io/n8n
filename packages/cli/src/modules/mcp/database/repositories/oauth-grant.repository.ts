import { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, type EntityManager, In, MoreThan, Repository } from '@n8n/typeorm';

import { UserLifecycleTransactionService } from '@/services/user-lifecycle-transaction.service';

import { AccessToken } from '../entities/oauth-access-token.entity';
import { AuthorizationCode } from '../entities/oauth-authorization-code.entity';
import { RefreshToken } from '../entities/oauth-refresh-token.entity';
import { UserConsent } from '../entities/oauth-user-consent.entity';
import {
	createGrantContext,
	managerForGrant,
	type OAuthGrantContext,
} from '../oauth-grant-context';

@Service()
export class OAuthGrantRepository extends Repository<User> {
	constructor(
		dataSource: DataSource,
		private readonly transactions: UserLifecycleTransactionService,
	) {
		super(User, dataSource.manager);
	}

	async runInTransaction<T>(
		work: (ctx: OAuthGrantContext) => Promise<T>,
		ctx?: OAuthGrantContext,
	): Promise<T> {
		return await this.transactions.run(
			async (manager) => await work(ctx ?? createGrantContext(manager)),
			ctx ? managerForGrant(ctx, this.manager) : undefined,
		);
	}

	async deleteGrantsForDisabledUsers(): Promise<void> {
		const batchSize = 100;
		let afterId: string | undefined;
		while (true) {
			const ids = await this.transactions.run(async (manager) => {
				// Keep locks within one batch and serialize reactivation with cleanup of all four tables.
				const users = await manager.find(User, {
					where: { disabled: true, ...(afterId ? { id: MoreThan(afterId) } : {}) },
					select: ['id'],
					order: { id: 'ASC' },
					take: batchSize,
					...(['postgres', 'mysql', 'mariadb'].includes(manager.connection.options.type)
						? { lock: { mode: 'pessimistic_write' as const } }
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

	async lockUserForGrant(userId: string, ctx: OAuthGrantContext): Promise<User | null> {
		const manager = managerForGrant(ctx, this.manager);
		// Updates to this row serialize with grant issuance on server databases.
		// Pooled SQLite serializes writers; legacy SQLite is queued by the lifecycle service.
		return await manager.findOne(User, {
			where: { id: userId },
			...(['postgres', 'mysql', 'mariadb'].includes(manager.connection.options.type)
				? { lock: { mode: 'pessimistic_write' as const } }
				: {}),
		});
	}

	async deleteUserGrants(userId: string, manager: EntityManager): Promise<void> {
		await manager.delete(AccessToken, { userId });
		await manager.delete(RefreshToken, { userId });
		await manager.delete(AuthorizationCode, { userId });
		await manager.delete(UserConsent, { userId });
	}
}

import { BaseRepository, type OperationContext, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, type EntityManager, LessThan } from '@n8n/typeorm';

import { OAuthClient } from '../entities/oauth-client.entity';
import { UserConsent } from '../entities/oauth-user-consent.entity';

type ClientRegistration = Pick<
	OAuthClient,
	| 'id'
	| 'redirectUris'
	| 'tokenEndpointAuthMethod'
	| 'clientSecret'
	| 'clientSecretExpiresAt'
	| 'isFirstParty'
> &
	Partial<Pick<OAuthClient, 'name' | 'grantTypes'>>;

/** Subquery for the ids of clients that at least one user has consented to. */
function consentedClientIds(manager: EntityManager): string {
	return manager
		.createQueryBuilder()
		.subQuery()
		.select('consent.clientId')
		.from(UserConsent, 'consent')
		.getQuery();
}

class OAuthClientTable extends BaseRepository<OAuthClient> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(OAuthClient, dataSource.manager, transactionRunner);
	}
}

@Service()
export class OAuthClientRepository {
	private readonly table: OAuthClientTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new OAuthClientTable(dataSource, transactionRunner);
	}

	async findById(id: string, ctx: OperationContext): Promise<OAuthClient | null> {
		return await this.table.managerFor(ctx).findOneBy(OAuthClient, { id });
	}

	async registerClient(client: ClientRegistration, ctx: OperationContext): Promise<void> {
		await this.table.managerFor(ctx).insert(OAuthClient, client);
	}

	async countRegistered(ctx: OperationContext): Promise<number> {
		return await this.table.managerFor(ctx).countBy(OAuthClient, { isFirstParty: false });
	}

	/**
	 * Counts the registered clients that hold a slot under the client limit:
	 * those with a consent, and those created at or after `cutoff` that can
	 * still receive one.
	 */
	async countRegisteredInUse(cutoff: Date, ctx: OperationContext): Promise<number> {
		const manager = this.table.managerFor(ctx);
		return await manager
			.createQueryBuilder(OAuthClient, 'client')
			.where('client.isFirstParty = :isFirstParty', { isFirstParty: false })
			.andWhere(`(client.createdAt >= :cutoff OR client.id IN ${consentedClientIds(manager)})`, {
				cutoff,
			})
			.getCount();
	}

	/**
	 * Deletes the registered clients that nobody can use: those without a
	 * consent, created before `cutoff`. Returns the number of deleted clients.
	 */
	async deleteUnconsentedCreatedBefore(cutoff: Date, ctx: OperationContext): Promise<number> {
		const manager = this.table.managerFor(ctx);
		// Use one statement so a consent that commits first keeps its client.
		const result = await manager
			.createQueryBuilder()
			.delete()
			.from(OAuthClient)
			.where({ isFirstParty: false, createdAt: LessThan(cutoff) })
			.andWhere(`id NOT IN ${consentedClientIds(manager)}`)
			.execute();
		return result.affected ?? 0;
	}

	async removeRegistration(id: string, ctx: OperationContext): Promise<void> {
		await this.table.managerFor(ctx).delete(OAuthClient, { id });
	}

	async upsertVirtualClient(client: ClientRegistration, ctx: OperationContext): Promise<void> {
		await this.table.managerFor(ctx).upsert(OAuthClient, client, ['id']);
	}

	async findRegisteredNames(
		ctx: OperationContext,
	): Promise<Array<Pick<OAuthClient, 'id' | 'name'>>> {
		return await this.table.managerFor(ctx).find(OAuthClient, {
			select: { id: true, name: true },
			where: { isFirstParty: false },
		});
	}

	async deleteIfUnused(clientId: string, ctx: OperationContext): Promise<boolean> {
		const manager = this.table.managerFor(ctx);
		const consentsTable = manager.connection.getMetadata(UserConsent).tableName;
		// Use one statement so a concurrent consent keeps the client or fails on its foreign key.
		// A separate check could cascade-delete that consent.
		const result = await manager
			.createQueryBuilder()
			.delete()
			.from(OAuthClient)
			.where(
				`id = :clientId AND NOT EXISTS (SELECT 1 FROM ${consentsTable} WHERE "clientId" = :clientId)`,
				{ clientId },
			)
			.execute();
		return (result.affected ?? 0) > 0;
	}
}

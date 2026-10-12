import { DatabaseConfig } from '@n8n/config';
import {
	BaseRepository,
	dbNowLiteral,
	dbNowPlusMsLiteral,
	OperationContext,
	TransactionRunner,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { TrustedSourceEntity } from '../entities/trusted-source.entity';

class TrustedSourceTable extends BaseRepository<TrustedSourceEntity> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(TrustedSourceEntity, dataSource.manager, transactionRunner);
	}

	override managerFor(ctx: OperationContext) {
		return super.managerFor(ctx);
	}
}

export type NewTrustedSourceRow = Pick<
	TrustedSourceEntity,
	| 'name'
	| 'type'
	| 'issuer'
	| 'managedBy'
	| 'status'
	| 'lastError'
	| 'lastCheckedAt'
	| 'configVersion'
	| 'config'
	| 'metadata'
>;

export type TrustedSourceRowChanges = Partial<
	Pick<
		TrustedSourceEntity,
		| 'name'
		| 'issuer'
		| 'configVersion'
		| 'config'
		| 'metadata'
		| 'status'
		| 'lastError'
		| 'lastCheckedAt'
		| 'discoveryClaimToken'
		| 'discoveryClaimedAt'
	>
>;

/** What a discovery run writes; `lastCheckedAt` and the lease columns are set by the query. */
export type DiscoveryRowChanges = Pick<
	TrustedSourceRowChanges,
	'metadata' | 'status' | 'lastError'
>;

export type DueQuery = {
	errorRetrySeconds: number;
	healthyRefreshSeconds: number;
	limit: number;
};

@Service()
export class TrustedSourceRepository {
	private readonly table: TrustedSourceTable;

	// The lease and `lastCheckedAt` use the database clock, so instances with skewed clocks agree.
	private readonly isPostgres: boolean;

	constructor(
		dataSource: DataSource,
		transactionRunner: TransactionRunner,
		config: DatabaseConfig,
	) {
		this.table = new TrustedSourceTable(dataSource, transactionRunner);
		this.isPostgres = config.type === 'postgresdb';
	}

	async findById(id: string, ctx: OperationContext = {}) {
		return await this.table.managerFor(ctx).findOneBy(TrustedSourceEntity, { id });
	}

	async findByIssuer(issuer: string, ctx: OperationContext = {}) {
		return await this.table.managerFor(ctx).findOneBy(TrustedSourceEntity, { issuer });
	}

	async findAll(ctx: OperationContext = {}) {
		return await this.table.managerFor(ctx).find(TrustedSourceEntity, { order: { name: 'ASC' } });
	}

	/**
	 * Sources whose last check is missing or older than the interval for their status. Unchecked
	 * sources come first, then those never checked, then the oldest check. The lease is not
	 * consulted here: the claim decides who refreshes a due source.
	 */
	async findDue(
		{ errorRetrySeconds, healthyRefreshSeconds, limit }: DueQuery,
		ctx: OperationContext = {},
	): Promise<TrustedSourceEntity[]> {
		const errorCutoff = dbNowPlusMsLiteral(this.isPostgres, -errorRetrySeconds * 1000);
		const healthyCutoff = dbNowPlusMsLiteral(this.isPostgres, -healthyRefreshSeconds * 1000);
		return await this.table
			.managerFor(ctx)
			.createQueryBuilder(TrustedSourceEntity, 'source')
			.where(
				`source.status = :unchecked OR source.lastCheckedAt IS NULL
					OR (source.status = :error AND source.lastCheckedAt < ${errorCutoff})
					OR (source.status = :healthy AND source.lastCheckedAt < ${healthyCutoff})`,
				{ unchecked: 'unchecked', error: 'error', healthy: 'healthy' },
			)
			.orderBy("CASE WHEN source.status = 'unchecked' THEN 0 ELSE 1 END", 'ASC')
			.addOrderBy('CASE WHEN source.lastCheckedAt IS NULL THEN 0 ELSE 1 END', 'ASC')
			.addOrderBy('source.lastCheckedAt', 'ASC')
			.take(limit)
			.getMany();
	}

	/** `save`, not `insert`: the `@BeforeInsert` id generator only runs on an entity instance. */
	async insertRow(row: NewTrustedSourceRow, ctx: OperationContext = {}) {
		return await this.table.managerFor(ctx).save(TrustedSourceEntity, this.table.create(row));
	}

	async updateById(id: string, changes: TrustedSourceRowChanges, ctx: OperationContext = {}) {
		await this.table.managerFor(ctx).update(TrustedSourceEntity, { id }, changes);
	}

	async deleteById(id: string, ctx: OperationContext = {}) {
		await this.table.managerFor(ctx).delete(TrustedSourceEntity, { id });
	}

	/** Takes the discovery lease for `token` when it is free or older than `leaseSeconds`. */
	async claimForDiscovery(
		id: string,
		token: string,
		leaseSeconds: number,
		ctx: OperationContext = {},
	): Promise<boolean> {
		const staleBefore = dbNowPlusMsLiteral(this.isPostgres, -leaseSeconds * 1000);
		const result = await this.table
			.managerFor(ctx)
			.createQueryBuilder()
			.update(TrustedSourceEntity)
			.set({
				discoveryClaimToken: token,
				discoveryClaimedAt: () => dbNowLiteral(this.isPostgres),
			})
			.where(
				`id = :id AND ("discoveryClaimedAt" IS NULL OR "discoveryClaimedAt" < ${staleBefore})`,
				{ id },
			)
			.execute();
		return result.affected === 1;
	}

	/** Writes the result and releases the lease, only while `token` still holds it. */
	async recordDiscovery(
		id: string,
		token: string,
		changes: DiscoveryRowChanges,
		ctx: OperationContext = {},
	): Promise<boolean> {
		const result = await this.table
			.managerFor(ctx)
			.createQueryBuilder()
			.update(TrustedSourceEntity)
			.set({
				...changes,
				lastCheckedAt: () => dbNowLiteral(this.isPostgres),
				discoveryClaimToken: null,
				discoveryClaimedAt: null,
			})
			.where('id = :id AND "discoveryClaimToken" = :token', { id, token })
			.execute();
		return result.affected === 1;
	}
}

import { BaseRepository, OperationContext, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, IsNull, LessThan, Or } from '@n8n/typeorm';

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
		| 'discoveryClaimedAt'
	>
>;

@Service()
export class TrustedSourceRepository {
	private readonly table: TrustedSourceTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new TrustedSourceTable(dataSource, transactionRunner);
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

	/** Takes the discovery lease when it is free or older than `staleBefore`. */
	async claimForDiscovery(
		id: string,
		now: Date,
		staleBefore: Date,
		ctx: OperationContext = {},
	): Promise<boolean> {
		// One where object: `update` reads an array criteria as a list of ids, not as OR branches.
		const result = await this.table
			.managerFor(ctx)
			.update(
				TrustedSourceEntity,
				{ id, discoveryClaimedAt: Or(IsNull(), LessThan(staleBefore)) },
				{ discoveryClaimedAt: now },
			);
		return result.affected === 1;
	}

	/** Writes the result and releases the lease, only while the lease is still the caller's. */
	async recordDiscovery(
		id: string,
		claimedAt: Date,
		changes: TrustedSourceRowChanges,
		ctx: OperationContext = {},
	): Promise<boolean> {
		const result = await this.table
			.managerFor(ctx)
			.update(
				TrustedSourceEntity,
				{ id, discoveryClaimedAt: claimedAt },
				{ ...changes, discoveryClaimedAt: null },
			);
		return result.affected === 1;
	}
}

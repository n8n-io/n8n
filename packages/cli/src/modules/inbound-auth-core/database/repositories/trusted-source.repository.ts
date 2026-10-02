import { BaseRepository, OperationContext, TransactionRunner } from '@n8n/db';
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
>;

export type TrustedSourceRowChanges = Partial<
	Pick<TrustedSourceEntity, 'name' | 'issuer' | 'configVersion' | 'config'>
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
}

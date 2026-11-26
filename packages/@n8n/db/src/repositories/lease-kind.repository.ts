import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { LeaseKind } from '../entities';
import { BaseRepository } from './base-repository';
import { type OperationContext, TransactionRunner } from '../services/transaction';

class LeaseKindTable extends BaseRepository<LeaseKind> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(LeaseKind, dataSource.manager, transactionRunner);
	}
}

@Service()
export class LeaseKindRepository {
	private readonly table: LeaseKindTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new LeaseKindTable(dataSource, transactionRunner);
	}

	/** Inserts the kind row with its default settings, or does nothing when it exists. */
	async insertIfMissing(kind: string, ctx: OperationContext): Promise<void> {
		await this.table
			.managerFor(ctx)
			.createQueryBuilder()
			.insert()
			.into(LeaseKind)
			.values({ kind })
			.orIgnore()
			.execute();
	}
}

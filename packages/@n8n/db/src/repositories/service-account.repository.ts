import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { BaseRepository } from './base-repository';
import { ServiceAccount } from '../entities';
import { type OperationContext, TransactionRunner } from '../services/transaction';

class ServiceAccountTable extends BaseRepository<ServiceAccount> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(ServiceAccount, dataSource.manager, transactionRunner);
	}

	override managerFor(ctx: OperationContext) {
		return super.managerFor(ctx);
	}
}

/** Loads service accounts only. Each query filters on `kind = 'service'`. */
@Service()
export class ServiceAccountRepository {
	private readonly table: ServiceAccountTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new ServiceAccountTable(dataSource, transactionRunner);
	}

	async findById(id: string, ctx: OperationContext = {}): Promise<ServiceAccount | null> {
		return await this.table.managerFor(ctx).findOneBy(ServiceAccount, { id });
	}
}

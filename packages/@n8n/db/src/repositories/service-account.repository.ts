import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { UnexpectedError } from 'n8n-workflow';

import { BaseRepository } from './base-repository';
import { type Role, ServiceAccount, ServiceAccountDetails } from '../entities';
import { type OperationContext, TransactionRunner } from '../services/transaction';

class ServiceAccountTable extends BaseRepository<ServiceAccount> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(ServiceAccount, dataSource.manager, transactionRunner);
	}

	override managerFor(ctx: OperationContext) {
		return super.managerFor(ctx);
	}
}

export type NewServiceAccount = {
	name: string;
	role: Role;
};

/**
 * Loads service accounts only. Each query filters on `kind = 'service'`. The
 * service account comes back with its `details`.
 */
@Service()
export class ServiceAccountRepository {
	private readonly table: ServiceAccountTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new ServiceAccountTable(dataSource, transactionRunner);
	}

	async findById(id: string, ctx: OperationContext = {}): Promise<ServiceAccount | null> {
		return await this.table.managerFor(ctx).findOne(ServiceAccount, {
			where: { id },
			relations: { details: true },
		});
	}

	/**
	 * Creates the `user` row and the details row in one transaction. If one
	 * insert fails, neither row is saved. The name must not be blank.
	 */
	async create({ name, role }: NewServiceAccount, ctx: OperationContext = {}) {
		if (name.trim() === '') {
			throw new UnexpectedError('A service account needs a name');
		}

		return await this.table.runInTransaction(ctx, async (tx) => {
			const serviceAccount = await tx.save(tx.create(ServiceAccount, { role }));
			serviceAccount.details = await tx.save(
				tx.create(ServiceAccountDetails, { userId: serviceAccount.id, name }),
			);
			return serviceAccount;
		});
	}
}

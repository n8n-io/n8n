import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { BaseRepository } from './base-repository';
import { Person } from '../entities';
import { type OperationContext, TransactionRunner } from '../services/transaction';

class PersonTable extends BaseRepository<Person> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(Person, dataSource.manager, transactionRunner);
	}

	override managerFor(ctx: OperationContext) {
		return super.managerFor(ctx);
	}
}

/** Loads the accounts of people only. Each query filters on `kind = 'person'`. */
@Service()
export class PersonRepository {
	private readonly table: PersonTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new PersonTable(dataSource, transactionRunner);
	}

	async findById(id: string, ctx: OperationContext = {}): Promise<Person | null> {
		return await this.table.managerFor(ctx).findOneBy(Person, { id });
	}
}

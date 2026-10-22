import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { BaseRepository } from './base-repository';
import { Person } from '../entities';
import { TransactionRunner } from '../services/transaction';

/** Loads and saves the accounts of people only. Each query filters on `kind = 'person'`. */
@Service()
export class PersonRepository extends BaseRepository<Person> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(Person, dataSource.manager, transactionRunner);
	}
}

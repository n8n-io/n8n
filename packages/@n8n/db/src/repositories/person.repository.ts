import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { BaseRepository } from './base-repository';
import { Person } from '../entities';
import { TransactionRunner } from '../services/transaction';

/**
 * Loads, updates and deletes the accounts of people only: each filters on `kind = 'person'`.
 * `save` writes the kind of the instance's class, so it does not filter.
 */
@Service()
export class PersonRepository extends BaseRepository<Person> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(Person, dataSource.manager, transactionRunner);
	}
}

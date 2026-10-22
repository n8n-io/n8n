import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { BaseRepository } from './base-repository';
import { ServiceAccount } from '../entities';
import { TransactionRunner } from '../services/transaction';

/**
 * Loads, updates and deletes service accounts only: each filters on `kind = 'service'`.
 * `save` writes the kind of the instance's class, so it does not filter.
 */
@Service()
export class ServiceAccountRepository extends BaseRepository<ServiceAccount> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(ServiceAccount, dataSource.manager, transactionRunner);
	}
}

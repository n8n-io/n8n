import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { BaseRepository } from './base-repository';
import { ServiceAccount } from '../entities';
import { TransactionRunner } from '../services/transaction';

/**
 * Writes go through this repository, not through `ActorRepository`. TypeORM
 * takes the `type` value from the repository's entity, so an insert through
 * the base entity would not mark the row as a service account.
 */
@Service()
export class ServiceAccountRepository extends BaseRepository<ServiceAccount> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(ServiceAccount, dataSource.manager, transactionRunner);
	}
}

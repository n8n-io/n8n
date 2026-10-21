import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { BaseRepository } from './base-repository';
import { ServiceAccount } from '../entities';
import { TransactionRunner } from '../services/transaction';

/** Loads and saves service accounts only. Each query filters on `kind = 'service'`. */
@Service()
export class ServiceAccountRepository extends BaseRepository<ServiceAccount> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(ServiceAccount, dataSource.manager, transactionRunner);
	}
}

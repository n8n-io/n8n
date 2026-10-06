import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { BaseRepository } from './base-repository';
import { IdempotencyKey } from '../entities';
import { TransactionRunner } from '../services/transaction';

@Service()
export class IdempotencyKeyRepository extends BaseRepository<IdempotencyKey> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(IdempotencyKey, dataSource.manager, transactionRunner);
	}
}

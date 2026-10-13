import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { IdempotencyKey } from '../entities';
import { TransactionRunner } from '../services/transaction';
import { BaseRepository } from './base-repository';

@Service()
export class IdempotencyKeyRepository extends BaseRepository<IdempotencyKey> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(IdempotencyKey, dataSource.manager, transactionRunner);
	}

	async deleteOlderThan(cutoff: Date, limit: number): Promise<number> {
		if (!Number.isInteger(limit) || limit <= 0) return 0;

		const batch = this.createQueryBuilder('key')
			.select('key.id')
			.where('key.createdAt < :cutoff', { cutoff })
			.orderBy('key.createdAt', 'ASC')
			.addOrderBy('key.id', 'ASC')
			.limit(limit);

		const result = await this.createQueryBuilder()
			.delete()
			.where(`id IN (${batch.getQuery()})`)
			.setParameters(batch.getParameters())
			.execute();

		return result.affected ?? 0;
	}
}

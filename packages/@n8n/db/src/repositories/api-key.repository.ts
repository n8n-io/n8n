import type { ApiKeyAudience } from '@n8n/api-types';
import { Service } from '@n8n/di';
import { DataSource, type EntityManager } from '@n8n/typeorm';

import { ApiKey } from '../entities';
import { TransactionRunner } from '../services/transaction';
import { contextFromEntityManager } from '../services/typeorm-transaction';

import { BaseRepository } from './base-repository';

@Service()
export class ApiKeyRepository extends BaseRepository<ApiKey> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(ApiKey, dataSource.manager, transactionRunner);
	}

	async deleteForUserByAudience(userId: string, audience: ApiKeyAudience, trx?: EntityManager) {
		return await this.runInTransaction(contextFromEntityManager(trx), async (em) => {
			const keys = await em.find(ApiKey, { where: { userId, audience } });
			return await Promise.all(keys.map(async (key) => await em.delete(ApiKey, { id: key.id })));
		});
	}
}

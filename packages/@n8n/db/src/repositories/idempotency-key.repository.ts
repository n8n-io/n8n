import { Service } from '@n8n/di';
import { generateNanoId } from '@n8n/utils/generate-nano-id';
import { DataSource, LessThan } from '@n8n/typeorm';

import { IdempotencyKey } from '../entities';
import { isUniqueConstraintError } from '../utils/is-unique-constraint-error';
import { TransactionRunner } from '../services/transaction';
import { BaseRepository } from './base-repository';

@Service()
export class IdempotencyKeyRepository extends BaseRepository<IdempotencyKey> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(IdempotencyKey, dataSource.manager, transactionRunner);
	}

	async insertProcessing({
		userId,
		idempotencyKey,
		fingerprint,
	}: {
		userId: string;
		idempotencyKey: string;
		fingerprint: string;
	}): Promise<string | null> {
		const id = generateNanoId();

		try {
			await this.insert({
				id,
				userId,
				idempotencyKey,
				fingerprint,
				status: 'processing',
			});
		} catch (error) {
			if (isUniqueConstraintError(error)) return null;
			throw error;
		}

		return id;
	}

	async findByUserIdAndKey(userId: string, idempotencyKey: string): Promise<IdempotencyKey | null> {
		return await this.findOne({ where: { userId, idempotencyKey } });
	}

	async deleteByUserIdAndKeyOlderThan(
		userId: string,
		idempotencyKey: string,
		cutoff: Date,
	): Promise<number> {
		const result = await this.delete({
			userId,
			idempotencyKey,
			createdAt: LessThan(cutoff),
		});

		return result.affected ?? 0;
	}

	async markCompleted(id: string, responseStatus: number, responseBody: unknown): Promise<void> {
		const row = await this.findOneBy({ id, status: 'processing' });
		if (!row) return;

		row.status = 'completed';
		row.responseStatus = responseStatus;
		row.responseBody = responseBody;
		await this.save(row);
	}

	async deleteProcessingById(id: string): Promise<void> {
		await this.delete({ id, status: 'processing' });
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

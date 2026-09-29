import { BaseRepository, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, type EntityManager } from '@n8n/typeorm';
import { UnexpectedError, jsonParse } from 'n8n-workflow';

import type { ResolvedSourceKeys } from '../../token-exchange.schemas';
import { TrustedKeySourceEntity } from '../entities/trusted-key-source.entity';
import { TrustedKeyEntity } from '../entities/trusted-key.entity';

@Service()
export class TrustedKeySourceRepository extends BaseRepository<TrustedKeySourceEntity> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(TrustedKeySourceEntity, dataSource.manager, transactionRunner);
	}

	/**
	 * Replaces the keys of a source inside the transaction of `ctx`.
	 * Does nothing when the source no longer exists.
	 * @throws {UnexpectedError} when `ctx` carries no transaction.
	 * @throws {Error} when the keys cannot be resolved or written.
	 */
	async refreshSource(
		sourceId: string,
		resolveKeys: (source: TrustedKeySourceEntity) => Promise<ResolvedSourceKeys | undefined>,
		ctx: OperationContext,
	): Promise<void> {
		if (!ctx.trx) {
			throw new UnexpectedError('Trusted key refresh requires a transaction');
		}
		const tx = this.managerFor(ctx);
		const source = await tx.findOneBy(TrustedKeySourceEntity, { id: sourceId });
		if (!source) {
			return;
		}

		const result = await resolveKeys(source);
		await this.storeResolvedKeys(source, result, tx);
	}

	private async storeResolvedKeys(
		source: TrustedKeySourceEntity,
		result: ResolvedSourceKeys | undefined,
		tx: EntityManager,
	): Promise<void> {
		if (!result) {
			// Skip unsupported source types until the next refresh interval.
			await tx.update(TrustedKeySourceEntity, source.id, {
				status: 'healthy',
				lastRefreshedAt: new Date(),
			});
			return;
		}

		await tx.delete(TrustedKeyEntity, { sourceId: source.id });
		for (const key of result.keys) {
			await tx.save(TrustedKeyEntity, {
				sourceId: source.id,
				kid: key.kid,
				data: JSON.stringify(key.data),
				createdAt: new Date(),
			});
		}

		const updatePayload: Partial<TrustedKeySourceEntity> = {
			status: 'healthy',
			lastError: null,
			lastRefreshedAt: new Date(),
		};
		if (result.cacheTtlSeconds !== undefined) {
			const config = jsonParse<Record<string, unknown>>(source.config);
			config.cacheTtlSeconds = result.cacheTtlSeconds;
			updatePayload.config = JSON.stringify(config);
		}
		await tx.update(TrustedKeySourceEntity, source.id, updatePayload);
	}
}

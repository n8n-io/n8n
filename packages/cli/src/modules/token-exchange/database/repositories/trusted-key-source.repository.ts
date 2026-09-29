import { BaseRepository, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, type EntityManager } from '@n8n/typeorm';
import { ensureError } from '@n8n/utils/errors/ensure-error';
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
	 * On failure, keeps the old keys, marks the source as error, and returns the error.
	 * @throws {UnexpectedError} when `ctx` carries no transaction.
	 */
	async refreshSource(
		sourceId: string,
		resolveKeys: (source: TrustedKeySourceEntity) => Promise<ResolvedSourceKeys | undefined>,
		ctx: OperationContext,
	): Promise<Error | undefined> {
		if (!ctx.trx) {
			throw new UnexpectedError('Trusted key refresh requires a transaction');
		}
		const tx = this.managerFor(ctx);
		const source = await tx.findOneBy(TrustedKeySourceEntity, { id: sourceId });
		if (!source) {
			return undefined;
		}

		// The caller takes the refresh lock before this savepoint, so a rollback keeps the lock.
		await tx.query('SAVEPOINT trusted_key_refresh');
		let failure: Error | undefined;
		try {
			const result = await resolveKeys(source);
			await this.storeResolvedKeys(source, result, tx);
		} catch (error) {
			failure = ensureError(error);
			await tx.query('ROLLBACK TO SAVEPOINT trusted_key_refresh');
			await tx.update(TrustedKeySourceEntity, sourceId, {
				status: 'error',
				lastError: failure.message,
			});
		}
		await tx.query('RELEASE SAVEPOINT trusted_key_refresh');
		return failure;
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

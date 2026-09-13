import { BaseRepository, type OperationContext, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, QueryFailedError } from '@n8n/typeorm';

import { PromotionProvider } from '../entities/promotion-provider.entity';
import { PromotionConflictError } from '../promotion-conflict.error';

type NewPromotionProvider = Pick<
	PromotionProvider,
	'name' | 'type' | 'authType' | 'config' | 'auth'
>;

@Service()
export class PromotionProviderRepository extends BaseRepository<PromotionProvider> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(PromotionProvider, dataSource.manager, transactionRunner);
	}

	async findById(id: string, ctx: OperationContext = {}): Promise<PromotionProvider | null> {
		return await this.managerFor(ctx).findOne(PromotionProvider, { where: { id } });
	}

	async insertProvider(provider: NewPromotionProvider): Promise<PromotionProvider> {
		return await this.save(this.create(provider));
	}

	/** Replaces name and credentials. Type and auth type are immutable. */
	async updateProvider(
		id: string,
		changes: Partial<Pick<PromotionProvider, 'name' | 'config' | 'auth'>>,
	): Promise<void> {
		await this.update({ id }, changes);
	}

	/**
	 * The foreign key from `promotion_connection` is the final guard, so a
	 * connection created after the caller's check still cannot lose its provider.
	 */
	async deleteProvider(id: string): Promise<void> {
		try {
			await this.delete({ id });
		} catch (error) {
			if (isForeignKeyConstraintError(error)) {
				throw new PromotionConflictError(
					'provider-in-use',
					'This provider is used by a connection',
				);
			}
			throw error;
		}
	}

	async listProviders(options: { offset: number; limit: number }) {
		// TypeORM omits the LIMIT clause when `take` is falsy, so `take: 0` would
		// return every row instead of none. Short-circuit to honor the limit.
		if (options.limit <= 0) return { count: await this.count(), data: [] };

		const [data, count] = await this.findAndCount({
			order: { id: 'ASC' },
			skip: options.offset,
			take: options.limit,
		});
		return { count, data };
	}
}

/** Mirrors `isUniqueConstraintError` in `@n8n/db`, for foreign keys. */
function isForeignKeyConstraintError(error: unknown): boolean {
	if (!(error instanceof QueryFailedError)) return false;

	// TypeORM types `driverError` as `any`, so narrow it via `unknown`.
	const driverError: unknown = error.driverError;
	if (typeof driverError !== 'object' || driverError === null) return false;

	const code =
		'code' in driverError && typeof driverError.code === 'string' ? driverError.code : undefined;

	// PostgreSQL: 23503 = foreign_key_violation.
	if (code === '23503') return true;

	// SQLite: the extended code is unambiguous; the base code covers every
	// constraint kind, so disambiguate via the message.
	if (code === 'SQLITE_CONSTRAINT_FOREIGNKEY') return true;
	return code === 'SQLITE_CONSTRAINT' && /FOREIGN KEY constraint/i.test(error.message);
}

import {
	BaseRepository,
	TransactionRunner,
	isUniqueConstraintError,
	type OperationContext,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { ScimToken } from './scim-token.entity';
import { ScimTokenConflictError } from '../scim.errors';

/** The instance SCIM token. The table holds at most one row. */
@Service()
export class ScimTokenRepository extends BaseRepository<ScimToken> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(ScimToken, dataSource.manager, transactionRunner);
	}

	async findInstanceToken(ctx: OperationContext) {
		return await this.managerFor(ctx).findOneBy(ScimToken, { slot: 'instance' });
	}

	async hasInstanceToken(ctx: OperationContext) {
		return await this.managerFor(ctx).existsBy(ScimToken, { slot: 'instance' });
	}

	/** The instance token with the ID and name of its creator, for display. */
	async findInstanceTokenWithCreator(ctx: OperationContext) {
		return await this.managerFor(ctx).findOne(ScimToken, {
			where: { slot: 'instance' },
			relations: { createdBy: true },
			select: {
				id: true,
				token: true,
				createdAt: true,
				lastUsedAt: true,
				createdById: true,
				createdBy: { id: true, firstName: true, lastName: true },
			},
		});
	}

	async findByToken(token: string, ctx: OperationContext) {
		return await this.managerFor(ctx).findOneBy(ScimToken, { token });
	}

	/**
	 * Sets the time of the last request that the token authenticated. The match
	 * is on the token value, so a write after a rotation does not mark the new
	 * token as used.
	 */
	async markUsed(token: string, at: Date, ctx: OperationContext) {
		await this.managerFor(ctx).update(ScimToken, { token }, { lastUsedAt: at });
	}

	/**
	 * Replaces the token that the caller read with a new one, in one
	 * transaction. `expectedToken` is null when the caller read no token.
	 *
	 * Throws `ScimTokenConflictError` when another request replaced or deleted
	 * the expected token first. Thus of two rotations from the same state, one
	 * fails, and the instance never holds two tokens.
	 *
	 * The match is on the token value, not the id: SQLite gives the id of a
	 * deleted last row to the next row.
	 */
	async replace(
		expectedToken: string | null,
		token: string,
		createdById: string,
		ctx: OperationContext,
	): Promise<ScimToken> {
		return await this.runInTransaction(ctx, async (tx) => {
			if (expectedToken !== null) {
				const { affected } = await tx.delete(ScimToken, { token: expectedToken });
				if (!affected) throw new ScimTokenConflictError();
			}

			try {
				await tx.insert(ScimToken, { token, createdById });
			} catch (error) {
				// The unique index on `slot` rejects a second row.
				if (isUniqueConstraintError(error)) throw new ScimTokenConflictError();
				throw error;
			}

			return await tx.findOneByOrFail(ScimToken, { token });
		});
	}

	async deleteInstanceToken(ctx: OperationContext) {
		await this.managerFor(ctx).delete(ScimToken, { slot: 'instance' });
	}
}

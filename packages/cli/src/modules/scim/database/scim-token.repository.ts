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

	async findByTokenHash(tokenHash: string, ctx: OperationContext) {
		return await this.managerFor(ctx).findOneBy(ScimToken, { tokenHash });
	}

	/**
	 * Replaces the token that the caller read with a new one, in one
	 * transaction. `expectedTokenHash` is null when the caller read no token.
	 *
	 * Throws `ScimTokenConflictError` when another request replaced or deleted
	 * the expected token first. Thus of two rotations from the same state, one
	 * fails, and the instance never holds two tokens.
	 *
	 * The match is on the token hash, not the id: SQLite gives the id of a
	 * deleted last row to the next row.
	 */
	async replace(
		expectedTokenHash: string | null,
		token: Pick<ScimToken, 'tokenHash' | 'tokenHint' | 'createdById'>,
		ctx: OperationContext,
	): Promise<ScimToken> {
		return await this.runInTransaction(ctx, async (tx) => {
			if (expectedTokenHash !== null) {
				const { affected } = await tx.delete(ScimToken, { tokenHash: expectedTokenHash });
				if (!affected) throw new ScimTokenConflictError();
			}

			try {
				await tx.insert(ScimToken, token);
			} catch (error) {
				// The unique index on `slot` rejects a second row.
				if (isUniqueConstraintError(error)) throw new ScimTokenConflictError();
				throw error;
			}

			return await tx.findOneByOrFail(ScimToken, { tokenHash: token.tokenHash });
		});
	}

	async deleteInstanceToken(ctx: OperationContext) {
		await this.managerFor(ctx).delete(ScimToken, { slot: 'instance' });
	}
}

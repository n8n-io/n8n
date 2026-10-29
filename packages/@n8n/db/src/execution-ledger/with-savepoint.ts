import { UnexpectedError } from 'n8n-workflow';

import { assertValidFoldStepName } from './fold-step';
import { FoldTransactionLostError } from './fold-transaction-lost.error';
import type { OperationContext } from '../services/transaction';
import { entityManagerOf } from '../services/typeorm-transaction';

/**
 * Runs one fold step in its own savepoint inside the transaction `ctx` carries. On failure it
 * undoes only that step and rethrows the step's error. `TransactionRunner.run` joins an outer
 * transaction and does not nest it, so it cannot do this.
 *
 * @throws FoldTransactionLostError when `ROLLBACK TO SAVEPOINT` fails.
 */
export async function withSavepoint<T>(
	ctx: OperationContext,
	stepName: string,
	fn: (ctx: OperationContext) => Promise<T>,
): Promise<T> {
	if (!ctx.trx) throw new UnexpectedError('A savepoint needs an active transaction');
	assertValidFoldStepName(stepName);

	const savepoint = `fold_step_${stepName}`;
	const manager = entityManagerOf(ctx.trx);

	await manager.query(`SAVEPOINT ${savepoint}`);
	try {
		const result = await fn(ctx);
		await manager.query(`RELEASE SAVEPOINT ${savepoint}`);
		return result;
	} catch (stepError) {
		try {
			await manager.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
			// ROLLBACK TO keeps the savepoint open.
			await manager.query(`RELEASE SAVEPOINT ${savepoint}`);
		} catch (rollbackError) {
			throw new FoldTransactionLostError(savepoint, stepError, rollbackError);
		}
		throw stepError;
	}
}

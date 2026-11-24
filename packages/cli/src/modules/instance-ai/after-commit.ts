import type { OperationContext, Transaction, TransactionRunner } from '@n8n/db';
import { UnexpectedError } from '@n8n/errors';

const pending = new WeakMap<Transaction, Array<() => void>>();

/**
 * Run `fn` in a transaction. When this call opens the transaction, run the effects
 * that `afterCommit` collected, after the commit. A rollback drops them.
 */
export async function runInTransaction<T>(
	txRunner: TransactionRunner,
	context: OperationContext,
	fn: (ctx: OperationContext) => Promise<T>,
): Promise<T> {
	if (context.trx) return await txRunner.run(context, fn);

	const effects: Array<() => void> = [];
	const result = await txRunner.run(context, async (ctx) => {
		if (ctx.trx) pending.set(ctx.trx, effects);
		return await fn(ctx);
	});
	for (const effect of effects) effect();
	return result;
}

/** Run a side effect, for example telemetry, after the transaction of `ctx` commits. */
export function afterCommit(ctx: OperationContext, effect: () => void) {
	if (!ctx.trx) return effect();

	const effects = pending.get(ctx.trx);
	if (!effects) throw new UnexpectedError('Open the transaction with `runInTransaction`.');
	effects.push(effect);
}

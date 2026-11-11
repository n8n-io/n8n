import type { OperationContext, Transaction, TransactionRunner } from '@n8n/db';

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
	const effects = ctx.trx ? pending.get(ctx.trx) : undefined;
	// Without a collecting transaction, run the effect now.
	if (effects) effects.push(effect);
	else effect();
}

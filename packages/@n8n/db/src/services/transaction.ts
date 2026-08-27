/**
 * Transaction ports — the TypeORM-agnostic surface business logic depends on.
 *
 * No `@n8n/typeorm` import lives here on purpose: services thread these types around
 * without ever naming a driver type. The concrete driver handle is owned by the adapter
 * (`typeorm-transaction.ts`) and unwrapped only inside the repository layer
 * (`BaseRepository`).
 */

export type IsolationLevel =
	| 'READ UNCOMMITTED'
	| 'READ COMMITTED'
	| 'REPEATABLE READ'
	| 'SERIALIZABLE';

/**
 * Opaque transaction handle. Implementations own the native driver handle privately;
 * callers only ever pass it back through repository methods.
 *
 * Abstract class (not an `interface`) so the `private` field makes it nominal: an
 * arbitrary object no longer satisfies `Transaction` structurally, so business logic
 * can't fabricate one at compile time. The stored isolation level lets the runner
 * detect a nested `run` requesting a level that differs from the active transaction's.
 */
export abstract class Transaction {
	constructor(private readonly isolationLevel?: IsolationLevel) {}

	/** The isolation level this transaction was opened with, if one was requested. */
	getIsolationLevel(): IsolationLevel | undefined {
		return this.isolationLevel;
	}
}

/**
 * Ambient operation context, created at the edge and threaded through the call chain as
 * `ctx`. Carries the active `trx` (if any); reserved to grow actor/scope fields for the
 * access-control follow-up. Immutable — the runner augments it by producing a copy.
 */
export interface OperationContext {
	readonly trx?: Transaction;
}

export interface RunOptions {
	isolationLevel?: IsolationLevel;
}

/**
 * Runs work inside a database transaction.
 *
 * Abstract class (not an `interface`) so it can serve as a `@n8n/di` injection token —
 * the container resolves by runtime class reference, which an erased interface can't be.
 */
export abstract class TransactionRunner {
	/**
	 * Run `fn` inside a transaction. A context is always required, forcing callers to thread
	 * it (so it can be enriched later without touching every signature). If `context` already
	 * carries a `trx`, that transaction is reused; otherwise a new one is opened and `fn`
	 * receives a context augmented with it. The root/top-level context is an empty `{}`.
	 */
	abstract run<T>(
		context: OperationContext,
		fn: (ctx: OperationContext) => Promise<T>,
		options?: RunOptions,
	): Promise<T>;
}

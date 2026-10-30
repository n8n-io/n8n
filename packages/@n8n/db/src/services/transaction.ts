import type { EnforcementPoint, PolicyCleared } from '@n8n/decorators';
import type { SecurityContext } from '@n8n/permissions';

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
	constructor(
		private readonly isolationLevel?: IsolationLevel,
		private readonly readOnly = false,
	) {}

	/** The isolation level this transaction was opened with, if one was requested. */
	getIsolationLevel(): IsolationLevel | undefined {
		return this.isolationLevel;
	}

	/** Whether this transaction was opened read-only; a write inside it is a bug. */
	isReadOnly(): boolean {
		return this.readOnly;
	}
}

/**
 * Ambient operation context, created at the edge and threaded through the call chain as
 * `ctx`. Carries the active `trx` (if any) and the caller's `security` context (if
 * authenticated). Immutable — the runner augments it by producing a copy.
 */
export interface OperationContext {
	readonly trx?: Transaction;
	readonly policyCleared?: PolicyCleared<EnforcementPoint>;
	readonly security?: SecurityContext; // owner: the authentication edge
}

export interface RunOptions {
	isolationLevel?: IsolationLevel;
	/**
	 * Open the transaction read-only. On the pooled SQLite driver the transaction
	 * leases from the read pool instead of waiting for the single write connection.
	 * On Postgres it runs on a configured read replica, or on the primary when none
	 * is configured, and is marked with `SET TRANSACTION READ ONLY`. A write
	 * statement inside a read-only transaction fails on both drivers. Keep the
	 * callback short, pass `ctx` to every repository call, and do not await
	 * external I/O inside it, because the transaction holds a pooled read
	 * connection for its whole duration.
	 */
	readOnly?: boolean;
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

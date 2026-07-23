import { OperationalError } from 'n8n-workflow';

/**
 * Lock namespaces. A `const` object rather than an `enum`: `const enum` erases
 * to `undefined` for cross-package callers under `isolatedModules`, and a plain
 * `enum` is disallowed by lint (runtime overhead). This pattern is both.
 */
export const LockNamespace = {
	KNOWN_LOCKS: 1,
	CREDENTIALS: 2,
} as const;

export type LockNamespace = (typeof LockNamespace)[keyof typeof LockNamespace];

/** Thrown by `withLease` when the lease cannot be acquired within `waitTimeoutMs`. */
export class LockAcquisitionTimeoutError extends OperationalError {}

export interface ILockService {
	/**
	 * Run `fn` while holding a lease on `ns`/`key`, releasing it when `fn` settles.
	 *
	 * This is an **efficiency primitive**, not a correctness one: the lease can expire
	 * while `fn` is still running (on the Redis backend, via TTL; under failover or a
	 * watchdog renewal failure), so two holders may briefly run concurrently. Safe for
	 * idempotent or self-fencing work (e.g. OAuth refresh against a rotating-token IdP).
	 * If you need mutual exclusion that survives holder stalls, the protected resource
	 * must enforce a fence — a lease alone cannot provide that.
	 *
	 * @param fn Receives an `AbortSignal` that fires if the lease is lost mid-execution
	 *   (Redis backend only — see below). Honor it for long critical sections; abort is
	 *   cooperative, so ignoring the signal reopens the concurrent-holder window.
	 * @param options.waitTimeoutMs Max time to wait to acquire before throwing
	 *   `OperationalError`. Omit to wait indefinitely.
	 * @param options.leaseTtlMs Lease backstop for the **Redis backend only**. The lease
	 *   auto-expires after this window if not renewed (the watchdog renews every
	 *   `leaseTtlMs / 3`), so a crashed holder can't block the key forever. Must exceed
	 *   the Redis command timeout. Defaults to 30s.
	 *   **Ignored by the in-process backend**, which holds the lease until `fn` settles
	 *   and never aborts the signal during execution — there is no orphaned-holder risk
	 *   within a single process. Do not rely on `leaseTtlMs` for liveness on the default
	 *   (in-process) backend.
	 */
	withLease<T>(
		ns: LockNamespace,
		key: string,
		fn: (signal: AbortSignal) => Promise<T>,
		options?: { waitTimeoutMs?: number; leaseTtlMs?: number },
	): Promise<T>;
}

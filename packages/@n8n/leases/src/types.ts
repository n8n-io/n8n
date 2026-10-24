/** One lease a kind wants held by exactly one process in the cluster. */
export interface LeaseSpec {
	/** Unique within its kind, and stable across restarts. */
	key: string;
	/** What the holder needs to arm the resource. A change hands the lease to a new holder. */
	data: Record<string, unknown>;
}

/**
 * Why a holder must let go:
 * - `lost`: the lease is gone, about to expire, or no longer desired.
 * - `shutdown`: this process is stopping.
 * - `start-timeout`: `ready()` did not come in time.
 */
export type LeaseEndReason = 'lost' | 'shutdown' | 'start-timeout';

/**
 * Checks a lease inside a transaction of the consumer's own store, so a write
 * that depends on the lease commits only while this process holds it.
 * `TTransaction` is the store's transaction handle; this package never looks
 * inside it.
 */
export interface LeaseFence<TTransaction> {
	/**
	 * Whether this process still holds the lease at its fencing token. The
	 * provider keeps a `true` answer valid until `transaction` ends, so no other
	 * process can take the lease between this check and the commit.
	 */
	isHeld(transaction: TTransaction): Promise<boolean>;
}

/** One lease held by this process. */
export interface Lease<TTransaction> extends LeaseFence<TTransaction> {
	readonly kind: string;
	readonly key: string;
	readonly data: Record<string, unknown>;
	/**
	 * Grows each time the lease changes holder, so an external system can reject
	 * writes from an older holder.
	 */
	readonly fencingToken: number;
	/** Aborts with a `LeaseEndedError` when the holder must let go. */
	readonly signal: AbortSignal;
	/** Report the resource armed. Until then, a throw or a return is a failed start. */
	ready(): Promise<void>;
}

/**
 * Keeps one lease for as long as it is held: arm the resource, call
 * `lease.ready()`, wait on `lease.signal`, disarm, return.
 */
export interface LeaseHandler<TTransaction> {
	hold(lease: Lease<TTransaction>): Promise<void>;
}

export interface LeaseKindOptions {
	/** How long a lease survives without renewal. `undefined` uses the provider default. */
	leaseSeconds?: number;
	/** How long a holder may take to call `ready()`. */
	startTimeoutSeconds: number;
	/** Failed starts allowed before the provider stops trying the lease. */
	maxFailedStarts: number;
}

/** A family of leases with one handler, for example the triggers of published workflows. */
export interface LeaseKind<TTransaction> {
	/** Lower case letters, digits and dashes, at most {@link MAX_LEASE_KIND_LENGTH} characters. */
	name: string;
	handler: LeaseHandler<TTransaction>;
	/**
	 * The leases this kind wants held, from its own source of truth. With `keys`,
	 * only the desired leases among them.
	 */
	listDesired(keys?: readonly string[]): Promise<LeaseSpec[]>;
	options?: Partial<LeaseKindOptions>;
}

export const MAX_LEASE_KIND_LENGTH = 24;

export const DEFAULT_LEASE_KIND_OPTIONS: LeaseKindOptions = {
	startTimeoutSeconds: 60,
	maxFailedStarts: 5,
};

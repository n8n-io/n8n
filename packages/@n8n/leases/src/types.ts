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

/** One lease held by this process. */
export interface Lease {
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
export interface LeaseHandler {
	hold(lease: Lease): Promise<void>;
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
export interface LeaseKind {
	/** Lower case letters, digits and dashes, at most {@link MAX_LEASE_KIND_LENGTH} characters. */
	name: string;
	handler: LeaseHandler;
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

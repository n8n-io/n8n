/** One lease that a kind wants held by exactly one process in the cluster. */
export interface LeaseSpec {
	/** Unique within its kind, and stable across restarts. */
	key: string;
	/** What the holder needs to arm the resource. A change hands the lease to a new holder. */
	data: Record<string, unknown>;
	/**
	 * Leases with the same group are replicas of one resource. The provider places
	 * them on different holders where it can. A group gives no guarantee about how
	 * many of its leases are held.
	 */
	group?: string;
}

/**
 * Why a holder must let go:
 * - `lost`: the lease is gone, revoked, about to expire, or no longer desired.
 * - `shutdown`: this process is stopping.
 * - `start-timeout`: `ready()` did not come in time.
 */
export type LeaseEndReason = 'lost' | 'shutdown' | 'start-timeout';

/**
 * Checks a lease inside a transaction of the consumer's own store, so that a
 * write that depends on the lease commits only while this process holds it.
 */
export interface LeaseFence<TTransaction> {
	/**
	 * Whether this process still holds the lease at its fencing token. The
	 * provider keeps a `true` answer valid until `transaction` ends, so no other
	 * process can take the lease between this check and the commit.
	 */
	isHeld(transaction: TTransaction): Promise<boolean>;
}

/** One lease that this process holds. */
export interface Lease<TTransaction> extends LeaseFence<TTransaction> {
	readonly kind: string;
	readonly key: string;
	readonly data: Record<string, unknown>;
	readonly group: string | undefined;
	/** Increases each time the lease changes holder, also when the key is deleted and created again. */
	readonly fencingToken: number;
	/** Aborts with a `LeaseEndedError` when the holder must let go. */
	readonly signal: AbortSignal;
	/** Report the resource armed. Until then, a throw or a return is a failed start. */
	ready(): Promise<void>;
}

/**
 * Keeps one lease for as long as this process holds it: arm the resource, call
 * `lease.ready()`, wait on `lease.signal`, disarm, return.
 */
export interface LeaseHandler<TTransaction> {
	hold(lease: Lease<TTransaction>): Promise<void>;
}

/** A page of desired leases, in the source's own stable order. */
export interface LeaseSpecPage {
	specs: LeaseSpec[];
	/** Opaque cursor for the next page; `undefined` on the last page. */
	nextCursor: string | undefined;
}

/** The source of truth for which leases a kind wants held. */
export interface LeaseSource {
	/** The desired leases among `keys`. Keys that are not desired are left out. */
	listDesired(keys: readonly string[]): Promise<LeaseSpec[]>;
	/** One page of all desired leases, starting after `cursor`. */
	pageDesired(cursor: string | undefined, limit: number): Promise<LeaseSpecPage>;
}

export interface LeaseKindOptions {
	/** How long a lease survives without renewal. `undefined` uses the provider default. */
	leaseSeconds?: number;
	/** How long a holder may take to call `ready()`. */
	startTimeoutSeconds: number;
	/** Failed starts allowed before the provider stops trying the lease. `null` is unlimited. */
	maxFailedStarts: number | null;
}

export type LeaseState = 'pending' | 'held' | 'failing';

export interface LeaseStatus {
	key: string;
	state: LeaseState;
	detail: 'ready' | 'handing-over' | 'starting' | 'unclaimed' | 'backoff' | 'exhausted';
	attempts: number;
	lastError: string | null;
	holder: string | null;
	fencingToken: number;
}

/** A family of leases with one handler, for example the triggers of published workflows. */
export interface LeaseKind<TTransaction> {
	name: string;
	handler: LeaseHandler<TTransaction>;
	source: LeaseSource;
	options?: Partial<LeaseKindOptions>;
}

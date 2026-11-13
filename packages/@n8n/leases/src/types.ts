export interface LeaseSpec {
	key: string;
	data: Record<string, unknown>;
	group?: string;
}

export type LeaseEndReason = 'lost' | 'shutdown' | 'start-timeout';

export interface LeaseFence<TTransaction> {
	isHeld(transaction: TTransaction): Promise<boolean>;
}

export interface Lease<TTransaction> extends LeaseFence<TTransaction> {
	readonly kind: string;
	readonly key: string;
	readonly data: Record<string, unknown>;
	readonly group: string | undefined;
	readonly fencingToken: number;
	readonly signal: AbortSignal;
	ready(): Promise<void>;
}

export interface LeaseHandler<TTransaction> {
	hold(lease: Lease<TTransaction>): Promise<void>;
}

export interface LeaseSpecPage {
	specs: LeaseSpec[];
	nextCursor: string | undefined;
}

export interface LeaseSource {
	listDesired(keys: readonly string[]): Promise<LeaseSpec[]>;
	pageDesired(cursor: string | undefined, limit: number): Promise<LeaseSpecPage>;
}

export interface LeaseKindOptions {
	leaseSeconds?: number;
	startTimeoutSeconds: number;
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

export interface LeaseKind<TTransaction> {
	name: string;
	handler: LeaseHandler<TTransaction>;
	source: LeaseSource;
	options?: Partial<LeaseKindOptions>;
}

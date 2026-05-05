import type { AgentDbMessage } from './message';
import type { BuiltTelemetry } from '../telemetry';
import type { JSONValue } from '../utils/json';

/**
 * Schema version stamped onto every observation row. Bump when the row format
 * changes incompatibly. Read-side helpers filter rows newer than the running
 * SDK can interpret.
 */
export const OBSERVATION_SCHEMA_VERSION = 1;

/**
 * Scope an observation belongs to. v1 writes only `'thread'`; the others are
 * reserved so future resource- and agent-scoped observers are a behavioral
 * change, not a schema migration.
 */
export type ScopeKind = 'thread' | 'resource' | 'agent';

/** A persisted observation row. */
export interface Observation {
	id: string;
	scopeKind: ScopeKind;
	scopeId: string;
	seq: number;
	/** Free-form, consumer-defined. The SDK reserves no values. */
	kind: string;
	payload: JSONValue;
	/** Populated for kinds that represent a time gap; otherwise `null`. */
	durationMs: number | null;
	schemaVersion: number;
	createdAt: Date;
	/** Soft-flag set by the compactor; `null` until then. */
	compactedAt: Date | null;
}

/** Shape passed to `appendObservations`. `id` and `seq` are backend-assigned. */
export type NewObservation = Omit<Observation, 'id' | 'seq'>;

export interface ObservationCursor {
	scopeKind: ScopeKind;
	scopeId: string;
	lastObservedMessageId: string;
	lastObservedSeq: number;
	updatedAt: Date;
}

export interface ObservationLockHandle {
	scopeKind: ScopeKind;
	scopeId: string;
	holderId: string;
	heldUntil: Date;
}

/**
 * Consumer-provided observer function. Called inside the orchestrator's
 * lock + cursor scope; receives the message delta since the last cursor
 * advance and the current rolling summary, returns zero or more rows to
 * append.
 */
export type ObserveFn = (ctx: {
	deltaMessages: AgentDbMessage[];
	currentSummary: string | null;
	cursor: ObservationCursor | null;
	telemetry: BuiltTelemetry | undefined;
}) => Promise<NewObservation[]>;

/**
 * Consumer-provided compactor function. Reads uncompacted rows + the previous
 * summary, returns a single new summary row to append.
 */
export type CompactFn = (ctx: {
	uncompactedRows: Observation[];
	previousSummary: string | null;
	telemetry: BuiltTelemetry | undefined;
}) => Promise<{ summary: NewObservation }>;

/**
 * Consumer-provided formatter for the system-prompt section. Receives the
 * current rolling summary, recent uncompacted observations, and a staleness
 * flag; returns the rendered section as a single string. When absent, the
 * SDK uses a minimal default formatter.
 */
export type FormatContextFn = (ctx: {
	summary: string | null;
	summaryUpdatedAt: Date | null;
	isStale: boolean;
	recentObservations: Observation[];
}) => string;

/**
 * Storage interface for observational memory. A sibling to {@link BuiltMemory}:
 * implementations typically live on the same class (e.g. `SqliteMemory`
 * implements both), but the interfaces are kept separate so observations stay
 * out of the message-store API and consumers don't need to feature-check every
 * call. When `observationalMemory` is configured on the builder, the
 * configured backend must also implement this interface.
 */
export interface BuiltObservationStore {
	/**
	 * Append observation rows for a scope. Backends assign `id` and `seq` and
	 * return the persisted shape. Append-only; rows are not mutated after
	 * insert except via {@link BuiltObservationStore.markObservationsCompacted}.
	 */
	appendObservations(rows: NewObservation[]): Promise<Observation[]>;
	/**
	 * Query observations for a scope. Filters compose: `sinceSeq` returns
	 * only rows with `seq > sinceSeq`; `kindIs` matches `kind` exactly;
	 * `onlyUncompacted` excludes rows with `compactedAt` set;
	 * `schemaVersionAtMost` excludes rows whose `schemaVersion` exceeds the
	 * caller's supported version. Results are ordered by `seq` ascending.
	 */
	getObservations(opts: {
		scopeKind: ScopeKind;
		scopeId: string;
		sinceSeq?: number;
		kindIs?: string;
		limit?: number;
		schemaVersionAtMost?: number;
		onlyUncompacted?: boolean;
	}): Promise<Observation[]>;
	/** Soft-flag the given rows as compacted; idempotent. */
	markObservationsCompacted(ids: string[], compactedAt: Date): Promise<void>;
	/** Read the cursor for a scope; `null` if none has been written yet. */
	getCursor(scopeKind: ScopeKind, scopeId: string): Promise<ObservationCursor | null>;
	/** Upsert the cursor for a scope. */
	setCursor(cursor: ObservationCursor): Promise<void>;
	/**
	 * Acquire a per-scope advisory lock with TTL. Returns a handle on
	 * success or `null` if the lock is held by another holder and not yet
	 * expired. Holders other than `holderId` whose `heldUntil` is in the
	 * past may be displaced.
	 */
	acquireObservationLock(
		scopeKind: ScopeKind,
		scopeId: string,
		opts: { ttlMs: number; holderId: string },
	): Promise<ObservationLockHandle | null>;
	/** Release a held lock. Tolerates the lock having already expired or been displaced. */
	releaseObservationLock(handle: ObservationLockHandle): Promise<void>;
}

/** Observational-memory configuration block on `MemoryConfig`. */
export interface ObservationalMemoryConfig {
	/** Builder-time default observer; `agent.reflect(observe?, ...)` can override per call. */
	observe?: ObserveFn;
	/** Builder-time default compactor. Without it, no auto-compaction runs. */
	compact?: CompactFn;
	/**
	 * When set together with `compact`, the orchestrator runs the compactor
	 * after `observe` whenever the uncompacted row count for the scope is
	 * `>=` this value.
	 */
	compactionRowThreshold?: number;
	/**
	 * When set, the formatter receives `isStale: true` once the rolling
	 * summary's `updatedAt` is older than this many milliseconds. Absent
	 * means staleness is never flagged.
	 */
	stalenessThresholdMs?: number;
	/** Consumer-provided formatter; absent means use the SDK's minimal default. */
	formatContext?: FormatContextFn;
	/**
	 * Kind value the read-side helper uses to find the rolling summary row
	 * for a scope.
	 * @default 'summary'
	 */
	summaryKind?: string;
	/**
	 * TTL applied when the orchestrator acquires the per-scope observation
	 * lock.
	 * @default 30_000
	 */
	lockTtlMs?: number;
	/**
	 * When `true`, `runObservationalCycle` calls dispatched by the SDK (e.g.
	 * lazy fallback at `TurnStart`) are awaited; otherwise they are tracked
	 * by the background-task tracker and resolve on `runtime.dispose()`.
	 * @default false
	 */
	sync?: boolean;
}

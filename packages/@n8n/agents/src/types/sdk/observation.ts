import type { z } from 'zod';

import type { ModelConfig } from './agent';
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
	/** Free-form, consumer-defined. The SDK reserves no values. */
	kind: string;
	payload: JSONValue;
	/** Populated for kinds that represent a time gap; otherwise `null`. */
	durationMs: number | null;
	schemaVersion: number;
	createdAt: Date;
}

/** Shape passed to `appendObservations`. `id` is backend-assigned. */
export type NewObservation = Omit<Observation, 'id'>;

/**
 * Per-scope mutable state for the observer's message cursor.
 */
export interface ObservationCursor {
	scopeKind: ScopeKind;
	scopeId: string;
	lastObservedMessageId: string;
	lastObservedAt: Date;
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
 * advance and the current thread working-memory document, then returns zero
 * or more rows to append.
 */
export type ObserveFn = (ctx: {
	deltaMessages: AgentDbMessage[];
	currentWorkingMemory: string | null;
	cursor: ObservationCursor | null;
	threadId: string;
	resourceId: string;
	now: Date;
	trigger: ObservationalMemoryTrigger;
	telemetry: BuiltTelemetry | undefined;
}) => Promise<NewObservation[]>;

/**
 * Consumer-provided compactor function. Reads queued observations + the
 * current working-memory document, and returns the complete replacement
 * working-memory document.
 */
export type CompactFn = (ctx: {
	observations: Observation[];
	currentWorkingMemory: string | null;
	workingMemoryTemplate: string;
	structured: boolean;
	schema?: z.ZodObject<z.ZodRawShape>;
	threadId: string;
	resourceId: string;
	model: ModelConfig;
	compactorPrompt: string;
	telemetry: BuiltTelemetry | undefined;
}) => Promise<{ content: string }>;

/**
 * Storage interface for observational memory. A sibling to {@link BuiltMemory}:
 * implementations typically live on the same class (cli's `N8nMemory` and the
 * SDK's `InMemoryMemory` both implement both), but the interfaces are kept
 * separate so observations stay out of the message-store API and consumers
 * don't need to feature-check every call. When `observationalMemory` is
 * configured on the builder, the configured backend must also implement this
 * interface.
 */
export interface BuiltObservationStore {
	/**
	 * Append observation rows for a scope. Backends assign `id` and return the
	 * persisted shape.
	 */
	appendObservations(rows: NewObservation[]): Promise<Observation[]>;
	/**
	 * Query observations for a scope. Filters compose: `since`, when supplied,
	 * returns only rows strictly after the keyset `(createdAt, id) >
	 * (since.sinceCreatedAt, since.sinceObservationId)`; `kindIs` matches
	 * `kind` exactly; `schemaVersionAtMost` excludes rows whose `schemaVersion`
	 * exceeds the caller's supported version. Results are ordered by
	 * `(createdAt, id)` ascending.
	 */
	getObservations(opts: {
		scopeKind: ScopeKind;
		scopeId: string;
		since?: { sinceCreatedAt: Date; sinceObservationId: string };
		kindIs?: string;
		limit?: number;
		schemaVersionAtMost?: number;
	}): Promise<Observation[]>;
	/**
	 * Read the message delta the observer needs to process for a given scope.
	 *
	 * - `'thread'`: messages for `scopeId` (== threadId).
	 * - non-thread scopes are reserved for future versions. v1 backends should
	 *   throw for them.
	 *
	 * When `since` is supplied, only messages strictly after the keyset
	 * `(createdAt, id) > (since.sinceCreatedAt, since.sinceMessageId)` are
	 * returned. Results are ordered by `(createdAt, id)` ascending — the last
	 * element is the most recently appended.
	 */
	getMessagesForScope(
		scopeKind: ScopeKind,
		scopeId: string,
		opts?: { since?: { sinceCreatedAt: Date; sinceMessageId: string } },
	): Promise<AgentDbMessage[]>;
	/** Hard-delete the given rows. Idempotent: missing ids are ignored. */
	deleteObservations(ids: string[]): Promise<void>;
	/** Read the cursor for a scope; `null` if none has been written yet. */
	getCursor(scopeKind: ScopeKind, scopeId: string): Promise<ObservationCursor | null>;
	/** Upsert the cursor-advance fields for a scope. */
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

export type ObservationalMemoryTrigger =
	| { type: 'per-turn' }
	| {
			type: 'idle-timer';
			/** Milliseconds after TurnEnd before the observer runs. */
			idleMs: number;
			/** Emit a gap row when the elapsed time since the previous observed turn exceeds this. */
			gapThresholdMs?: number;
	  };

/** Observational-memory configuration block on `MemoryConfig`. */
export interface ObservationalMemoryConfig {
	/**
	 * Builder-time observer override. Omit this to use the SDK reference
	 * observer prompt + the agent's configured model.
	 */
	observe?: ObserveFn;
	/**
	 * Builder-time compactor override. Omit this to use the SDK reference
	 * compactor prompt + the agent's configured model.
	 */
	compact?: CompactFn;
	/** @default { type: 'per-turn' } */
	trigger?: ObservationalMemoryTrigger;
	/** Queue size that triggers compaction into the thread working-memory document. @default 5 */
	compactionThreshold?: number;
	/** Replaces the SDK reference observer system prompt. */
	observerPrompt?: string;
	/** Replaces the SDK reference compactor system prompt. */
	compactorPrompt?: string;
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

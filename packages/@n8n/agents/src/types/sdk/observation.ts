import type { z } from 'zod';

import type { ModelConfig } from './agent';
import type { AgentDbMessage } from './message';
import type { BuiltTelemetry } from '../telemetry';
import type { JSONValue } from '../utils/json';

export const OBSERVATION_SCHEMA_VERSION = 1;

export const DEFAULT_OBSERVATION_GAP_THRESHOLD_MS = 60 * 60_000;

export const OBSERVATION_CATEGORIES = [
	'facts',
	'preferences',
	'goal',
	'state',
	'active_items',
	'decisions',
	'follow_ups',
	'continuity',
	'superseded',
	'other',
] as const;

export type ObservationCategory = (typeof OBSERVATION_CATEGORIES)[number];

export interface ObservationGapContext {
	durationMs: number;
	text: string;
	previousObservedAt: Date;
	nextMessageAt: Date;
}

export type ScopeKind = 'thread' | 'resource' | 'agent';

export interface Observation {
	id: string;
	scopeKind: ScopeKind;
	scopeId: string;
	kind: string;
	payload: JSONValue;
	durationMs: number | null;
	schemaVersion: number;
	createdAt: Date;
}

export type NewObservation = Omit<Observation, 'id'>;

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

export type ObserveFn = (ctx: {
	deltaMessages: AgentDbMessage[];
	currentWorkingMemory: string | null;
	cursor: ObservationCursor | null;
	threadId: string;
	resourceId: string;
	now: Date;
	trigger: ObservationalMemoryTrigger;
	gap: ObservationGapContext | null;
	telemetry: BuiltTelemetry | undefined;
}) => Promise<NewObservation[]>;

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

export interface BuiltObservationStore {
	appendObservations(rows: NewObservation[]): Promise<Observation[]>;
	getObservations(opts: {
		scopeKind: ScopeKind;
		scopeId: string;
		since?: { sinceCreatedAt: Date; sinceObservationId: string };
		kindIs?: string;
		limit?: number;
		schemaVersionAtMost?: number;
	}): Promise<Observation[]>;
	getMessagesForScope(
		scopeKind: ScopeKind,
		scopeId: string,
		opts?: { since?: { sinceCreatedAt: Date; sinceMessageId: string } },
	): Promise<AgentDbMessage[]>;
	deleteObservations(ids: string[]): Promise<void>;
	getCursor(scopeKind: ScopeKind, scopeId: string): Promise<ObservationCursor | null>;
	setCursor(cursor: ObservationCursor): Promise<void>;
	acquireObservationLock(
		scopeKind: ScopeKind,
		scopeId: string,
		opts: { ttlMs: number; holderId: string },
	): Promise<ObservationLockHandle | null>;
	releaseObservationLock(handle: ObservationLockHandle): Promise<void>;
}

export type ObservationalMemoryTrigger =
	| { type: 'per-turn' }
	| {
			type: 'idle-timer';
			idleMs: number;
			gapThresholdMs?: number;
	  };

export interface ObservationalMemoryConfig {
	observe?: ObserveFn;
	compact?: CompactFn;
	trigger?: ObservationalMemoryTrigger;
	compactionThreshold?: number;
	gapThresholdMs?: number;
	observerPrompt?: string;
	compactorPrompt?: string;
	lockTtlMs?: number;
	sync?: boolean;
}

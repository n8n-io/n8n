import type { AgentExecutionCounter, TokenUsage } from './agent';
import type { AgentDbMessage } from './message';
import type { BuiltTelemetry } from '../telemetry';

export const OBSERVATION_LOG_MARKERS = ['critical', 'important', 'info', 'completion'] as const;

export type ObservationLogMarker = (typeof OBSERVATION_LOG_MARKERS)[number];

export const OBSERVATION_LOG_STATUSES = ['active', 'superseded', 'dropped'] as const;

export type ObservationLogStatus = (typeof OBSERVATION_LOG_STATUSES)[number];

export type ObservationLogTaskKind = 'observer' | 'reflector';

export interface ObservationLogScope {
	observationScopeId: string;
}

export interface ObservationLogTaskLockHandle extends ObservationLogScope {
	taskKind: ObservationLogTaskKind;
	holderId: string;
	heldUntil: Date;
}

export interface ObservationLogEntry extends ObservationLogScope {
	id: string;
	marker: ObservationLogMarker;
	text: string;
	parentId: string | null;
	tokenCount: number;
	status: ObservationLogStatus;
	supersededBy: string | null;
	createdAt: Date;
}

export interface NewObservationLogEntry extends ObservationLogScope {
	marker: ObservationLogMarker;
	text: string;
	parentId?: string | null;
	tokenCount?: number;
	createdAt?: Date;
}

export interface ObservationLogReadOptions extends ObservationLogScope {
	status?: ObservationLogStatus;
	parentId?: string | null;
	limit?: number;
	order?: 'asc' | 'desc';
}

export interface ObservationLogMerge {
	supersedes: string[];
	marker: ObservationLogMarker;
	text: string;
	parentId?: string | null;
	tokenCount?: number;
	createdAt?: Date;
}

export interface ObservationLogReflection {
	drop: string[];
	merge: ObservationLogMerge[];
}

export interface ObservationLogReflectionResult {
	droppedIds: string[];
	supersededIds: string[];
	inserted: ObservationLogEntry[];
}

export function getStoredObservationTokenCount(
	entry: Pick<ObservationLogEntry, 'text' | 'tokenCount'>,
): number {
	if (Number.isFinite(entry.tokenCount) && entry.tokenCount > 0) return entry.tokenCount;
	return Buffer.byteLength(entry.text, 'utf8');
}

export interface ObservationLogObserverInput {
	observationScopeId: string;
	now: Date;
	deltaMessages: AgentDbMessage[];
	transcript: string;
	transcriptTokenCount: number;
	observationLogTail: ObservationLogEntry[];
	renderedObservationLogTail: string | null;
	executionCounter?: AgentExecutionCounter;
	telemetry?: BuiltTelemetry;
}

/** Return observation bullets, or exactly NO_OBSERVATIONS when the batch has no new facts. */
export interface ObservationLogObserveResult {
	text: string;
	/** Normalized token usage from the observer LLM call, when the provider reports it. */
	usage?: TokenUsage;
	/** Stable model id string of the model that produced the result. */
	model: string;
}

/**
 * Observe the transcript delta. Returns the observation markdown, or a
 * `{ text, usage, model }` result that also carries token usage for the host
 * to price. String returns are accepted for backward compatibility.
 */
export type ObservationLogObserveFn = (
	input: ObservationLogObserverInput,
) => Promise<string | ObservationLogObserveResult>;

export interface ObservationLogReflectorInput {
	observationScopeId: string;
	now: Date;
	activeObservationLog: ObservationLogEntry[];
	renderedObservationLog: string;
	tokenCount: number;
	tokenBudget: number;
	executionCounter?: AgentExecutionCounter;
	telemetry?: BuiltTelemetry;
}

export interface ObservationLogReflectResult {
	/** JSON string with `drop` and `merge` arrays, using the references supplied in the input. */
	text: string;
	/** Normalized token usage from the reflector LLM call, when the provider reports it. */
	usage?: TokenUsage;
	/** Stable model id string of the model that produced the result. */
	model: string;
}

/**
 * Reflect the active observation log. Returns the reflection JSON, or a
 * `{ text, usage, model }` result that also carries token usage for the host
 * to price. String returns are accepted for backward compatibility.
 */
export type ObservationLogReflectFn = (
	input: ObservationLogReflectorInput,
) => Promise<string | ObservationLogReflectResult>;

/** Reported after an observation-log observer/reflector LLM call completes, for hosts that meter usage. */
export interface MemoryTaskUsageReport {
	task: ObservationLogTaskKind;
	/** Stable model id string (e.g. 'anthropic/claude-sonnet-4-5'). */
	model: string;
	usage: TokenUsage;
	/** Stable per-LLM-call id, generated once at the call site so hosts can build idempotent billing dedupe keys. */
	reportId: string;
}

export interface BuiltObservationLogStore {
	appendObservationLogEntries(rows: NewObservationLogEntry[]): Promise<ObservationLogEntry[]>;
	getActiveObservationLog(
		scope: ObservationLogScope & { limit?: number; order?: 'asc' | 'desc' },
	): Promise<ObservationLogEntry[]>;
	getObservationLog(opts: ObservationLogReadOptions): Promise<ObservationLogEntry[]>;
	dropObservationLogEntries(ids: string[]): Promise<void>;
	supersedeObservationLogEntries(ids: string[], supersededBy: string): Promise<void>;
	applyObservationLogReflection(
		scope: ObservationLogScope,
		reflection: ObservationLogReflection,
	): Promise<ObservationLogReflectionResult>;
}

export interface BuiltObservationLogTaskLockStore {
	acquireObservationLogTaskLock(
		observationScopeId: string,
		taskKind: ObservationLogTaskKind,
		opts: { ttlMs: number; holderId: string },
	): Promise<ObservationLogTaskLockHandle | null>;
	releaseObservationLogTaskLock(handle: ObservationLogTaskLockHandle): Promise<void>;
}

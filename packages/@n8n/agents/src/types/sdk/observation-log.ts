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

export type TokenCounter = (text: string) => number;

export const estimateObservationTokens: TokenCounter = (text) => Math.ceil(text.length / 4);

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

export type ObservationLogObserveFn = (input: ObservationLogObserverInput) => Promise<string>;

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

export type ObservationLogReflectFn = (input: ObservationLogReflectorInput) => Promise<string>;

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

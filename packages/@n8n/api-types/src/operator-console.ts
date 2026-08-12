import type { LogScope } from '@n8n/config';

export const OPERATOR_LOG_LEVELS = ['error', 'warn', 'info', 'debug'] as const;

export type OperatorLogLevel = (typeof OPERATOR_LOG_LEVELS)[number];

export type OperatorLogRole = 'main' | 'worker' | 'webhook';

/** Which capture path produced the record. */
export type OperatorLogStream = 'log' | 'stdout' | 'stderr';

/**
 * Where a record was read from. Live records come from memory or the cross-host
 * stream; `file` records are replayed from the rotated `n8n.log` set and carry
 * only what the winston file transport wrote — no tee'd stdout/stderr.
 */
export type OperatorLogOrigin = 'live' | 'file';

/**
 * One captured log line. The label set is the query surface — everything not
 * labelled here is only reachable by substring search over `message`.
 */
export type OperatorLogRecord = {
	/** Per-host monotonic counter. Doubles as the in-memory cursor. */
	seq: number;
	ts: string;
	hostId: string;
	role: OperatorLogRole;
	stream: OperatorLogStream;
	level: OperatorLogLevel;
	origin: OperatorLogOrigin;
	scope?: LogScope;
	executionId?: string;
	workflowId?: string;
	nodeName?: string;
	message: string;
	meta?: Record<string, unknown>;
	/** Set when the line exceeded the configured max length and was cut. */
	truncated?: boolean;
};

export type OperatorLogBatch = {
	hostId: string;
	records: OperatorLogRecord[];
	/** Lines discarded by the rate cap since the previous batch. */
	dropped: number;
};

export type OperatorLogFilter = {
	minLevel?: OperatorLogLevel;
	scopes?: LogScope[];
	hostIds?: string[];
	roles?: OperatorLogRole[];
	executionId?: string;
	/** Plain substring, case-insensitive. Not a regex — this runs on producers. */
	grep?: string;
};

/** A host currently producing logs, for the console's host picker. */
export type OperatorLogHost = {
	hostId: string;
	role: OperatorLogRole;
	/** ISO timestamp of the most recent record seen from this host. */
	lastSeenAt: string;
};

export type OperatorLogReadResult = {
	records: OperatorLogRecord[];
	/** Opaque — pass back as `since` to continue. Never parse this. */
	nextCursor: string;
	/**
	 * The requested cursor had already been evicted, so records before the first
	 * returned one are gone. The UI must show this rather than implying continuity.
	 */
	gap: boolean;
};

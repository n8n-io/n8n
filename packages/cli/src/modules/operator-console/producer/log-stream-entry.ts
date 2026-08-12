import type { OperatorLogRecord, OperatorLogRole } from '@n8n/api-types';
import { jsonParse } from 'n8n-workflow';

import { LOG_STREAM_KEY } from '../operator-console.constants';

/**
 * Field names of one Redis Stream entry. One entry is one producer batch.
 *
 * `host`, `role` and `ts` are duplicated out of the records blob so the host
 * picker can scan the tail of the stream without parsing (and redacting, and
 * validating) every record it passes over.
 */
export const LOG_STREAM_FIELDS = {
	host: 'host',
	role: 'role',
	ts: 'ts',
	dropped: 'dropped',
	records: 'records',
} as const;

/** Everything about a batch except the records themselves. */
export type LogStreamEntryMeta = {
	hostId: string;
	role: OperatorLogRole;
	/** ISO timestamp of the newest record in the batch. Drives `lastSeenAt`. */
	ts: string;
	/** Lines lost on this host since the previous batch. */
	dropped: number;
};

export type LogStreamEntry = LogStreamEntryMeta & {
	records: OperatorLogRecord[];
};

/**
 * Stream keys are prefixed the same way pubsub channels are, so two deployments
 * pointed at one Redis never see each other's logs.
 */
export function buildLogStreamKey(prefix: string): string {
	return `${prefix}:${LOG_STREAM_KEY}`;
}

/**
 * Flatten a batch into the alternating field/value list `XADD` expects.
 *
 * Records arrive pre-serialized: the producer stringifies each one as it is
 * admitted, both to size the batch and to avoid a second pass at flush time.
 */
export function encodeLogStreamEntry(meta: LogStreamEntryMeta, recordsJson: string): string[] {
	return [
		LOG_STREAM_FIELDS.host,
		meta.hostId,
		LOG_STREAM_FIELDS.role,
		meta.role,
		LOG_STREAM_FIELDS.ts,
		meta.ts,
		LOG_STREAM_FIELDS.dropped,
		String(meta.dropped),
		LOG_STREAM_FIELDS.records,
		recordsJson,
	];
}

/**
 * Parse one entry's flat field list back into a batch. Returns `null` for
 * anything malformed — a single bad entry must not abort a tail, and the stream
 * is a shared key another version of n8n could have written to.
 */
export function decodeLogStreamEntry(fields: string[]): LogStreamEntry | null {
	const raw = new Map<string, string>();
	for (let i = 0; i + 1 < fields.length; i += 2) raw.set(fields[i], fields[i + 1]);

	const hostId = raw.get(LOG_STREAM_FIELDS.host);
	const role = raw.get(LOG_STREAM_FIELDS.role);
	const recordsJson = raw.get(LOG_STREAM_FIELDS.records);

	if (!hostId || !isRole(role) || recordsJson === undefined) return null;

	const records = jsonParse<OperatorLogRecord[] | null>(recordsJson, { fallbackValue: null });
	if (!Array.isArray(records)) return null;

	const dropped = Number(raw.get(LOG_STREAM_FIELDS.dropped) ?? 0);

	return {
		hostId,
		role,
		ts: raw.get(LOG_STREAM_FIELDS.ts) ?? records.at(-1)?.ts ?? new Date().toISOString(),
		dropped: Number.isFinite(dropped) ? dropped : 0,
		records,
	};
}

function isRole(value: string | undefined): value is OperatorLogRole {
	return value === 'main' || value === 'worker' || value === 'webhook';
}

/**
 * Compare two stream IDs (`<ms>-<seq>`) numerically. Lexicographic comparison is
 * wrong here — `'9-0'` sorts after `'10-0'` as a string.
 */
export function compareStreamIds(a: string, b: string): number {
	const [aMs, aSeq] = splitStreamId(a);
	const [bMs, bSeq] = splitStreamId(b);

	if (aMs !== bMs) return aMs < bMs ? -1 : 1;
	if (aSeq !== bSeq) return aSeq < bSeq ? -1 : 1;
	return 0;
}

function splitStreamId(id: string): [bigint, bigint] {
	const [ms, seq] = id.split('-');
	try {
		return [BigInt(ms), seq === undefined ? 0n : BigInt(seq)];
	} catch {
		return [0n, 0n];
	}
}

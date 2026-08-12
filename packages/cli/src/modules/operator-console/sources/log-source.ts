import type {
	OperatorLogBatch,
	OperatorLogFilter,
	OperatorLogHost,
	OperatorLogRecord,
	OperatorLogReadResult,
} from '@n8n/api-types';

export type LogReadOptions = {
	/**
	 * Opaque cursor from a previous read. Each implementation encodes its own
	 * position (ring buffer `seq`, Redis stream ID, file index + line) — callers
	 * must never parse it.
	 */
	since?: string;
	filter: OperatorLogFilter;
	limit: number;
	/**
	 * `forward` resumes after `since` — used to catch up after a reconnect.
	 * `backward` returns the `limit` most recent records at or before `since`,
	 * or the most recent overall when `since` is omitted.
	 *
	 * Defaults to `backward`, because the common case is opening a console and
	 * wanting the newest lines. Starting from the oldest record is never what a
	 * log tail wants, and over a rotated file set it would be pathological.
	 */
	direction?: 'forward' | 'backward';
};

/**
 * Applied by sources that read from a store n8n does not redact on write —
 * notably `n8n.log`, which the untouched winston file transport writes in the
 * clear. Live records are already redacted at ring-buffer entry.
 */
export type RecordRedactor = (record: OperatorLogRecord) => OperatorLogRecord;

export type Unsubscribe = () => void;

/**
 * The single abstraction that makes deployment mode invisible. A single main
 * with no Redis, a queue-mode cluster, and replay from rotated log files all
 * satisfy this interface, so nothing above it — controller, UI, AI tool —
 * branches on how the instance is deployed.
 */
export interface LogSource {
	/**
	 * Historical read. Returns `gap: true` if the cursor was already evicted.
	 *
	 * `nextCursor` continues in the direction just read: a forward page resumes
	 * after the newest record returned, a backward page before the oldest.
	 */
	read(options: LogReadOptions): Promise<OperatorLogReadResult>;

	/**
	 * Live tail. The returned function must be safe to call more than once.
	 * Batching is the source's responsibility — never one callback per line.
	 */
	subscribe(filter: OperatorLogFilter, onBatch: (batch: OperatorLogBatch) => void): Unsubscribe;

	/** Hosts this source has seen recently, for the console's host picker. */
	hosts(): Promise<OperatorLogHost[]>;
}

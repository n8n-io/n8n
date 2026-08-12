import type { OperatorLogFilter, OperatorLogRecord } from '@n8n/api-types';
import { Service } from '@n8n/di';
import { EventEmitter } from 'node:events';

import { OperatorConsoleConfig } from '../operator-console.config';
import { compileFilter } from '../producer/log-filter';

/** A record as handed to the buffer: `seq` and `truncated` are stamped here. */
export type RingBufferEntry = Omit<OperatorLogRecord, 'seq' | 'truncated'>;

export type RingBufferReadResult = {
	records: OperatorLogRecord[];
	/** Highest `seq` examined. Pass back as `since` to continue without rescanning. */
	nextSeq: number;
	/** The requested cursor had already been evicted — records in between are gone. */
	gap: boolean;
};

const RECORD_EVENT = 'record';

const RATE_WINDOW_MS = 1000;

/**
 * Bounded, `seq`-stamped, rate-capped in-memory log buffer — one per process.
 *
 * This is the product, not a cache in front of one: in single-main deployments
 * it is the only thing the live tail reads from. Everything it enforces
 * (capacity, rate cap, line length) is a deliberate backpressure policy with a
 * counter behind it, so the UI can report loss instead of silently truncating.
 */
@Service()
export class LogRingBuffer {
	private readonly capacity: number;

	private readonly rateLimit: number;

	private readonly maxLineBytes: number;

	private readonly slots: Array<OperatorLogRecord | undefined>;

	/** Index the next record will be written to. */
	private writeIndex = 0;

	/** Records currently retained, capped at `capacity`. */
	private count = 0;

	private seq = 0;

	private droppedTotal = 0;

	/** Dropped since the last `takeDropped()`, i.e. not yet reported to a consumer. */
	private droppedUnreported = 0;

	private windowStartedAt = 0;

	private windowCount = 0;

	private readonly emitter = new EventEmitter();

	constructor(config: OperatorConsoleConfig) {
		this.capacity = Math.max(1, Math.floor(config.bufferSize));
		this.rateLimit = Math.floor(config.rateLimit);
		this.maxLineBytes = Math.max(1, Math.floor(config.maxLineBytes));
		this.slots = new Array<OperatorLogRecord | undefined>(this.capacity);

		// One listener per open console plus internal consumers; the default of 10
		// would emit spurious leak warnings, which would themselves be logged.
		this.emitter.setMaxListeners(0);
	}

	/**
	 * Admit a record. Returns the stamped record, or `undefined` when the rate cap
	 * rejected it — in which case the drop is counted, never silent.
	 */
	add(entry: RingBufferEntry): OperatorLogRecord | undefined {
		if (!this.admit()) return undefined;

		const record = this.stamp(entry);

		this.slots[this.writeIndex] = record;
		this.writeIndex = (this.writeIndex + 1) % this.capacity;
		if (this.count < this.capacity) this.count++;

		this.emitter.emit(RECORD_EVENT, record);

		return record;
	}

	/**
	 * Live records, one callback per record. Batching is the caller's job — the
	 * browser hop must never see one message per line.
	 */
	onRecord(listener: (record: OperatorLogRecord) => void): () => void {
		this.emitter.on(RECORD_EVENT, listener);

		let removed = false;
		return () => {
			if (removed) return;
			removed = true;
			this.emitter.off(RECORD_EVENT, listener);
		};
	}

	/**
	 * Records after `since`, oldest first, at most `limit` of them.
	 *
	 * `gap` reports that `since` itself has already been evicted. Returning a
	 * silently-partial window is the failure mode to avoid here: the UI renders
	 * an explicit "older lines evicted" marker instead of implying continuity.
	 */
	readSince(
		since: number | undefined,
		filter: OperatorLogFilter,
		limit: number,
	): RingBufferReadResult {
		const oldest = this.oldestSeq;
		const gap = since !== undefined && oldest !== undefined && oldest > since + 1;

		const records: OperatorLogRecord[] = [];
		let lastScanned = since ?? (oldest === undefined ? this.seq : oldest - 1);
		const matches = compileFilter(filter);

		for (let offset = 0; offset < this.count; offset++) {
			const index = (this.writeIndex - this.count + offset + this.capacity) % this.capacity;
			const record = this.slots[index];
			if (record === undefined) continue;
			if (since !== undefined && record.seq <= since) continue;

			lastScanned = record.seq;

			if (!matches(record)) continue;

			records.push(record);
			if (records.length >= limit) break;
		}

		return { records, nextSeq: lastScanned, gap };
	}

	/** Drops since the previous call. Rides on the next batch, then resets. */
	takeDropped(): number {
		const dropped = this.droppedUnreported;
		this.droppedUnreported = 0;
		return dropped;
	}

	get dropped(): number {
		return this.droppedTotal;
	}

	get size(): number {
		return this.count;
	}

	get newestSeq(): number {
		return this.seq;
	}

	get oldestSeq(): number | undefined {
		return this.count === 0 ? undefined : this.seq - this.count + 1;
	}

	/** Most recently admitted record, for reporting when a host was last seen. */
	get newestRecord(): OperatorLogRecord | undefined {
		if (this.count === 0) return undefined;
		return this.slots[(this.writeIndex - 1 + this.capacity) % this.capacity];
	}

	/**
	 * Fixed-window rate cap. A sliding window would cost per-record bookkeeping
	 * for accuracy nobody needs — this exists to bound the damage from a runaway
	 * logger, not to meter anything.
	 */
	private admit(): boolean {
		if (this.rateLimit <= 0) return true; // cap disabled

		const now = Date.now();

		if (now - this.windowStartedAt >= RATE_WINDOW_MS) {
			this.windowStartedAt = now;
			this.windowCount = 0;
		}

		if (this.windowCount >= this.rateLimit) {
			this.droppedTotal++;
			this.droppedUnreported++;
			return false;
		}

		this.windowCount++;
		return true;
	}

	private stamp(entry: RingBufferEntry): OperatorLogRecord {
		const seq = ++this.seq;
		const { message, truncated } = this.truncate(entry.message);

		return truncated ? { ...entry, seq, message, truncated: true } : { ...entry, seq, message };
	}

	/**
	 * Cut on a byte boundary, not a character one — the cap exists to bound
	 * memory. A multi-byte character straddling the boundary decodes to U+FFFD,
	 * which is fine for a line already marked `truncated`.
	 */
	private truncate(message: string): { message: string; truncated: boolean } {
		if (Buffer.byteLength(message, 'utf8') <= this.maxLineBytes) {
			return { message, truncated: false };
		}

		const cut = Buffer.from(message, 'utf8').subarray(0, this.maxLineBytes).toString('utf8');
		return { message: cut, truncated: true };
	}
}

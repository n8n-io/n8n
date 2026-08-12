import type {
	OperatorLogBatch,
	OperatorLogFilter,
	OperatorLogHost,
	OperatorLogReadResult,
	OperatorLogRecord,
} from '@n8n/api-types';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { UserError } from 'n8n-workflow';

import { LogRingBuffer } from '../capture/ring-buffer';
import { OperatorConsoleConfig } from '../operator-console.config';
import { EMPTY_CURSOR } from '../operator-console.constants';
import { compileFilter } from '../producer/log-filter';
import type { LogReadOptions, LogSource, Unsubscribe } from './log-source';

/** Rough per-record size, used only to decide when a batch is big enough to send. */
function estimateBytes(record: OperatorLogRecord): number {
	return record.message.length + (record.meta === undefined ? 0 : 200);
}

/**
 * `LogSource` over this process's own ring buffer.
 *
 * In a single-main deployment this is the whole feature: no Redis hop, no
 * lease, and `subscribe` is an EventEmitter listener. In queue mode the same
 * source still serves the console-owning main's own lines.
 */
@Service()
export class RingBufferSource implements LogSource {
	constructor(
		private readonly buffer: LogRingBuffer,
		private readonly config: OperatorConsoleConfig,
		private readonly instanceSettings: InstanceSettings,
	) {}

	async read({
		since,
		filter,
		limit,
		direction = 'backward',
	}: LogReadOptions): Promise<OperatorLogReadResult> {
		const cursor = parseCursor(since);

		const { records, nextSeq, gap } =
			direction === 'forward'
				? this.buffer.readSince(cursor, filter, limit)
				: this.buffer.readLatest(cursor, filter, limit);

		return {
			records,
			nextCursor: nextSeq > 0 ? String(nextSeq) : EMPTY_CURSOR,
			gap,
		};
	}

	subscribe(filter: OperatorLogFilter, onBatch: (batch: OperatorLogBatch) => void): Unsubscribe {
		let pending: OperatorLogRecord[] = [];
		let pendingBytes = 0;
		let timer: NodeJS.Timeout | undefined;

		// Compiled once, not per record: this runs on every captured line.
		const matches = compileFilter(filter);

		const flush = () => {
			if (timer !== undefined) {
				clearTimeout(timer);
				timer = undefined;
			}

			// Drops are reported even when no record survived the filter — a silent
			// gap is exactly what the counter exists to prevent. The count is
			// per-buffer, so with several concurrent subscribers each drop is
			// reported to whichever one flushes first.
			const dropped = this.buffer.takeDropped();
			if (pending.length === 0 && dropped === 0) return;

			const records = pending;
			pending = [];
			pendingBytes = 0;

			onBatch({ hostId: this.instanceSettings.hostId, records, dropped });
		};

		const stopListening = this.buffer.onRecord((record) => {
			if (!matches(record)) return;

			pending.push(record);
			pendingBytes += estimateBytes(record);

			if (pendingBytes >= this.config.batchMaxBytes) {
				flush();
				return;
			}

			if (timer === undefined) {
				timer = setTimeout(flush, this.config.batchIntervalMs);
				timer.unref();
			}
		});

		return () => {
			stopListening();
			if (timer !== undefined) {
				clearTimeout(timer);
				timer = undefined;
			}
			pending = [];
			pendingBytes = 0;
		};
	}

	async hosts(): Promise<OperatorLogHost[]> {
		return [
			{
				hostId: this.instanceSettings.hostId,
				role: this.instanceSettings.instanceType,
				lastSeenAt: this.buffer.newestRecord?.ts ?? new Date().toISOString(),
			},
		];
	}
}

/** The ring buffer's cursor is its `seq`, stringified. */
function parseCursor(since: string | undefined): number | undefined {
	if (since === undefined || since === EMPTY_CURSOR) return undefined;

	const seq = Number(since);
	if (!Number.isSafeInteger(seq) || seq < 0) {
		throw new UserError('Invalid log cursor', { extra: { since } });
	}

	return seq;
}

import { mock } from 'vitest-mock-extended';

import type { OperatorConsoleConfig } from '../../operator-console.config';
import type { RingBufferEntry } from '../ring-buffer';
import { LogRingBuffer } from '../ring-buffer';

const config = (overrides: Partial<OperatorConsoleConfig> = {}) =>
	mock<OperatorConsoleConfig>({
		bufferSize: 100,
		rateLimit: 0,
		maxLineBytes: 8192,
		...overrides,
	});

const entry = (overrides: Partial<RingBufferEntry> = {}): RingBufferEntry => ({
	ts: '2026-08-12T00:00:00.000Z',
	hostId: 'main-1',
	role: 'main',
	stream: 'log',
	level: 'info',
	origin: 'live',
	message: 'hello',
	...overrides,
});

const seqs = (records: Array<{ seq: number }>) => records.map((record) => record.seq);

describe('LogRingBuffer', () => {
	describe('seq stamping', () => {
		it('stamps a per-host monotonic seq starting at 1', () => {
			const buffer = new LogRingBuffer(config());

			expect(buffer.add(entry())?.seq).toBe(1);
			expect(buffer.add(entry())?.seq).toBe(2);
			expect(buffer.newestSeq).toBe(2);
			expect(buffer.oldestSeq).toBe(1);
		});

		it('reports no oldest seq while empty', () => {
			const buffer = new LogRingBuffer(config());

			expect(buffer.oldestSeq).toBeUndefined();
			expect(buffer.newestRecord).toBeUndefined();
		});
	});

	describe('eviction', () => {
		it('retains only the most recent `bufferSize` records', () => {
			const buffer = new LogRingBuffer(config({ bufferSize: 3 }));

			for (let i = 1; i <= 5; i++) buffer.add(entry({ message: `line ${i}` }));

			expect(buffer.size).toBe(3);
			expect(buffer.oldestSeq).toBe(3);
			expect(buffer.newestSeq).toBe(5);

			const { records } = buffer.readSince(undefined, {}, 10);
			expect(seqs(records)).toEqual([3, 4, 5]);
			expect(records.map((r) => r.message)).toEqual(['line 3', 'line 4', 'line 5']);
		});

		it('keeps seq monotonic across eviction', () => {
			const buffer = new LogRingBuffer(config({ bufferSize: 2 }));

			for (let i = 0; i < 6; i++) buffer.add(entry());

			expect(buffer.newestRecord?.seq).toBe(6);
		});
	});

	describe('gap detection', () => {
		it('reports a gap when the requested cursor has been evicted', () => {
			const buffer = new LogRingBuffer(config({ bufferSize: 3 }));

			for (let i = 0; i < 5; i++) buffer.add(entry());

			const { records, gap } = buffer.readSince(1, {}, 10);

			expect(gap).toBe(true);
			expect(seqs(records)).toEqual([3, 4, 5]);
		});

		it('reports no gap when the cursor is contiguous with what is retained', () => {
			const buffer = new LogRingBuffer(config({ bufferSize: 3 }));

			for (let i = 0; i < 5; i++) buffer.add(entry());

			// Oldest retained is 3, so continuing after 2 loses nothing.
			expect(buffer.readSince(2, {}, 10).gap).toBe(false);
		});

		it('reports no gap when no cursor was supplied', () => {
			const buffer = new LogRingBuffer(config({ bufferSize: 2 }));

			for (let i = 0; i < 5; i++) buffer.add(entry());

			expect(buffer.readSince(undefined, {}, 10).gap).toBe(false);
		});

		it('returns nothing and no gap when caught up', () => {
			const buffer = new LogRingBuffer(config());

			buffer.add(entry());
			buffer.add(entry());

			const result = buffer.readSince(2, {}, 10);

			expect(result.records).toEqual([]);
			expect(result.gap).toBe(false);
			expect(result.nextSeq).toBe(2);
		});
	});

	describe('reading', () => {
		it('honours `limit` and returns a cursor that resumes without rescanning', () => {
			const buffer = new LogRingBuffer(config());

			for (let i = 0; i < 5; i++) buffer.add(entry());

			const first = buffer.readSince(undefined, {}, 2);
			expect(seqs(first.records)).toEqual([1, 2]);
			expect(first.nextSeq).toBe(2);

			const second = buffer.readSince(first.nextSeq, {}, 2);
			expect(seqs(second.records)).toEqual([3, 4]);
		});

		it('advances the cursor past records the filter rejected', () => {
			const buffer = new LogRingBuffer(config());

			buffer.add(entry({ level: 'debug' }));
			buffer.add(entry({ level: 'debug' }));
			buffer.add(entry({ level: 'error' }));

			const { records, nextSeq } = buffer.readSince(undefined, { minLevel: 'error' }, 10);

			expect(seqs(records)).toEqual([3]);
			expect(nextSeq).toBe(3);
		});
	});

	describe('rate cap', () => {
		beforeEach(() => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2026-08-12T00:00:00.000Z'));
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('drops beyond `rateLimit` lines per second and counts the drops', () => {
			const buffer = new LogRingBuffer(config({ rateLimit: 2 }));

			const admitted = [
				buffer.add(entry()),
				buffer.add(entry()),
				buffer.add(entry()),
				buffer.add(entry()),
				buffer.add(entry()),
			];

			expect(admitted.filter(Boolean)).toHaveLength(2);
			expect(buffer.size).toBe(2);
			expect(buffer.dropped).toBe(3);
		});

		it('reports drops once, then resets', () => {
			const buffer = new LogRingBuffer(config({ rateLimit: 1 }));

			buffer.add(entry());
			buffer.add(entry());
			buffer.add(entry());

			expect(buffer.takeDropped()).toBe(2);
			expect(buffer.takeDropped()).toBe(0);
			// The running total is not reset by reporting.
			expect(buffer.dropped).toBe(2);
		});

		it('admits again once the window rolls over', () => {
			const buffer = new LogRingBuffer(config({ rateLimit: 1 }));

			expect(buffer.add(entry())).toBeDefined();
			expect(buffer.add(entry())).toBeUndefined();

			vi.advanceTimersByTime(1000);

			expect(buffer.add(entry())).toBeDefined();
		});

		it('treats a non-positive limit as no cap', () => {
			const buffer = new LogRingBuffer(config({ rateLimit: 0 }));

			for (let i = 0; i < 50; i++) buffer.add(entry());

			expect(buffer.size).toBe(50);
			expect(buffer.dropped).toBe(0);
		});

		it('does not emit dropped records to subscribers', () => {
			const buffer = new LogRingBuffer(config({ rateLimit: 1 }));
			const listener = vi.fn();
			buffer.onRecord(listener);

			buffer.add(entry());
			buffer.add(entry());

			expect(listener).toHaveBeenCalledTimes(1);
		});
	});

	describe('truncation', () => {
		it('cuts lines over `maxLineBytes` and flags them', () => {
			const buffer = new LogRingBuffer(config({ maxLineBytes: 5 }));

			const record = buffer.add(entry({ message: 'abcdefgh' }));

			expect(record?.message).toBe('abcde');
			expect(record?.truncated).toBe(true);
		});

		it('leaves lines within the cap untouched and unflagged', () => {
			const buffer = new LogRingBuffer(config({ maxLineBytes: 5 }));

			const record = buffer.add(entry({ message: 'abcde' }));

			expect(record?.message).toBe('abcde');
			expect(record?.truncated).toBeUndefined();
		});

		it('measures bytes, not characters', () => {
			const buffer = new LogRingBuffer(config({ maxLineBytes: 4 }));

			// Three 2-byte characters exceed a 4-byte cap even though `length` is 3.
			const record = buffer.add(entry({ message: 'ααα' }));

			expect(record?.truncated).toBe(true);
			expect(Buffer.byteLength(record?.message ?? '', 'utf8')).toBeLessThanOrEqual(4);
		});
	});

	describe('onRecord', () => {
		it('emits admitted records and stops on unsubscribe', () => {
			const buffer = new LogRingBuffer(config());
			const listener = vi.fn();

			const unsubscribe = buffer.onRecord(listener);
			buffer.add(entry({ message: 'first' }));

			expect(listener).toHaveBeenCalledTimes(1);
			expect(listener.mock.calls[0][0]).toMatchObject({ seq: 1, message: 'first' });

			unsubscribe();
			unsubscribe(); // must be safe to call twice
			buffer.add(entry());

			expect(listener).toHaveBeenCalledTimes(1);
		});
	});
});

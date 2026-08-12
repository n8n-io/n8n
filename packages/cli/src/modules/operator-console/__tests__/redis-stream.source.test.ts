import type { OperatorLogBatch, OperatorLogRecord } from '@n8n/api-types';
import { mockLogger } from '@n8n/backend-test-utils';
import type { ExecutionsConfig, GlobalConfig } from '@n8n/config';
import type { Redis as SingleNodeClient } from 'ioredis';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { RedisClientService } from '@/services/redis-client.service';

import { encodeLogStreamEntry } from '../producer/log-stream-entry';
import { RedisStreamSource } from '../sources/redis-stream.source';

const STREAM_KEY = 'n8n:n8n:logs';

const record = (overrides: Partial<OperatorLogRecord> = {}): OperatorLogRecord => ({
	seq: 1,
	ts: '2026-08-12T10:00:00.000Z',
	hostId: 'worker-1',
	role: 'worker',
	stream: 'log',
	level: 'info',
	origin: 'live',
	message: 'hello',
	...overrides,
});

/** Build a raw stream entry the way the producer would have written it. */
const entry = (
	id: string,
	records: OperatorLogRecord[],
	{ hostId = 'worker-1', role = 'worker', dropped = 0 } = {},
): [string, string[]] => [
	id,
	encodeLogStreamEntry(
		{ hostId, role: role as OperatorLogRecord['role'], ts: '2026-08-12T10:00:00.000Z', dropped },
		JSON.stringify(records),
	),
];

describe('RedisStreamSource', () => {
	// ioredis' stream commands are heavily overloaded, so they are stubbed
	// individually rather than through the generated client mock.
	let xrange: Mock;
	let xrevrange: Mock;
	let xread: Mock;
	let source: RedisStreamSource;

	const setup = ({ mode = 'queue' }: { mode?: 'queue' | 'regular' } = {}) => {
		xrange = vi.fn();
		xrevrange = vi.fn();
		xread = vi.fn();
		const client = Object.assign(mock<SingleNodeClient>(), { xrange, xrevrange, xread });

		source = new RedisStreamSource(
			mockLogger(),
			mock<RedisClientService>({ createClient: () => client }),
			mock<ExecutionsConfig>({ mode }),
			mock<GlobalConfig>({ redis: { prefix: 'n8n' } }),
		);
	};

	beforeEach(() => setup());

	afterEach(() => source.shutdown());

	describe('read', () => {
		it('should return records from the start when no cursor is given', async () => {
			xrange.mockResolvedValueOnce([entry('1-0', [record({ message: 'a' })])]);
			xrange.mockResolvedValueOnce([]);

			const result = await source.read({ filter: {}, limit: 10 });

			expect(result.records.map((r) => r.message)).toEqual(['a']);
			expect(result.nextCursor).toBe('1-0');
			expect(result.gap).toBe(false);
			expect(xrange).toHaveBeenCalledWith(STREAM_KEY, '-', '+', 'COUNT', 11);
		});

		it('should skip the cursor entry itself when resuming', async () => {
			xrange.mockResolvedValueOnce([entry('1-0', [record({ message: 'oldest' })])]); // gap probe
			xrange.mockResolvedValueOnce([
				entry('1-0', [record({ message: 'already seen' })]),
				entry('2-0', [record({ message: 'new' })]),
			]);
			xrange.mockResolvedValueOnce([entry('2-0', [record({ message: 'new' })])]);

			const result = await source.read({ since: '1-0', filter: {}, limit: 10 });

			expect(result.records.map((r) => r.message)).toEqual(['new']);
			expect(result.nextCursor).toBe('2-0');
		});

		it('should report a gap when the cursor predates the oldest surviving entry', async () => {
			xrange.mockResolvedValueOnce([entry('50-0', [record()])]); // gap probe
			xrange.mockResolvedValueOnce([entry('50-0', [record({ message: 'survivor' })])]);
			xrange.mockResolvedValueOnce([]);

			const result = await source.read({ since: '9-0', filter: {}, limit: 10 });

			expect(result.gap).toBe(true);
			expect(result.records.map((r) => r.message)).toEqual(['survivor']);
		});

		it('should not report a gap when the cursor is still in the window', async () => {
			xrange.mockResolvedValueOnce([entry('10-0', [record()])]); // gap probe
			xrange.mockResolvedValueOnce([entry('10-0', [record()])]);

			const result = await source.read({ since: '10-0', filter: {}, limit: 10 });

			expect(result.gap).toBe(false);
		});

		it('should compare stream ids numerically, not lexicographically', async () => {
			xrange.mockResolvedValueOnce([entry('9-0', [record()])]); // gap probe
			xrange.mockResolvedValue([]);

			// '10-0' > '9-0' numerically, even though it sorts earlier as a string.
			const result = await source.read({ since: '10-0', filter: {}, limit: 10 });

			expect(result.gap).toBe(false);
		});

		it('should apply the filter to records read back from the stream', async () => {
			xrange.mockResolvedValueOnce([
				entry('1-0', [
					record({ level: 'error', message: 'boom' }),
					record({ level: 'debug', message: 'noise' }),
				]),
			]);
			xrange.mockResolvedValueOnce([]);

			const result = await source.read({ filter: { minLevel: 'warn' }, limit: 10 });

			expect(result.records.map((r) => r.message)).toEqual(['boom']);
		});

		it('should stop at the limit on an entry boundary', async () => {
			xrange.mockResolvedValueOnce([
				entry('1-0', [record({ seq: 1 }), record({ seq: 2 })]),
				entry('2-0', [record({ seq: 3 })]),
			]);

			const result = await source.read({ filter: {}, limit: 2 });

			expect(result.records).toHaveLength(2);
			expect(result.nextCursor).toBe('1-0'); // the entry we fully delivered
		});

		it('should tolerate a malformed entry rather than failing the read', async () => {
			xrange.mockResolvedValueOnce([
				['1-0', ['host', 'worker-1', 'role', 'worker', 'records', 'not json']],
				entry('2-0', [record({ message: 'fine' })]),
			]);
			xrange.mockResolvedValueOnce([]);

			const result = await source.read({ filter: {}, limit: 10 });

			expect(result.records.map((r) => r.message)).toEqual(['fine']);
			expect(result.nextCursor).toBe('2-0');
		});

		it('should return an empty result outside queue mode', async () => {
			setup({ mode: 'regular' });

			const result = await source.read({ filter: {}, limit: 10 });

			expect(result).toEqual({ records: [], nextCursor: '', gap: false });
			expect(xrange).not.toHaveBeenCalled();
		});
	});

	describe('subscribe', () => {
		/** First read yields entries; the next parks, as a real `BLOCK` would. */
		const tailOnce = (entries: Array<[string, string[]]>) => {
			let served = false;
			xread.mockImplementation(async () => {
				if (served) return await new Promise(() => {});
				served = true;
				return [[STREAM_KEY, entries]];
			});
		};

		it('should emit one batch per stream entry, never one per line', async () => {
			tailOnce([entry('1-0', [record({ seq: 1 }), record({ seq: 2 }), record({ seq: 3 })])]);

			const batches: OperatorLogBatch[] = [];
			const unsubscribe = source.subscribe({}, (batch) => batches.push(batch));

			await vi.waitFor(() => expect(batches).toHaveLength(1));
			unsubscribe();

			expect(batches[0].records).toHaveLength(3);
			expect(batches[0].hostId).toBe('worker-1');
		});

		it('should tail from the current end of the stream', async () => {
			tailOnce([]);

			const unsubscribe = source.subscribe({}, () => {});
			await vi.waitFor(() => expect(xread).toHaveBeenCalled());
			unsubscribe();

			expect(xread).toHaveBeenCalledWith('BLOCK', expect.any(Number), 'STREAMS', STREAM_KEY, '$');
		});

		it('should apply each subscriber its own filter', async () => {
			tailOnce([
				entry('1-0', [
					record({ level: 'error', message: 'boom' }),
					record({ level: 'info', message: 'noise' }),
				]),
			]);

			const errorsOnly: OperatorLogBatch[] = [];
			const everything: OperatorLogBatch[] = [];

			const unsubA = source.subscribe({ minLevel: 'error' }, (b) => errorsOnly.push(b));
			const unsubB = source.subscribe({}, (b) => everything.push(b));

			await vi.waitFor(() => expect(everything).toHaveLength(1));
			unsubA();
			unsubB();

			expect(errorsOnly[0].records.map((r) => r.message)).toEqual(['boom']);
			expect(everything[0].records).toHaveLength(2);
		});

		it('should forward a drop-only batch so the console can mark the loss', async () => {
			tailOnce([entry('1-0', [], { dropped: 17 })]);

			const batches: OperatorLogBatch[] = [];
			const unsubscribe = source.subscribe({}, (batch) => batches.push(batch));

			await vi.waitFor(() => expect(batches).toHaveLength(1));
			unsubscribe();

			expect(batches[0]).toEqual({ hostId: 'worker-1', records: [], dropped: 17 });
		});

		it('should be a no-op outside queue mode', () => {
			setup({ mode: 'regular' });

			const unsubscribe = source.subscribe({}, () => {});
			unsubscribe();

			expect(xread).not.toHaveBeenCalled();
		});

		it('should tolerate being unsubscribed more than once', async () => {
			tailOnce([]);

			const unsubscribe = source.subscribe({}, () => {});
			unsubscribe();

			expect(unsubscribe).not.toThrow();
		});
	});

	describe('hosts', () => {
		it('should derive the most recent sighting per host from the stream tail', async () => {
			xrevrange.mockResolvedValue([
				entry('3-0', [], { hostId: 'worker-1', role: 'worker' }),
				entry('2-0', [], { hostId: 'main-1', role: 'main' }),
				entry('1-0', [], { hostId: 'worker-1', role: 'worker' }),
			]);

			const hosts = await source.hosts();

			expect(hosts).toEqual([
				{ hostId: 'worker-1', role: 'worker', lastSeenAt: '2026-08-12T10:00:00.000Z' },
				{ hostId: 'main-1', role: 'main', lastSeenAt: '2026-08-12T10:00:00.000Z' },
			]);
			expect(xrevrange).toHaveBeenCalledWith(STREAM_KEY, '+', '-', 'COUNT', 500);
		});

		it('should skip entries missing host metadata', async () => {
			xrevrange.mockResolvedValue([
				['1-0', ['records', '[]']],
				entry('2-0', [], { hostId: 'main-1', role: 'main' }),
			]);

			const hosts = await source.hosts();

			expect(hosts.map((h) => h.hostId)).toEqual(['main-1']);
		});

		it('should return nothing outside queue mode', async () => {
			setup({ mode: 'regular' });

			expect(await source.hosts()).toEqual([]);
			expect(xrevrange).not.toHaveBeenCalled();
		});
	});
});

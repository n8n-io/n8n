import type { OperatorLogRecord } from '@n8n/api-types';
import { mockLogger } from '@n8n/backend-test-utils';
import type { ExecutionsConfig, GlobalConfig } from '@n8n/config';
import type { Redis as SingleNodeClient } from 'ioredis';
import type { InstanceSettings } from 'n8n-core';
import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';

import type { Publisher } from '@/scaling/pubsub/publisher.service';

import type { OperatorConsoleConfig } from '../operator-console.config';
import { LOG_STREAM_FIELDS } from '../producer/log-stream-entry';
import type { LogRecordPort } from '../producer/log-producer.service';
import { LogProducerService } from '../producer/log-producer.service';

const BATCH_INTERVAL_MS = 200;
const LEASE_TTL_MS = 30_000;

/** Stand-in for the capture layer's ring buffer. */
class FakeRingBuffer implements LogRecordPort {
	dropped = 0;

	private readonly listeners = new Set<(record: OperatorLogRecord) => void>();

	onRecord(listener: (record: OperatorLogRecord) => void) {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}

	emit(record: OperatorLogRecord) {
		for (const listener of this.listeners) listener(record);
	}

	get listenerCount() {
		return this.listeners.size;
	}
}

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

/** Read the `XADD` calls back as decoded `{ dropped, records }` batches. */
const publishedBatches = (client: MockProxy<SingleNodeClient>) =>
	client.xadd.mock.calls.map((call) => {
		const fields = call.slice(5).map(String);
		const byName = new Map<string, string>();
		for (let i = 0; i + 1 < fields.length; i += 2) byName.set(fields[i], fields[i + 1]);

		return {
			hostId: byName.get(LOG_STREAM_FIELDS.host),
			role: byName.get(LOG_STREAM_FIELDS.role),
			dropped: Number(byName.get(LOG_STREAM_FIELDS.dropped)),
			records: JSON.parse(byName.get(LOG_STREAM_FIELDS.records) ?? '[]') as OperatorLogRecord[],
		};
	});

describe('LogProducerService', () => {
	let client: MockProxy<SingleNodeClient>;
	let buffer: FakeRingBuffer;
	let producer: LogProducerService;

	const setup = ({
		mode = 'queue',
		batchMaxBytes = 65_536,
	}: { mode?: 'queue' | 'regular'; batchMaxBytes?: number } = {}) => {
		client = mock<SingleNodeClient>();
		client.xadd.mockResolvedValue('1-0');

		buffer = new FakeRingBuffer();

		producer = new LogProducerService(
			mockLogger(),
			mock<InstanceSettings>({ hostId: 'worker-1', instanceType: 'worker' }),
			mock<Publisher>({ getClient: () => client }),
			mock<OperatorConsoleConfig>({
				batchIntervalMs: BATCH_INTERVAL_MS,
				batchMaxBytes,
				streamMaxLen: 50_000,
				leaseTtlMs: LEASE_TTL_MS,
			}),
			mock<ExecutionsConfig>({ mode }),
			mock<GlobalConfig>({ redis: { prefix: 'n8n' } }),
		);

		producer.attach(buffer);
	};

	const arm = (filter = {}, ttlMs = LEASE_TTL_MS) => producer.handleLogTailStart({ filter, ttlMs });

	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-08-12T10:00:00.000Z'));
		setup();
	});

	afterEach(() => {
		producer.detach();
		vi.useRealTimers();
	});

	describe('lease', () => {
		it('should publish nothing at all without a lease', async () => {
			buffer.emit(record());
			buffer.emit(record());

			await vi.advanceTimersByTimeAsync(BATCH_INTERVAL_MS * 5);

			expect(client.xadd).not.toHaveBeenCalled();
		});

		it('should publish once a lease is armed', async () => {
			arm();
			buffer.emit(record({ message: 'after lease' }));

			await vi.advanceTimersByTimeAsync(BATCH_INTERVAL_MS);

			const [batch] = publishedBatches(client);
			expect(batch.records).toHaveLength(1);
			expect(batch.records[0].message).toBe('after lease');
			expect(batch.hostId).toBe('worker-1');
			expect(batch.role).toBe('worker');
		});

		it('should stop publishing once the lease expires', async () => {
			arm({}, 1000);

			buffer.emit(record());
			await vi.advanceTimersByTimeAsync(BATCH_INTERVAL_MS);
			expect(client.xadd).toHaveBeenCalledTimes(1);

			await vi.advanceTimersByTimeAsync(1000);
			client.xadd.mockClear();

			buffer.emit(record());
			await vi.advanceTimersByTimeAsync(BATCH_INTERVAL_MS * 5);

			expect(client.xadd).not.toHaveBeenCalled();
			expect(producer.hasActiveLease()).toBe(false);
		});

		it('should keep publishing when the lease is renewed before it expires', async () => {
			arm({}, 1000);

			await vi.advanceTimersByTimeAsync(600);
			arm({}, 1000); // heartbeat

			await vi.advanceTimersByTimeAsync(600);
			expect(producer.hasActiveLease()).toBe(true);

			buffer.emit(record());
			await vi.advanceTimersByTimeAsync(BATCH_INTERVAL_MS);

			expect(client.xadd).toHaveBeenCalledTimes(1);
		});

		it('should still ship lines admitted just before the lease lapsed', async () => {
			arm({}, BATCH_INTERVAL_MS / 2);
			buffer.emit(record({ message: 'last gasp' }));

			await vi.advanceTimersByTimeAsync(BATCH_INTERVAL_MS);

			const [batch] = publishedBatches(client);
			expect(batch.records[0].message).toBe('last gasp');
		});

		it('should adopt the filter carried by the newest lease', async () => {
			arm({ grep: 'alpha' });
			buffer.emit(record({ message: 'alpha' }));
			buffer.emit(record({ message: 'beta' }));

			arm({ grep: 'beta' });
			buffer.emit(record({ message: 'alpha again' }));
			buffer.emit(record({ message: 'beta again' }));

			await vi.advanceTimersByTimeAsync(BATCH_INTERVAL_MS);

			const messages = publishedBatches(client)[0].records.map((r) => r.message);
			expect(messages).toEqual(['alpha', 'beta again']);
		});

		it('should be inert outside queue mode', async () => {
			setup({ mode: 'regular' });

			arm();
			buffer.emit(record());
			await vi.advanceTimersByTimeAsync(BATCH_INTERVAL_MS * 5);

			expect(client.xadd).not.toHaveBeenCalled();
			expect(buffer.listenerCount).toBe(0);
		});
	});

	describe('producer-side filtering', () => {
		it('should never ship a line the filter excludes', async () => {
			arm({ minLevel: 'warn', grep: 'boom' });

			buffer.emit(record({ level: 'error', message: 'boom happened' }));
			buffer.emit(record({ level: 'info', message: 'boom happened' })); // level too low
			buffer.emit(record({ level: 'error', message: 'all fine' })); // no grep hit

			await vi.advanceTimersByTimeAsync(BATCH_INTERVAL_MS);

			const [batch] = publishedBatches(client);
			expect(batch.records).toHaveLength(1);
			expect(batch.records[0].message).toBe('boom happened');
		});

		it('should not publish at all when nothing matches', async () => {
			arm({ grep: 'nothing matches this' });

			buffer.emit(record());
			await vi.advanceTimersByTimeAsync(BATCH_INTERVAL_MS * 3);

			expect(client.xadd).not.toHaveBeenCalled();
		});
	});

	describe('batching', () => {
		it('should coalesce an interval of lines into one XADD', async () => {
			arm();

			for (let seq = 0; seq < 25; seq++) buffer.emit(record({ seq }));

			await vi.advanceTimersByTimeAsync(BATCH_INTERVAL_MS);

			expect(client.xadd).toHaveBeenCalledTimes(1);
			expect(publishedBatches(client)[0].records).toHaveLength(25);
		});

		it('should flush on size before the interval elapses', async () => {
			setup({ batchMaxBytes: 300 });
			arm();

			buffer.emit(record({ message: 'x'.repeat(400) }));
			await vi.advanceTimersByTimeAsync(0);

			expect(client.xadd).toHaveBeenCalledTimes(1);
		});

		it('should start a new batch after a size flush', async () => {
			setup({ batchMaxBytes: 300 });
			arm();

			buffer.emit(record({ message: 'x'.repeat(400) }));
			buffer.emit(record({ message: 'small' }));
			await vi.advanceTimersByTimeAsync(BATCH_INTERVAL_MS);

			const batches = publishedBatches(client);
			expect(batches).toHaveLength(2);
			expect(batches[1].records.map((r) => r.message)).toEqual(['small']);
		});

		it('should not publish empty batches on an idle interval', async () => {
			arm();

			await vi.advanceTimersByTimeAsync(BATCH_INTERVAL_MS * 10);

			expect(client.xadd).not.toHaveBeenCalled();
		});

		it('should apply MAXLEN ~ so the stream stays bounded', async () => {
			arm();
			buffer.emit(record());

			await vi.advanceTimersByTimeAsync(BATCH_INTERVAL_MS);

			expect(client.xadd).toHaveBeenCalledWith(
				'n8n:n8n:logs',
				'MAXLEN',
				'~',
				50_000,
				'*',
				...Array.from({ length: 10 }, () => expect.anything()),
			);
		});
	});

	describe('drop accounting', () => {
		it('should carry the per-batch drop delta, not the running total', async () => {
			arm();

			buffer.dropped = 5;
			buffer.emit(record());
			await vi.advanceTimersByTimeAsync(BATCH_INTERVAL_MS);

			buffer.dropped = 12;
			buffer.emit(record());
			await vi.advanceTimersByTimeAsync(BATCH_INTERVAL_MS);

			expect(publishedBatches(client).map((b) => b.dropped)).toEqual([5, 7]);
		});

		it('should publish a records-free batch when only drops happened', async () => {
			arm({ grep: 'never matches' });

			buffer.dropped = 42;
			await vi.advanceTimersByTimeAsync(BATCH_INTERVAL_MS);

			const [batch] = publishedBatches(client);
			expect(batch.records).toHaveLength(0);
			expect(batch.dropped).toBe(42);
		});

		it('should ignore drops from before anyone was watching', async () => {
			buffer.dropped = 900;

			arm();
			buffer.emit(record());
			await vi.advanceTimersByTimeAsync(BATCH_INTERVAL_MS);

			expect(publishedBatches(client)[0].dropped).toBe(0);
		});

		it('should count a failed publish as dropped on the next batch', async () => {
			arm();
			client.xadd.mockRejectedValueOnce(new Error('Redis unreachable'));

			buffer.emit(record());
			buffer.emit(record());
			await vi.advanceTimersByTimeAsync(BATCH_INTERVAL_MS);

			buffer.emit(record());
			await vi.advanceTimersByTimeAsync(BATCH_INTERVAL_MS);

			const batches = publishedBatches(client);
			expect(batches).toHaveLength(2);
			expect(batches[1].dropped).toBe(2);
		});
	});

	describe('detach', () => {
		it('should unsubscribe from the buffer and go quiet', async () => {
			arm();
			producer.detach();

			expect(buffer.listenerCount).toBe(0);

			buffer.emit(record());
			await vi.advanceTimersByTimeAsync(BATCH_INTERVAL_MS * 5);

			expect(client.xadd).not.toHaveBeenCalled();
		});
	});
});

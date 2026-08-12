import type { OperatorLogRecord, OperatorLogSearchResult } from '@n8n/api-types';
import type { ExecutionsConfig, GlobalConfig } from '@n8n/config';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { InstanceAiLogQueryAdapter } from '../ai/log-query.adapter';
import type { DistributedSearchService } from '../consumer/distributed-search.service';
import { LogRingBuffer } from '../capture/ring-buffer';
import { OperatorConsoleConfig } from '../operator-console.config';
import { CompositeLogSource } from '../sources/composite-log.source';
import type { LogFileSource } from '../sources/log-file.source';
import type { RedisStreamSource } from '../sources/redis-stream.source';
import { RingBufferSource } from '../sources/ring-buffer.source';

const HOST = 'main-1';

const at = (minute: number) => `2026-08-12T10:${String(minute).padStart(2, '0')}:00.000Z`;

const entry = (message: string, minute: number, hostId = HOST) => ({
	ts: at(minute),
	hostId,
	role: 'main' as const,
	stream: 'log' as const,
	level: 'info' as const,
	origin: 'live' as const,
	message,
});

/**
 * Wires the real buffer, composite source and adapter together. The unit tests
 * on either side both passed while `readContext` addressed records by `seq`,
 * which is not comparable across storage tiers — only an end-to-end wiring
 * catches that.
 */
describe('InstanceAiLogQueryAdapter', () => {
	let buffer: LogRingBuffer;
	let adapter: InstanceAiLogQueryAdapter;

	beforeEach(() => {
		const config = new OperatorConsoleConfig();
		const instanceSettings = mock<InstanceSettings>({ hostId: HOST, instanceType: 'main' });

		buffer = new LogRingBuffer(config);

		const source = new CompositeLogSource(
			new RingBufferSource(buffer, config, instanceSettings),
			mock<RedisStreamSource>({
				read: async () => ({ records: [], nextCursor: '', gap: false }),
			}),
			mock<LogFileSource>({
				read: async () => ({ records: [], nextCursor: '', gap: false }),
			}),
			mock<GlobalConfig>({ executions: { mode: 'regular' } as ExecutionsConfig }),
		);

		adapter = new InstanceAiLogQueryAdapter(
			source,
			config,
			// Regular mode: the adapter must not fan out, so the distributed search
			// is never consulted. A throwing mock would surface an accidental call.
			mock<DistributedSearchService>(),
			mock<ExecutionsConfig>({ mode: 'regular' }),
		);
	});

	const messages = (records: OperatorLogRecord[]) => records.map((r) => r.message);

	describe('read', () => {
		it('returns matching records, newest last', async () => {
			buffer.add(entry('first', 1));
			buffer.add(entry('second', 2));

			const page = await adapter.read({ filter: {}, limit: 10 });

			expect(messages(page.records)).toEqual(['first', 'second']);
		});

		it('never exceeds the requested limit even if a source overshoots', async () => {
			// The port promises this: the tool sizes its snapshot cap on it.
			for (let i = 1; i <= 10; i++) buffer.add(entry(`line ${i}`, i));

			const page = await adapter.read({ filter: {}, limit: 3 });

			expect(page.records).toHaveLength(3);
		});

		it('attests that records were redacted', async () => {
			buffer.add(entry('anything', 1));

			const page = await adapter.read({ filter: {}, limit: 10 });

			expect(page.redaction.applied).toBe(true);
			expect(page.redaction.redactor).toBeTruthy();
		});
	});

	describe('read in queue mode', () => {
		/** Builds an adapter whose fan-out returns `result`. */
		const queueModeAdapter = (result: Partial<OperatorLogSearchResult>) => {
			const config = new OperatorConsoleConfig();
			const instanceSettings = mock<InstanceSettings>({ hostId: HOST, instanceType: 'main' });
			const source = new CompositeLogSource(
				new RingBufferSource(buffer, config, instanceSettings),
				mock<RedisStreamSource>({
					read: async () => ({ records: [], nextCursor: '', gap: false }),
					hosts: async () => [
						{ hostId: HOST, role: 'main', lastSeenAt: at(1) },
						{ hostId: 'worker-9', role: 'worker', lastSeenAt: at(1) },
					],
				}),
				mock<LogFileSource>({
					read: async () => ({ records: [], nextCursor: '', gap: false }),
					hosts: async () => [],
				}),
				mock<GlobalConfig>({ executions: { mode: 'queue' } as ExecutionsConfig }),
			);
			const search = mock<DistributedSearchService>({
				search: vi.fn().mockResolvedValue({
					records: [],
					hosts: [],
					respondedHostIds: [],
					missingHostIds: [],
					timedOut: false,
					truncated: false,
					...result,
				}),
			});

			return {
				search,
				adapter: new InstanceAiLogQueryAdapter(
					source,
					config,
					search,
					mock<ExecutionsConfig>({ mode: 'queue' }),
				),
			};
		};

		it('fans out across hosts instead of reading only this main', async () => {
			// The whole point: an execution that failed on a worker is invisible to
			// this main's own view once it falls out of the stream window.
			const record = { ...entry('worker line', 3, 'worker-9'), seq: 1, truncated: false };
			const { adapter: queueAdapter, search } = queueModeAdapter({
				records: [record as OperatorLogRecord],
			});

			const page = await queueAdapter.read({ filter: {}, limit: 10 });

			expect(messages(page.records)).toEqual(['worker line']);
			expect(search.search).toHaveBeenCalledWith(
				expect.objectContaining({ expectedHostIds: expect.arrayContaining(['worker-9']) }),
			);
		});

		it('passes non-responding hosts through to the caller', async () => {
			// Otherwise "nothing matched" and "nobody looked" are the same answer.
			const { adapter: queueAdapter } = queueModeAdapter({
				missingHostIds: ['worker-9'],
				timedOut: true,
			});

			const page = await queueAdapter.read({ filter: {}, limit: 10 });

			expect(page.missingHostIds).toEqual(['worker-9']);
		});

		it('falls back to the local composite when paging', async () => {
			// A scatter-gather has no stable cursor, so a cursor means local paging.
			buffer.add(entry('local', 1));
			const { adapter: queueAdapter, search } = queueModeAdapter({});

			await queueAdapter.read({ filter: {}, limit: 10, cursor: '0' });

			expect(search.search).not.toHaveBeenCalled();
		});
	});

	describe('readContext', () => {
		beforeEach(() => {
			for (let i = 1; i <= 20; i++) buffer.add(entry(`line ${i}`, i));
		});

		it('centres the window on the hit', async () => {
			const page = await adapter.readContext({
				hostId: HOST,
				ts: at(10),
				before: 2,
				after: 2,
			});

			expect(messages(page.records)).toEqual(['line 8', 'line 9', 'line 10', 'line 11', 'line 12']);
		});

		it('clamps at the start of what is retained', async () => {
			const page = await adapter.readContext({ hostId: HOST, ts: at(1), before: 50, after: 1 });

			expect(messages(page.records)).toEqual(['line 1', 'line 2']);
		});

		it('only returns records from the requested host', async () => {
			buffer.add(entry('other host', 10, 'worker-9'));

			const page = await adapter.readContext({
				hostId: 'worker-9',
				ts: at(10),
				before: 5,
				after: 5,
			});

			expect(messages(page.records)).toEqual(['other host']);
		});

		it('flags a gap when the hit itself has been evicted', async () => {
			// `at(0)` predates every retained line, so what comes back is the nearest
			// survivors, not the hit's surroundings. Returning them silently would
			// let the agent cite context that was never around the hit.
			const page = await adapter.readContext({ hostId: HOST, ts: at(0), before: 5, after: 5 });

			expect(messages(page.records)).toContain('line 1');
			expect(page.gap).toBe(true);
		});

		it('rejects a timestamp it cannot parse', async () => {
			await expect(
				adapter.readContext({ hostId: HOST, ts: 'not-a-date', before: 1, after: 1 }),
			).rejects.toThrow('Invalid timestamp');
		});

		it('redacts context records too', async () => {
			const page = await adapter.readContext({ hostId: HOST, ts: at(5), before: 1, after: 1 });

			expect(page.redaction.applied).toBe(true);
		});
	});
});

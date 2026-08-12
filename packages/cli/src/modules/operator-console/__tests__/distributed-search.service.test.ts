import type { OperatorLogRecord } from '@n8n/api-types';
import { mockLogger } from '@n8n/backend-test-utils';
import type { ExecutionsConfig } from '@n8n/config';
import type { InstanceSettings } from 'n8n-core';
import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';

import type { Publisher } from '@/scaling/pubsub/publisher.service';

import { DistributedSearchService } from '../consumer/distributed-search.service';
import type { OperatorConsoleConfig } from '../operator-console.config';
import type { LogFileSource } from '../sources/log-file.source';

const LOCAL_HOST = 'main-1';
const TIMEOUT_MS = 3000;

const record = (overrides: Partial<OperatorLogRecord> = {}): OperatorLogRecord => ({
	seq: 1,
	ts: '2026-08-12T10:00:00.000Z',
	hostId: LOCAL_HOST,
	role: 'main',
	stream: 'log',
	level: 'info',
	origin: 'file',
	message: 'hello',
	...overrides,
});

describe('DistributedSearchService', () => {
	let publisher: MockProxy<Publisher>;
	let history: MockProxy<LogFileSource>;
	let service: DistributedSearchService;

	const setup = ({
		mode = 'queue',
		localRecords = [],
		historyEnabled = true,
	}: {
		mode?: 'queue' | 'regular';
		localRecords?: OperatorLogRecord[];
		historyEnabled?: boolean;
	} = {}) => {
		publisher = mock<Publisher>();
		publisher.publishCommand.mockResolvedValue(undefined);

		history = mock<LogFileSource>();
		history.read.mockResolvedValue({ records: localRecords, nextCursor: '', gap: false });

		service = new DistributedSearchService(
			mockLogger(),
			mock<InstanceSettings>({ hostId: LOCAL_HOST, instanceType: 'main' }),
			publisher,
			mock<OperatorConsoleConfig>({ history: historyEnabled }),
			history,
			mock<ExecutionsConfig>({ mode }),
		);
	};

	/** The id the service minted for its broadcast, so tests can answer it. */
	const broadcastRequestId = () => {
		const [command] = publisher.publishCommand.mock.calls[0];
		if (command.command !== 'search-logs') throw new Error('expected a search-logs command');
		return command.payload.requestId;
	};

	const answer = (
		requestId: string,
		hostId: string,
		records: OperatorLogRecord[],
		truncated = false,
	) => service.handleSearchResponse({ requestId, hostId, records, truncated });

	beforeEach(() => {
		vi.useFakeTimers();
		setup();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('outside queue mode', () => {
		it('should search only locally, with no pubsub and no waiting', async () => {
			setup({ mode: 'regular', localRecords: [record({ message: 'local only' })] });

			const result = await service.search({ filter: {}, limit: 10 });

			expect(publisher.publishCommand).not.toHaveBeenCalled();
			expect(result.records.map((r) => r.message)).toEqual(['local only']);
			expect(result.hosts).toEqual([{ hostId: LOCAL_HOST, matched: 1, truncated: false }]);
			expect(result.respondedHostIds).toEqual([LOCAL_HOST]);
			expect(result.missingHostIds).toEqual([]);
			expect(result.timedOut).toBe(false);
			expect(result.truncated).toBe(false);
		});

		it('should ask the local source for one record past the limit', async () => {
			setup({ mode: 'regular' });

			await service.search({ filter: { grep: 'boom' }, limit: 5 });

			expect(history.read).toHaveBeenCalledWith({
				filter: { grep: 'boom' },
				limit: 6,
				direction: 'backward',
			});
		});

		it('should report truncation when the local source has more than the limit', async () => {
			const records = Array.from({ length: 4 }, (_, i) => record({ seq: i }));
			setup({ mode: 'regular', localRecords: records });

			const result = await service.search({ filter: {}, limit: 3 });

			expect(result.records).toHaveLength(3);
			expect(result.hosts[0].truncated).toBe(true);
			expect(result.truncated).toBe(true);
		});

		it('should return an empty local answer when history is disabled', async () => {
			setup({ mode: 'regular', historyEnabled: false });

			const result = await service.search({ filter: {}, limit: 10 });

			expect(history.read).not.toHaveBeenCalled();
			expect(result.records).toEqual([]);
			expect(result.hosts).toEqual([{ hostId: LOCAL_HOST, matched: 0, truncated: false }]);
		});
	});

	describe('fan-out', () => {
		it('should merge every host by timestamp and cap at the limit', async () => {
			setup({
				localRecords: [
					record({ seq: 1, ts: '2026-08-12T10:00:01.000Z', message: 'main early' }),
					record({ seq: 2, ts: '2026-08-12T10:00:04.000Z', message: 'main late' }),
				],
			});

			const search = service.search({
				filter: {},
				limit: 3,
				timeoutMs: TIMEOUT_MS,
				expectedHostIds: [LOCAL_HOST, 'worker-1', 'webhook-1'],
			});

			await vi.advanceTimersByTimeAsync(0);
			const requestId = broadcastRequestId();

			answer(requestId, 'worker-1', [
				record({
					hostId: 'worker-1',
					role: 'worker',
					ts: '2026-08-12T10:00:02.000Z',
					message: 'w',
				}),
			]);
			answer(requestId, 'webhook-1', [
				record({
					hostId: 'webhook-1',
					role: 'webhook',
					ts: '2026-08-12T10:00:03.000Z',
					message: 'wh',
				}),
			]);

			const result = await search;

			// Four records across three hosts, newest three kept, oldest dropped.
			expect(result.records.map((r) => r.message)).toEqual(['w', 'wh', 'main late']);
			expect(result.truncated).toBe(true);
			expect(result.respondedHostIds.sort()).toEqual(['main-1', 'webhook-1', 'worker-1']);
			expect(result.missingHostIds).toEqual([]);
			expect(result.timedOut).toBe(false);
		});

		it('should resolve as soon as every expected host has answered', async () => {
			const search = service.search({
				filter: {},
				limit: 10,
				timeoutMs: TIMEOUT_MS,
				expectedHostIds: [LOCAL_HOST, 'worker-1'],
			});

			await vi.advanceTimersByTimeAsync(0);
			answer(broadcastRequestId(), 'worker-1', []);

			// Deliberately not advancing to the deadline.
			const result = await search;

			expect(result.timedOut).toBe(false);
			expect(result.respondedHostIds).toEqual([LOCAL_HOST, 'worker-1']);
		});

		it('should report a host that never answers instead of silently dropping it', async () => {
			const search = service.search({
				filter: {},
				limit: 10,
				timeoutMs: TIMEOUT_MS,
				expectedHostIds: [LOCAL_HOST, 'worker-1', 'worker-2'],
			});

			await vi.advanceTimersByTimeAsync(0);
			answer(broadcastRequestId(), 'worker-1', [
				record({ hostId: 'worker-1', role: 'worker', message: 'from worker 1' }),
			]);

			await vi.advanceTimersByTimeAsync(TIMEOUT_MS);
			const result = await search;

			expect(result.missingHostIds).toEqual(['worker-2']);
			expect(result.timedOut).toBe(true);
			expect(result.respondedHostIds).toEqual([LOCAL_HOST, 'worker-1']);
			expect(result.records.map((r) => r.message)).toContain('from worker 1');
		});

		it('should ignore a response carrying another request id', async () => {
			const search = service.search({
				filter: {},
				limit: 10,
				timeoutMs: TIMEOUT_MS,
				expectedHostIds: [LOCAL_HOST, 'worker-1'],
			});

			await vi.advanceTimersByTimeAsync(0);

			// A sibling main's search, answered on the same channel.
			answer('someone-elses-request', 'worker-1', [
				record({ hostId: 'worker-1', role: 'worker', message: 'not ours' }),
			]);

			await vi.advanceTimersByTimeAsync(TIMEOUT_MS);
			const result = await search;

			expect(result.records).toEqual([]);
			expect(result.respondedHostIds).toEqual([LOCAL_HOST]);
			expect(result.missingHostIds).toEqual(['worker-1']);
		});

		it('should absorb a response that arrives after the deadline', async () => {
			const search = service.search({
				filter: {},
				limit: 10,
				timeoutMs: TIMEOUT_MS,
				expectedHostIds: [LOCAL_HOST, 'worker-1'],
			});

			await vi.advanceTimersByTimeAsync(0);
			const requestId = broadcastRequestId();

			await vi.advanceTimersByTimeAsync(TIMEOUT_MS);
			const result = await search;

			expect(result.timedOut).toBe(true);

			// The straggler must neither throw, nor mutate an already-returned result,
			// nor leave an entry behind for the request to leak on.
			expect(() =>
				answer(requestId, 'worker-1', [record({ hostId: 'worker-1', role: 'worker' })]),
			).not.toThrow();

			expect(result.records).toEqual([]);
			expect(service['pending'].size).toBe(0);
		});

		it('should not leave a pending entry behind once a search settles', async () => {
			const search = service.search({
				filter: {},
				limit: 10,
				timeoutMs: TIMEOUT_MS,
				expectedHostIds: [LOCAL_HOST, 'worker-1'],
			});

			await vi.advanceTimersByTimeAsync(0);
			expect(service['pending'].size).toBe(1);

			answer(broadcastRequestId(), 'worker-1', []);
			await search;

			expect(service['pending'].size).toBe(0);
		});

		it('should still return the local answer when the broadcast fails', async () => {
			setup({ localRecords: [record({ message: 'local survives' })] });
			publisher.publishCommand.mockRejectedValue(new Error('Redis unreachable'));

			const search = service.search({
				filter: {},
				limit: 10,
				timeoutMs: TIMEOUT_MS,
				expectedHostIds: [LOCAL_HOST, 'worker-1'],
			});

			await vi.advanceTimersByTimeAsync(0);
			const result = await search;

			expect(result.records.map((r) => r.message)).toEqual(['local survives']);
			expect(result.missingHostIds).toEqual(['worker-1']);
			expect(result.timedOut).toBe(true);
		});

		it('should carry a host-reported truncation into the merged result', async () => {
			const search = service.search({
				filter: {},
				limit: 10,
				timeoutMs: TIMEOUT_MS,
				expectedHostIds: [LOCAL_HOST, 'worker-1'],
			});

			await vi.advanceTimersByTimeAsync(0);
			answer(
				broadcastRequestId(),
				'worker-1',
				[record({ hostId: 'worker-1', role: 'worker' })],
				true,
			);

			const result = await search;

			expect(result.hosts).toContainEqual({ hostId: 'worker-1', matched: 1, truncated: true });
			expect(result.truncated).toBe(true);
		});
	});
});

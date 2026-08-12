import type { OperatorLogBatch, OperatorLogRecord, OperatorLogReadResult } from '@n8n/api-types';
import { createPinia, setActivePinia } from 'pinia';

import {
	OPERATOR_CONSOLE_HISTORY_LIMIT,
	OPERATOR_CONSOLE_MAX_ENTRIES,
	OPERATOR_CONSOLE_PAUSE_BUFFER_MAX,
} from './operatorConsole.constants';
import { useOperatorConsoleStore } from './operatorConsole.store';
import type { OperatorConsoleEntry, OperatorConsoleMarkerKind } from './operatorConsole.types';

const fetchHostsMock = vi.fn();
const fetchLogsMock = vi.fn();
const startTailMock = vi.fn();
const stopTailMock = vi.fn();

vi.mock('./operatorConsole.api', () => ({
	fetchOperatorLogHosts: async (...args: unknown[]) => await fetchHostsMock(...args),
	fetchOperatorLogs: async (...args: unknown[]) => await fetchLogsMock(...args),
	startOperatorLogTail: async (...args: unknown[]) => await startTailMock(...args),
	stopOperatorLogTail: async (...args: unknown[]) => await stopTailMock(...args),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: '', pushRef: 'push-ref' } }),
}));

function makeRecord(overrides: Partial<OperatorLogRecord> = {}): OperatorLogRecord {
	return {
		seq: 1,
		ts: '2026-05-04T09:12:33.482Z',
		hostId: 'main-1',
		role: 'main',
		stream: 'log',
		level: 'info',
		origin: 'live',
		message: 'hello',
		...overrides,
	};
}

function makeBatch(overrides: Partial<OperatorLogBatch> = {}): OperatorLogBatch {
	return { hostId: 'main-1', records: [makeRecord()], dropped: 0, ...overrides };
}

function makeReadResult(overrides: Partial<OperatorLogReadResult> = {}): OperatorLogReadResult {
	return { records: [], nextCursor: 'cursor-1', gap: false, ...overrides };
}

function markerKinds(entries: OperatorConsoleEntry[]): OperatorConsoleMarkerKind[] {
	return entries.filter((entry) => entry.kind === 'marker').map((entry) => entry.marker);
}

function makeRecords(count: number, overrides: Partial<OperatorLogRecord> = {}) {
	return Array.from({ length: count }, (_, index) =>
		makeRecord({ seq: index + 1, message: `line ${index + 1}`, ...overrides }),
	);
}

async function startedStore() {
	const store = useOperatorConsoleStore();
	await store.start();
	return store;
}

describe('operatorConsole.store', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
		fetchHostsMock.mockResolvedValue([]);
		fetchLogsMock.mockResolvedValue(makeReadResult());
		startTailMock.mockResolvedValue(undefined);
		stopTailMock.mockResolvedValue(undefined);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('start', () => {
		it('loads hosts and scrollback, then issues the tail lease', async () => {
			fetchHostsMock.mockResolvedValue([
				{ hostId: 'worker-2', role: 'worker', lastSeenAt: '2026-05-04T09:00:00.000Z' },
			]);
			fetchLogsMock.mockResolvedValue(makeReadResult({ records: makeRecords(3) }));

			const store = await startedStore();

			expect(store.connectionState).toBe('streaming');
			expect(store.recordCount).toBe(3);
			expect(store.hostOptions.map((host) => host.hostId)).toContain('worker-2');
			expect(fetchLogsMock).toHaveBeenCalledWith(expect.anything(), {
				filter: {},
				limit: OPERATOR_CONSOLE_HISTORY_LIMIT,
				since: undefined,
			});
			expect(startTailMock).toHaveBeenCalledWith(expect.anything(), {});
		});

		it('applies the initial filter to both the scrollback fetch and the lease', async () => {
			const store = useOperatorConsoleStore();
			await store.start({ executionId: '1234' });

			expect(fetchLogsMock).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ filter: { executionId: '1234' } }),
			);
			expect(startTailMock).toHaveBeenCalledWith(expect.anything(), { executionId: '1234' });
		});

		it('records the failure instead of pretending to stream', async () => {
			fetchLogsMock.mockRejectedValue(new Error('nope'));

			const store = await startedStore();

			expect(store.connectionState).toBe('error');
			expect(store.lastError).toBe('nope');
			expect(startTailMock).not.toHaveBeenCalled();
		});

		it('renews the lease on a timer', async () => {
			vi.useFakeTimers();
			const store = useOperatorConsoleStore();
			await store.start();
			expect(startTailMock).toHaveBeenCalledTimes(1);

			await vi.advanceTimersByTimeAsync(25_000);

			expect(startTailMock.mock.calls.length).toBeGreaterThan(1);
			await store.stop();
		});
	});

	describe('ingestBatch', () => {
		it('ignores batches while no console is attached', () => {
			const store = useOperatorConsoleStore();
			store.ingestBatch(makeBatch());

			expect(store.entries).toHaveLength(0);
		});

		it('appends records once streaming', async () => {
			const store = await startedStore();
			store.ingestBatch(makeBatch({ records: makeRecords(2) }));

			expect(store.recordCount).toBe(2);
		});

		it('renders a drop marker at the point in the stream where lines were lost', async () => {
			const store = await startedStore();
			store.ingestBatch(makeBatch({ dropped: 4213, records: makeRecords(1) }));

			expect(store.droppedTotal).toBe(4213);
			const [first, second] = store.entries;
			expect(first).toMatchObject({ kind: 'marker', marker: 'dropped', count: 4213 });
			expect(second.kind).toBe('record');
		});

		it('accumulates drops across batches', async () => {
			const store = await startedStore();
			store.ingestBatch(makeBatch({ dropped: 10 }));
			store.ingestBatch(makeBatch({ dropped: 5 }));

			expect(store.droppedTotal).toBe(15);
		});
	});

	describe('buffer cap', () => {
		it('evicts the oldest entries and leaves a marker saying how many', async () => {
			const store = await startedStore();
			const overflow = 25;
			store.ingestBatch(
				makeBatch({ records: makeRecords(OPERATOR_CONSOLE_MAX_ENTRIES + overflow) }),
			);

			expect(store.entries).toHaveLength(OPERATOR_CONSOLE_MAX_ENTRIES);
			expect(store.entries[0]).toMatchObject({ kind: 'marker', marker: 'trimmed' });
			// The marker itself takes a slot, so one more record than the raw overflow goes.
			expect(store.trimmedTotal).toBe(overflow + 1);
			expect(store.recordCount).toBe(OPERATOR_CONSOLE_MAX_ENTRIES - 1);
		});

		it('keeps a single trimmed marker at the head across repeated overflow', async () => {
			const store = await startedStore();
			store.ingestBatch(makeBatch({ records: makeRecords(OPERATOR_CONSOLE_MAX_ENTRIES) }));
			store.ingestBatch(makeBatch({ records: makeRecords(10) }));
			store.ingestBatch(makeBatch({ records: makeRecords(10) }));

			expect(markerKinds(store.entries)).toEqual(['trimmed']);
			expect(store.entries).toHaveLength(OPERATOR_CONSOLE_MAX_ENTRIES);
		});
	});

	describe('pause', () => {
		it('buffers incoming lines without rendering them', async () => {
			const store = await startedStore();
			store.pause();
			store.ingestBatch(makeBatch({ records: makeRecords(3) }));
			store.ingestBatch(makeBatch({ records: makeRecords(2) }));

			expect(store.pausedLineCount).toBe(5);
			expect(store.recordCount).toBe(0);
		});

		it('flushes buffered lines in order on resume', async () => {
			const store = await startedStore();
			store.pause();
			store.ingestBatch(makeBatch({ records: [makeRecord({ message: 'first' })] }));
			store.ingestBatch(makeBatch({ records: [makeRecord({ message: 'second' })] }));
			store.resume();

			expect(store.pausedLineCount).toBe(0);
			expect(
				store.entries.map((entry) => (entry.kind === 'record' ? entry.record.message : entry.kind)),
			).toEqual(['first', 'second']);
		});

		it('counts lines discarded once the pause buffer is full and says so on resume', async () => {
			const store = await startedStore();
			store.pause();
			store.ingestBatch(makeBatch({ records: makeRecords(OPERATOR_CONSOLE_PAUSE_BUFFER_MAX) }));
			store.ingestBatch(makeBatch({ records: makeRecords(5) }));

			expect(store.droppedWhilePaused).toBe(OPERATOR_CONSOLE_PAUSE_BUFFER_MAX);

			store.resume();

			expect(store.entries[0]).toMatchObject({
				kind: 'marker',
				marker: 'dropped',
				count: OPERATOR_CONSOLE_PAUSE_BUFFER_MAX,
			});
			expect(store.droppedTotal).toBe(OPERATOR_CONSOLE_PAUSE_BUFFER_MAX);
		});

		it('toggles', async () => {
			const store = await startedStore();
			store.togglePause();
			expect(store.isPaused).toBe(true);
			store.togglePause();
			expect(store.isPaused).toBe(false);
		});
	});

	describe('updateFilter', () => {
		it('discards the buffer and re-issues the lease with the merged filter', async () => {
			fetchLogsMock.mockResolvedValue(makeReadResult({ records: makeRecords(3) }));
			const store = await startedStore();
			expect(store.recordCount).toBe(3);

			fetchLogsMock.mockResolvedValue(makeReadResult({ records: makeRecords(1) }));
			await store.updateFilter({ minLevel: 'warn' });
			await store.updateFilter({ grep: 'ECONNREFUSED' });

			expect(store.filter).toEqual({ minLevel: 'warn', grep: 'ECONNREFUSED' });
			expect(startTailMock).toHaveBeenLastCalledWith(expect.anything(), {
				minLevel: 'warn',
				grep: 'ECONNREFUSED',
			});
			// Server-side filtering: the pane is refilled from a fresh fetch, not re-filtered.
			expect(store.recordCount).toBe(1);
		});

		it('does not call the backend when no console is attached', async () => {
			const store = useOperatorConsoleStore();
			await store.updateFilter({ minLevel: 'error' });

			expect(store.filter).toEqual({ minLevel: 'error' });
			expect(fetchLogsMock).not.toHaveBeenCalled();
			expect(startTailMock).not.toHaveBeenCalled();
		});

		it('surfaces a failed refetch', async () => {
			const store = await startedStore();
			fetchLogsMock.mockRejectedValue(new Error('gone'));

			await store.updateFilter({ grep: 'x' });

			expect(store.connectionState).toBe('error');
			expect(store.lastError).toBe('gone');
		});
	});

	describe('lossiness markers', () => {
		it('marks an evicted server-side window', async () => {
			fetchLogsMock.mockResolvedValue(makeReadResult({ gap: true, records: makeRecords(1) }));
			const store = await startedStore();

			expect(store.hasServerGap).toBe(true);
			expect(store.entries[0]).toMatchObject({ kind: 'marker', marker: 'gap' });
		});

		it('marks the boundary between file history and the live tail', async () => {
			fetchLogsMock.mockResolvedValue(
				makeReadResult({ records: makeRecords(2, { origin: 'file' }) }),
			);
			const store = await startedStore();

			expect(markerKinds(store.entries)).toEqual(['historyStart']);

			store.ingestBatch(makeBatch({ records: makeRecords(1) }));

			expect(markerKinds(store.entries)).toEqual(['historyStart', 'historyEnd']);
		});
	});

	describe('observed labels', () => {
		it('widens the host and scope pickers with what the stream reveals', async () => {
			const store = await startedStore();
			store.ingestBatch(
				makeBatch({
					records: [
						makeRecord({ hostId: 'worker-9', role: 'worker', scope: 'scaling' }),
						makeRecord({ hostId: 'worker-9', role: 'worker', scope: 'scaling' }),
					],
				}),
			);

			expect(store.hostOptions.map((host) => host.hostId)).toEqual(['worker-9']);
			expect(store.scopeOptions).toEqual(['scaling']);
		});
	});

	describe('stop', () => {
		it('drops the lease and stops accepting batches', async () => {
			const store = await startedStore();
			await store.stop();

			expect(stopTailMock).toHaveBeenCalled();
			expect(store.connectionState).toBe('idle');

			store.ingestBatch(makeBatch());
			expect(store.recordCount).toBe(0);
		});

		it('does not call the backend when it was never started', async () => {
			const store = useOperatorConsoleStore();
			await store.stop();

			expect(stopTailMock).not.toHaveBeenCalled();
		});
	});

	describe('clearBuffer', () => {
		it('resets rows and loss counters', async () => {
			const store = await startedStore();
			store.ingestBatch(makeBatch({ dropped: 3, records: makeRecords(2) }));

			store.clearBuffer();

			expect(store.entries).toHaveLength(0);
			expect(store.droppedTotal).toBe(0);
			expect(store.trimmedTotal).toBe(0);
			expect(store.hasServerGap).toBe(false);
		});
	});
});

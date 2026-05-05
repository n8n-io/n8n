import { InMemoryMemory } from '../runtime/memory-store';
import { loadObservationalMemoryContext } from '../runtime/observational-memory';
import {
	OBSERVATION_SCHEMA_VERSION,
	type FormatContextFn,
	type NewObservation,
} from '../types/sdk/observation';

function obs(overrides: Partial<NewObservation> = {}): NewObservation {
	return {
		scopeKind: 'thread',
		scopeId: 't-1',
		kind: 'observation',
		payload: 'a thing happened',
		durationMs: null,
		schemaVersion: OBSERVATION_SCHEMA_VERSION,
		createdAt: new Date('2026-05-05T00:00:00Z'),
		compactedAt: null,
		...overrides,
	};
}

describe('loadObservationalMemoryContext', () => {
	it('returns null when no summary and no recent observations exist', async () => {
		const store = new InMemoryMemory();
		const ctx = await loadObservationalMemoryContext(store, {}, 'thread', 't-1');
		expect(ctx).toBeNull();
	});

	it('renders a summary alone', async () => {
		const store = new InMemoryMemory();
		await store.appendObservations([obs({ kind: 'summary', payload: 'rolling state' })]);

		const ctx = await loadObservationalMemoryContext(store, {}, 'thread', 't-1');
		expect(ctx?.renderedSection).toContain('rolling state');
	});

	it('renders recent observations alone (no summary)', async () => {
		const store = new InMemoryMemory();
		await store.appendObservations([obs({ payload: 'first' }), obs({ payload: 'second' })]);

		const ctx = await loadObservationalMemoryContext(store, {}, 'thread', 't-1');
		expect(ctx?.renderedSection).toBe('- first\n- second');
	});

	it('only includes observations after the latest summary', async () => {
		const store = new InMemoryMemory();
		await store.appendObservations([
			obs({ payload: 'pre-summary noise' }),
			obs({ kind: 'summary', payload: 'rolling state v1' }),
			obs({ payload: 'post-summary one' }),
			obs({ payload: 'post-summary two' }),
		]);

		const ctx = await loadObservationalMemoryContext(store, {}, 'thread', 't-1');
		expect(ctx?.renderedSection).toContain('rolling state v1');
		expect(ctx?.renderedSection).toContain('post-summary one');
		expect(ctx?.renderedSection).toContain('post-summary two');
		expect(ctx?.renderedSection).not.toContain('pre-summary noise');
	});

	it('skips compacted rows when looking for recent observations', async () => {
		const store = new InMemoryMemory();
		const persisted = await store.appendObservations([
			obs({ payload: 'will be compacted' }),
			obs({ payload: 'fresh' }),
		]);
		await store.markObservationsCompacted([persisted[0].id], new Date());

		const ctx = await loadObservationalMemoryContext(store, {}, 'thread', 't-1');
		expect(ctx?.renderedSection).toContain('fresh');
		expect(ctx?.renderedSection).not.toContain('will be compacted');
	});

	it('uses a custom summaryKind when configured', async () => {
		const store = new InMemoryMemory();
		await store.appendObservations([
			obs({ kind: 'summary', payload: 'as-summary' }),
			obs({ kind: 'rolling', payload: 'as-rolling' }),
		]);

		// Default 'summary' would pick the kind='summary' row; with 'rolling'
		// the kind='rolling' row is selected as the summary instead.
		const defaultCtx = await loadObservationalMemoryContext(store, {}, 'thread', 't-1');
		expect(defaultCtx?.renderedSection?.split('\n')[0]).toBe('as-summary');

		const customCtx = await loadObservationalMemoryContext(
			store,
			{ summaryKind: 'rolling' },
			'thread',
			't-1',
		);
		expect(customCtx?.renderedSection?.split('\n')[0]).toBe('as-rolling');
	});

	it('flags isStale to the formatter when the summary is older than the threshold', async () => {
		const store = new InMemoryMemory();
		await store.appendObservations([
			obs({
				kind: 'summary',
				payload: 'old summary',
				createdAt: new Date('2026-05-01T00:00:00Z'),
			}),
		]);

		const formatter: FormatContextFn = jest.fn(
			(_ctx: Parameters<FormatContextFn>[0]) => 'rendered',
		);
		await loadObservationalMemoryContext(
			store,
			{ stalenessThresholdMs: 24 * 60 * 60 * 1000, formatContext: formatter },
			'thread',
			't-1',
			new Date('2026-05-05T00:00:00Z'),
		);

		expect(formatter).toHaveBeenCalledWith(
			expect.objectContaining({ isStale: true, summary: 'old summary' }),
		);
	});

	it('does not flag isStale when threshold is absent', async () => {
		const store = new InMemoryMemory();
		await store.appendObservations([
			obs({
				kind: 'summary',
				payload: 'old',
				createdAt: new Date('2020-01-01T00:00:00Z'),
			}),
		]);

		const formatter: FormatContextFn = jest.fn(
			(_ctx: Parameters<FormatContextFn>[0]) => 'rendered',
		);
		await loadObservationalMemoryContext(store, { formatContext: formatter }, 'thread', 't-1');

		expect(formatter).toHaveBeenCalledWith(expect.objectContaining({ isStale: false }));
	});

	it('default formatter prepends [stale] when flagged', async () => {
		const store = new InMemoryMemory();
		await store.appendObservations([
			obs({
				kind: 'summary',
				payload: 'old summary',
				createdAt: new Date('2026-05-01T00:00:00Z'),
			}),
		]);

		const ctx = await loadObservationalMemoryContext(
			store,
			{ stalenessThresholdMs: 1 },
			'thread',
			't-1',
			new Date('2026-05-05T00:00:00Z'),
		);
		expect(ctx?.renderedSection?.startsWith('[stale]')).toBe(true);
	});

	it('skips rows whose schemaVersion exceeds the SDK supported version', async () => {
		const store = new InMemoryMemory();
		await store.appendObservations([
			obs({ payload: 'future row', schemaVersion: 99 }),
			obs({ payload: 'current row' }),
		]);

		const ctx = await loadObservationalMemoryContext(store, {}, 'thread', 't-1');
		expect(ctx?.renderedSection).toContain('current row');
		expect(ctx?.renderedSection).not.toContain('future row');
	});

	it('uses the consumer formatter when provided and returns its string', async () => {
		const store = new InMemoryMemory();
		await store.appendObservations([
			obs({ kind: 'summary', payload: 'sum' }),
			obs({ payload: 'recent' }),
		]);

		const formatter: FormatContextFn = jest.fn((_ctx: Parameters<FormatContextFn>[0]) => 'CUSTOM');
		const ctx = await loadObservationalMemoryContext(
			store,
			{ formatContext: formatter },
			'thread',
			't-1',
		);

		expect(ctx?.renderedSection).toBe('CUSTOM');
		const mockFn = formatter as unknown as jest.Mock<string, [Parameters<FormatContextFn>[0]]>;
		expect(mockFn).toHaveBeenCalledTimes(1);
		const arg = mockFn.mock.calls[0][0];
		expect(arg.summary).toBe('sum');
		expect(arg.summaryUpdatedAt).toBeInstanceOf(Date);
		expect(arg.isStale).toBe(false);
		expect(arg.recentObservations.map((r) => r.payload)).toContain('recent');
	});

	it('returns null when the formatter returns an empty string', async () => {
		const store = new InMemoryMemory();
		await store.appendObservations([obs({ payload: 'recent' })]);

		const ctx = await loadObservationalMemoryContext(
			store,
			{ formatContext: () => '' },
			'thread',
			't-1',
		);
		expect(ctx?.renderedSection).toBeNull();
	});
});

import { InMemoryMemory } from '../runtime/memory-store';
import {
	OBSERVATION_SCHEMA_VERSION,
	type NewObservation,
	type ObservationCursor,
} from '../types/sdk/observation';

function makeRow(overrides: Partial<NewObservation> = {}): NewObservation {
	return {
		scopeKind: 'thread',
		scopeId: 't-1',
		kind: 'observation',
		payload: { text: 'hello' },
		durationMs: null,
		schemaVersion: OBSERVATION_SCHEMA_VERSION,
		createdAt: new Date(),
		compactedAt: null,
		...overrides,
	};
}

describe('InMemoryMemory — observations', () => {
	it('appends rows with assigned id and monotonic seq', async () => {
		const mem = new InMemoryMemory();
		const persisted = await mem.appendObservations([makeRow(), makeRow(), makeRow()]);

		expect(persisted).toHaveLength(3);
		const seqs = persisted.map((r) => r.seq);
		expect(seqs[0]).toBeLessThan(seqs[1]);
		expect(seqs[1]).toBeLessThan(seqs[2]);
		const ids = persisted.map((r) => r.id);
		expect(new Set(ids).size).toBe(3);
	});

	it('seq is per-scope, not global', async () => {
		const mem = new InMemoryMemory();
		const a = await mem.appendObservations([makeRow({ scopeKind: 'thread', scopeId: 'A' })]);
		const b = await mem.appendObservations([makeRow({ scopeKind: 'thread', scopeId: 'B' })]);
		expect(a[0].seq).toBe(b[0].seq);
	});

	it('getObservations returns rows in seq ascending', async () => {
		const mem = new InMemoryMemory();
		await mem.appendObservations([makeRow({ payload: 'first' }), makeRow({ payload: 'second' })]);
		const rows = await mem.getObservations({ scopeKind: 'thread', scopeId: 't-1' });
		expect(rows.map((r) => r.payload)).toEqual(['first', 'second']);
	});

	it('filters by sinceSeq, kindIs, onlyUncompacted, schemaVersionAtMost, limit', async () => {
		const mem = new InMemoryMemory();
		const [r1, r2, r3, r4] = await mem.appendObservations([
			makeRow({ kind: 'observation', payload: 'one' }),
			makeRow({ kind: 'summary', payload: 'mid' }),
			makeRow({ kind: 'observation', payload: 'two', schemaVersion: 99 }),
			makeRow({ kind: 'observation', payload: 'three' }),
		]);

		expect(
			(await mem.getObservations({ scopeKind: 'thread', scopeId: 't-1', sinceSeq: r1.seq })).map(
				(r) => r.payload,
			),
		).toEqual(['mid', 'two', 'three']);

		expect(
			(await mem.getObservations({ scopeKind: 'thread', scopeId: 't-1', kindIs: 'summary' })).map(
				(r) => r.payload,
			),
		).toEqual(['mid']);

		expect(
			(
				await mem.getObservations({
					scopeKind: 'thread',
					scopeId: 't-1',
					schemaVersionAtMost: OBSERVATION_SCHEMA_VERSION,
				})
			).map((r) => r.payload),
		).toEqual(['one', 'mid', 'three']);

		expect(
			(await mem.getObservations({ scopeKind: 'thread', scopeId: 't-1', limit: 2 })).map(
				(r) => r.payload,
			),
		).toEqual(['one', 'mid']);

		await mem.markObservationsCompacted([r1.id, r2.id], new Date());
		expect(
			(
				await mem.getObservations({
					scopeKind: 'thread',
					scopeId: 't-1',
					onlyUncompacted: true,
				})
			).map((r) => r.payload),
		).toEqual(['two', 'three']);

		expect(r3.id).toBeDefined();
		expect(r4.id).toBeDefined();
	});

	it('markObservationsCompacted is idempotent and ignores unknown ids', async () => {
		const mem = new InMemoryMemory();
		const [r1] = await mem.appendObservations([makeRow()]);

		const at = new Date();
		await mem.markObservationsCompacted([r1.id, 'unknown-id'], at);
		await mem.markObservationsCompacted([r1.id], at);

		const [reread] = await mem.getObservations({ scopeKind: 'thread', scopeId: 't-1' });
		expect(reread.compactedAt?.getTime()).toBe(at.getTime());
	});
});

describe('InMemoryMemory — cursors', () => {
	it('returns null when no cursor has been written', async () => {
		const mem = new InMemoryMemory();
		expect(await mem.getCursor('thread', 't-1')).toBeNull();
	});

	it('round-trips and overwrites on re-set', async () => {
		const mem = new InMemoryMemory();
		const first: ObservationCursor = {
			scopeKind: 'thread',
			scopeId: 't-1',
			lastObservedMessageId: 'm-1',
			lastObservedSeq: 5,
			updatedAt: new Date(2026, 0, 1),
		};
		await mem.setCursor(first);
		expect(await mem.getCursor('thread', 't-1')).toEqual(first);

		const second: ObservationCursor = { ...first, lastObservedSeq: 9, updatedAt: new Date() };
		await mem.setCursor(second);
		expect(await mem.getCursor('thread', 't-1')).toEqual(second);
	});

	it('isolates cursors by scope', async () => {
		const mem = new InMemoryMemory();
		await mem.setCursor({
			scopeKind: 'thread',
			scopeId: 'A',
			lastObservedMessageId: 'm-A',
			lastObservedSeq: 1,
			updatedAt: new Date(),
		});
		expect(await mem.getCursor('thread', 'B')).toBeNull();
	});
});

describe('InMemoryMemory — observation locks', () => {
	it('grants the lock when free and refuses a different holder while held', async () => {
		const mem = new InMemoryMemory();
		const a = await mem.acquireObservationLock('thread', 't-1', {
			ttlMs: 60_000,
			holderId: 'A',
		});
		expect(a).not.toBeNull();

		const b = await mem.acquireObservationLock('thread', 't-1', {
			ttlMs: 60_000,
			holderId: 'B',
		});
		expect(b).toBeNull();
	});

	it('reclaims an expired lock for a new holder', async () => {
		const mem = new InMemoryMemory();
		const a = await mem.acquireObservationLock('thread', 't-1', { ttlMs: 1, holderId: 'A' });
		expect(a).not.toBeNull();

		await new Promise((resolve) => setTimeout(resolve, 5));

		const b = await mem.acquireObservationLock('thread', 't-1', {
			ttlMs: 60_000,
			holderId: 'B',
		});
		expect(b).not.toBeNull();
		expect(b?.holderId).toBe('B');
	});

	it('lets the same holder re-acquire (refresh) an active lock', async () => {
		const mem = new InMemoryMemory();
		const first = await mem.acquireObservationLock('thread', 't-1', {
			ttlMs: 60_000,
			holderId: 'A',
		});
		const second = await mem.acquireObservationLock('thread', 't-1', {
			ttlMs: 60_000,
			holderId: 'A',
		});
		expect(first).not.toBeNull();
		expect(second).not.toBeNull();
		expect(second?.heldUntil.getTime()).toBeGreaterThanOrEqual(first!.heldUntil.getTime());
	});

	it('release frees the lock and tolerates double-release', async () => {
		const mem = new InMemoryMemory();
		const a = await mem.acquireObservationLock('thread', 't-1', {
			ttlMs: 60_000,
			holderId: 'A',
		});
		await mem.releaseObservationLock(a!);
		await mem.releaseObservationLock(a!);

		const b = await mem.acquireObservationLock('thread', 't-1', {
			ttlMs: 60_000,
			holderId: 'B',
		});
		expect(b).not.toBeNull();
	});

	it('release by stale handle does not displace a fresh holder', async () => {
		const mem = new InMemoryMemory();
		const stale = await mem.acquireObservationLock('thread', 't-1', { ttlMs: 1, holderId: 'A' });
		await new Promise((resolve) => setTimeout(resolve, 5));
		const fresh = await mem.acquireObservationLock('thread', 't-1', {
			ttlMs: 60_000,
			holderId: 'B',
		});
		expect(fresh).not.toBeNull();

		await mem.releaseObservationLock(stale!);

		const bClaim = await mem.acquireObservationLock('thread', 't-1', {
			ttlMs: 60_000,
			holderId: 'C',
		});
		expect(bClaim).toBeNull();
	});
});

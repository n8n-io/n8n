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
		...overrides,
	};
}

describe('InMemoryMemory — observations', () => {
	it('appends rows with assigned ids', async () => {
		const mem = new InMemoryMemory();
		const persisted = await mem.appendObservations([makeRow(), makeRow(), makeRow()]);

		expect(persisted).toHaveLength(3);
		const ids = persisted.map((r) => r.id);
		expect(new Set(ids).size).toBe(3);
		expect(ids.every((id) => typeof id === 'string' && id.length > 0)).toBe(true);
	});

	it('getObservations returns rows in (createdAt, id) ascending', async () => {
		const mem = new InMemoryMemory();
		const t = Date.now();
		await mem.appendObservations([
			makeRow({ payload: 'first', createdAt: new Date(t) }),
			makeRow({ payload: 'second', createdAt: new Date(t + 1) }),
		]);
		const rows = await mem.getObservations({ scopeKind: 'thread', scopeId: 't-1' });
		expect(rows.map((r) => r.payload)).toEqual(['first', 'second']);
	});

	it('filters by since (keyset), kindIs, schemaVersionAtMost, limit', async () => {
		const mem = new InMemoryMemory();
		const t = Date.now();
		const [r1, r2, r3, r4] = await mem.appendObservations([
			makeRow({ kind: 'observation', payload: 'one', createdAt: new Date(t) }),
			makeRow({ kind: 'summary', payload: 'mid', createdAt: new Date(t + 1) }),
			makeRow({
				kind: 'observation',
				payload: 'two',
				schemaVersion: 99,
				createdAt: new Date(t + 2),
			}),
			makeRow({ kind: 'observation', payload: 'three', createdAt: new Date(t + 3) }),
		]);

		expect(
			(
				await mem.getObservations({
					scopeKind: 'thread',
					scopeId: 't-1',
					since: { sinceCreatedAt: r1.createdAt, sinceObservationId: r1.id },
				})
			).map((r) => r.payload),
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

		expect(r2.id).toBeDefined();
		expect(r3.id).toBeDefined();
		expect(r4.id).toBeDefined();
	});

	it('keyset since includes rows sharing createdAt with the anchor when id is greater', async () => {
		const mem = new InMemoryMemory();
		const t = new Date();
		const [first, second] = await mem.appendObservations([
			makeRow({ payload: 'a', createdAt: t }),
			makeRow({ payload: 'b', createdAt: t }),
		]);
		// Sort the two by id so we know which is the anchor.
		const [low, high] = [first, second].sort((a, b) => (a.id < b.id ? -1 : 1));
		const rows = await mem.getObservations({
			scopeKind: 'thread',
			scopeId: 't-1',
			since: { sinceCreatedAt: low.createdAt, sinceObservationId: low.id },
		});
		expect(rows).toHaveLength(1);
		expect(rows[0].id).toBe(high.id);
	});

	it('deleteObservations removes the named rows and is idempotent', async () => {
		const mem = new InMemoryMemory();
		const [r1, r2] = await mem.appendObservations([makeRow(), makeRow()]);

		await mem.deleteObservations([r1.id, 'unknown-id']);
		await mem.deleteObservations([r1.id]);

		const remaining = await mem.getObservations({ scopeKind: 'thread', scopeId: 't-1' });
		expect(remaining.map((r) => r.id)).toEqual([r2.id]);
	});

	it('deleteObservations is a no-op for an empty id list', async () => {
		const mem = new InMemoryMemory();
		const [r1] = await mem.appendObservations([makeRow()]);
		await mem.deleteObservations([]);
		const rows = await mem.getObservations({ scopeKind: 'thread', scopeId: 't-1' });
		expect(rows.map((r) => r.id)).toEqual([r1.id]);
	});

	it('deleteThread removes only the deleted thread observation state', async () => {
		const mem = new InMemoryMemory();
		await mem.appendObservations([
			makeRow({ scopeKind: 'thread', scopeId: 't-1', payload: 'deleted-thread' }),
			makeRow({ scopeKind: 'thread', scopeId: 't-2', payload: 'other-thread' }),
			makeRow({ scopeKind: 'resource', scopeId: 't-1', payload: 'resource-scope' }),
		]);
		await mem.setCursor({
			scopeKind: 'thread',
			scopeId: 't-1',
			lastObservedMessageId: 'm-1',
			lastObservedAt: new Date(),
			updatedAt: new Date(),
		});
		await mem.acquireObservationLock('thread', 't-1', { ttlMs: 60_000, holderId: 'A' });

		await mem.deleteThread('t-1');

		await expect(mem.getObservations({ scopeKind: 'thread', scopeId: 't-1' })).resolves.toEqual([]);
		await expect(mem.getCursor('thread', 't-1')).resolves.toBeNull();
		await expect(
			mem.acquireObservationLock('thread', 't-1', { ttlMs: 60_000, holderId: 'B' }),
		).resolves.toEqual(expect.objectContaining({ holderId: 'B' }));
		await expect(mem.getObservations({ scopeKind: 'thread', scopeId: 't-2' })).resolves.toEqual([
			expect.objectContaining({ payload: 'other-thread' }),
		]);
		await expect(mem.getObservations({ scopeKind: 'resource', scopeId: 't-1' })).resolves.toEqual([
			expect.objectContaining({ payload: 'resource-scope' }),
		]);
	});
});

describe('InMemoryMemory — cursors', () => {
	it('returns null when no cursor has been written', async () => {
		const mem = new InMemoryMemory();
		expect(await mem.getCursor('thread', 't-1')).toBeNull();
	});

	it('round-trips cursor-advance fields and overwrites on re-set', async () => {
		const mem = new InMemoryMemory();
		const first: ObservationCursor = {
			scopeKind: 'thread',
			scopeId: 't-1',
			lastObservedMessageId: 'm-1',
			lastObservedAt: new Date(2026, 0, 1, 0, 0, 0, 5),
			updatedAt: new Date(2026, 0, 1),
		};
		await mem.setCursor(first);
		expect(await mem.getCursor('thread', 't-1')).toEqual(first);

		const second: ObservationCursor = {
			...first,
			lastObservedMessageId: 'm-2',
			lastObservedAt: new Date(2026, 0, 2),
			updatedAt: new Date(),
		};
		await mem.setCursor(second);
		expect(await mem.getCursor('thread', 't-1')).toEqual(second);
	});

	it('isolates cursors by scope', async () => {
		const mem = new InMemoryMemory();
		await mem.setCursor({
			scopeKind: 'thread',
			scopeId: 'A',
			lastObservedMessageId: 'm-A',
			lastObservedAt: new Date(),
			updatedAt: new Date(),
		});
		expect(await mem.getCursor('thread', 'B')).toBeNull();
	});

	it('returns cursor copies so callers cannot mutate stored state', async () => {
		const mem = new InMemoryMemory();
		const cursor: ObservationCursor = {
			scopeKind: 'thread',
			scopeId: 't-1',
			lastObservedMessageId: 'm-1',
			lastObservedAt: new Date(2026, 0, 1),
			updatedAt: new Date(2026, 0, 2),
		};
		await mem.setCursor(cursor);

		const loaded = await mem.getCursor('thread', 't-1');
		expect(loaded).not.toBeNull();
		loaded!.lastObservedMessageId = 'mutated';
		loaded!.lastObservedAt.setTime(new Date(2030, 0, 1).getTime());

		expect(await mem.getCursor('thread', 't-1')).toEqual(cursor);
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

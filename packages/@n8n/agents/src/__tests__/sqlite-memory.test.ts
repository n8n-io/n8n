import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { SqliteMemory } from '../storage/sqlite-memory';
import type { AgentDbMessage, AgentMessage, Message } from '../types/sdk/message';
import { OBSERVATION_SCHEMA_VERSION, type NewObservation } from '../types/sdk/observation';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTempDb(): string {
	return path.join(os.tmpdir(), `test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
}

function makeMsg(role: 'user' | 'assistant', text: string): AgentDbMessage {
	return {
		id: crypto.randomUUID(),
		createdAt: new Date(),
		role,
		content: [{ type: 'text', text }],
	};
}

function textOf(msg: AgentMessage): string {
	const m = msg as Message;
	return (m.content[0] as { text: string }).text;
}

function makeMemory(dbPath: string, namespace?: string): SqliteMemory {
	return new SqliteMemory({ url: `file:${dbPath}`, namespace });
}

// ---------------------------------------------------------------------------
// Thread management
// ---------------------------------------------------------------------------

describe('SqliteMemory — threads', () => {
	let dbPath: string;

	beforeEach(() => {
		dbPath = makeTempDb();
	});

	afterEach(() => {
		try {
			fs.unlinkSync(dbPath);
		} catch {
			/* ignore */
		}
	});

	it('saves and retrieves a thread', async () => {
		const mem = makeMemory(dbPath);
		const saved = await mem.saveThread({
			id: 't-1',
			resourceId: 'user-1',
			title: 'Hello',
			metadata: { foo: 'bar' },
		});

		expect(saved.id).toBe('t-1');
		expect(saved.resourceId).toBe('user-1');
		expect(saved.title).toBe('Hello');
		expect(saved.metadata).toEqual({ foo: 'bar' });
		expect(saved.createdAt).toBeInstanceOf(Date);
		expect(saved.updatedAt).toBeInstanceOf(Date);

		const fetched = await mem.getThread('t-1');
		expect(fetched).not.toBeNull();
		expect(fetched!.id).toBe('t-1');
		expect(fetched!.title).toBe('Hello');
		expect(fetched!.metadata).toEqual({ foo: 'bar' });
	});

	it('returns null for an unknown thread', async () => {
		const mem = makeMemory(dbPath);
		const result = await mem.getThread('nonexistent');
		expect(result).toBeNull();
	});

	it('deletes a thread and its messages', async () => {
		const mem = makeMemory(dbPath);
		await mem.saveThread({ id: 't-del', resourceId: 'user-1' });
		await mem.saveMessages({ threadId: 't-del', messages: [makeMsg('user', 'hi')] });

		await mem.deleteThread('t-del');

		expect(await mem.getThread('t-del')).toBeNull();
		expect(await mem.getMessages('t-del')).toEqual([]);
	});

	it('preserves createdAt on re-save, updates updatedAt', async () => {
		const mem = makeMemory(dbPath);
		const first = await mem.saveThread({ id: 't-resave', resourceId: 'user-1', title: 'v1' });

		// Small delay to ensure updatedAt differs
		await new Promise((r) => setTimeout(r, 20));

		const second = await mem.saveThread({ id: 't-resave', resourceId: 'user-1', title: 'v2' });

		expect(second.createdAt.getTime()).toBe(first.createdAt.getTime());
		expect(second.updatedAt.getTime()).toBeGreaterThanOrEqual(first.updatedAt.getTime());
		expect(second.title).toBe('v2');
	});
});

// ---------------------------------------------------------------------------
// Message persistence
// ---------------------------------------------------------------------------

describe('SqliteMemory — messages', () => {
	let dbPath: string;

	beforeEach(() => {
		dbPath = makeTempDb();
	});

	afterEach(() => {
		try {
			fs.unlinkSync(dbPath);
		} catch {
			/* ignore */
		}
	});

	it('saves and retrieves messages in order', async () => {
		const mem = makeMemory(dbPath);
		await mem.saveMessages({
			threadId: 't-1',
			messages: [
				makeMsg('user', 'first'),
				makeMsg('assistant', 'second'),
				makeMsg('user', 'third'),
			],
		});

		const msgs = await mem.getMessages('t-1');
		expect(msgs).toHaveLength(3);
		expect(textOf(msgs[0])).toBe('first');
		expect(textOf(msgs[1])).toBe('second');
		expect(textOf(msgs[2])).toBe('third');
	});

	it('exposes monotonic seq on read and filters by sinceSeq', async () => {
		const mem = makeMemory(dbPath);
		await mem.saveMessages({ threadId: 't-1', messages: [makeMsg('user', 'one')] });
		await mem.saveMessages({ threadId: 't-1', messages: [makeMsg('assistant', 'two')] });
		await mem.saveMessages({ threadId: 't-1', messages: [makeMsg('user', 'three')] });

		const all = await mem.getMessages('t-1');
		expect(all.map((m) => m.seq)).toEqual([
			expect.any(Number),
			expect.any(Number),
			expect.any(Number),
		]);
		const seqs = all.map((m) => m.seq!);
		expect(seqs[0]).toBeLessThan(seqs[1]);
		expect(seqs[1]).toBeLessThan(seqs[2]);

		const tail = await mem.getMessages('t-1', { sinceSeq: seqs[0] });
		expect(tail.map(textOf)).toEqual(['two', 'three']);
		expect(await mem.getMessages('t-1', { sinceSeq: seqs[2] })).toEqual([]);
	});

	it('respects limit — returns last N messages', async () => {
		const mem = makeMemory(dbPath);
		// Save messages one at a time to guarantee distinct createdAt timestamps
		await mem.saveMessages({ threadId: 't-1', messages: [makeMsg('user', 'msg-1')] });
		await mem.saveMessages({ threadId: 't-1', messages: [makeMsg('assistant', 'msg-2')] });
		await mem.saveMessages({ threadId: 't-1', messages: [makeMsg('user', 'msg-3')] });
		await mem.saveMessages({ threadId: 't-1', messages: [makeMsg('assistant', 'msg-4')] });

		const msgs = await mem.getMessages('t-1', { limit: 2 });
		expect(msgs).toHaveLength(2);
		expect(textOf(msgs[0])).toBe('msg-3');
		expect(textOf(msgs[1])).toBe('msg-4');
	});

	it('isolates messages by thread', async () => {
		const mem = makeMemory(dbPath);
		await mem.saveMessages({ threadId: 't-a', messages: [makeMsg('user', 'thread-a')] });
		await mem.saveMessages({ threadId: 't-b', messages: [makeMsg('user', 'thread-b')] });

		const msgsA = await mem.getMessages('t-a');
		expect(msgsA).toHaveLength(1);
		expect(textOf(msgsA[0])).toBe('thread-a');

		const msgsB = await mem.getMessages('t-b');
		expect(msgsB).toHaveLength(1);
		expect(textOf(msgsB[0])).toBe('thread-b');
	});

	it('deletes specific messages', async () => {
		const mem = makeMemory(dbPath);
		const m1 = { ...makeMsg('user', 'keep'), id: 'keep-1' };
		const m2 = { ...makeMsg('user', 'delete-me'), id: 'del-1' };
		await mem.saveMessages({ threadId: 't-1', messages: [m1, m2] });

		await mem.deleteMessages(['del-1']);

		const msgs = await mem.getMessages('t-1');
		expect(msgs).toHaveLength(1);
		expect((msgs[0] as unknown as { id: string }).id).toBe('keep-1');
	});

	it('createdAt round-trips: saved message createdAt is restored as a Date on load', async () => {
		const mem = makeMemory(dbPath);
		const fixedDate = new Date('2020-03-15T10:30:00.123Z');

		const msg: AgentDbMessage = {
			id: 'msg-round-trip',
			createdAt: fixedDate,
			role: 'user',
			content: [{ type: 'text', text: 'hello' }],
		};

		await mem.saveMessages({ threadId: 't-1', messages: [msg] });
		const [loaded] = await mem.getMessages('t-1');

		// Pre-fix: saveMessages stores createdAt as new Date() (wall clock), not fixedDate.
		// getMessages does not copy createdAt from the DB column back onto the message
		// object, leaving it as a JSON string inside the content blob.
		// So loaded.createdAt would be a string, failing the instanceof check.
		// Post-fix: saveMessages uses msg.createdAt for the DB column, getMessages sets
		// msg.createdAt = new Date(row.createdAt), restoring a proper Date.
		expect(loaded.createdAt).toBeInstanceOf(Date);
		expect(loaded.createdAt.getTime()).toBe(fixedDate.getTime());
	});

	it('before filter works correctly because saveMessages persists msg.createdAt to the DB column', async () => {
		const mem = makeMemory(dbPath);

		const t1 = new Date('2020-01-01T00:00:01.000Z');
		const t2 = new Date('2020-01-01T00:00:02.000Z');
		const t3 = new Date('2020-01-01T00:00:03.000Z');

		const msgs: AgentDbMessage[] = [
			{ id: 'm1', createdAt: t1, role: 'user', content: [{ type: 'text', text: 'first' }] },
			{ id: 'm2', createdAt: t2, role: 'assistant', content: [{ type: 'text', text: 'second' }] },
			{ id: 'm3', createdAt: t3, role: 'user', content: [{ type: 'text', text: 'third' }] },
		];

		await mem.saveMessages({ threadId: 't-1', messages: msgs });

		// before: t3 should return the first two messages only
		const result = await mem.getMessages('t-1', { before: t3 });

		// Pre-fix: saveMessages stores each row with createdAt = new Date() (wall clock,
		// much later than the 2020 dates), so the before: t3 filter returns nothing.
		// Post-fix: each row gets createdAt from msg.createdAt, so t1 and t2 pass the filter.
		expect(result).toHaveLength(2);
		expect((result[0] as unknown as { id: string }).id).toBe('m1');
		expect((result[1] as unknown as { id: string }).id).toBe('m2');
	});
});

// ---------------------------------------------------------------------------
// Working memory
// ---------------------------------------------------------------------------

describe('SqliteMemory — working memory', () => {
	let dbPath: string;

	beforeEach(() => {
		dbPath = makeTempDb();
	});

	afterEach(() => {
		try {
			fs.unlinkSync(dbPath);
		} catch {
			/* ignore */
		}
	});

	it('returns null for an unknown key', async () => {
		const mem = makeMemory(dbPath);
		const result = await mem.getWorkingMemory({ threadId: 'thread-x', resourceId: 'unknown' });
		expect(result).toBeNull();
	});

	it('saves and retrieves working memory keyed by resourceId', async () => {
		const mem = makeMemory(dbPath);
		await mem.saveWorkingMemory({ threadId: 'thread-1', resourceId: 'res-1' }, 'some context');
		const result = await mem.getWorkingMemory({ threadId: 'thread-1', resourceId: 'res-1' });
		expect(result).toBe('some context');
	});

	it('overwrites working memory on re-save', async () => {
		const mem = makeMemory(dbPath);
		await mem.saveWorkingMemory({ threadId: 'thread-1', resourceId: 'res-1' }, 'v1');
		await mem.saveWorkingMemory({ threadId: 'thread-1', resourceId: 'res-1' }, 'v2');
		const result = await mem.getWorkingMemory({ threadId: 'thread-1', resourceId: 'res-1' });
		expect(result).toBe('v2');
	});

	it('isolates working memory by resourceId', async () => {
		const mem = makeMemory(dbPath);
		await mem.saveWorkingMemory({ threadId: 'thread-a', resourceId: 'res-a' }, 'content-a');
		await mem.saveWorkingMemory({ threadId: 'thread-b', resourceId: 'res-b' }, 'content-b');

		expect(await mem.getWorkingMemory({ threadId: 'thread-a', resourceId: 'res-a' })).toBe(
			'content-a',
		);
		expect(await mem.getWorkingMemory({ threadId: 'thread-b', resourceId: 'res-b' })).toBe(
			'content-b',
		);
	});

	it('saves and retrieves working memory keyed by threadId (no resourceId)', async () => {
		const mem = makeMemory(dbPath);
		await mem.saveWorkingMemory({ threadId: 'thread-1' }, 'thread context');
		const result = await mem.getWorkingMemory({ threadId: 'thread-1' });
		expect(result).toBe('thread context');
	});

	it('isolates working memory by threadId', async () => {
		const mem = makeMemory(dbPath);
		await mem.saveWorkingMemory({ threadId: 'thread-1' }, 'data 1');
		await mem.saveWorkingMemory({ threadId: 'thread-2' }, 'data 2');

		expect(await mem.getWorkingMemory({ threadId: 'thread-1' })).toBe('data 1');
		expect(await mem.getWorkingMemory({ threadId: 'thread-2' })).toBe('data 2');
	});

	it('stores scope=resource when resourceId is provided', async () => {
		const mem = makeMemory(dbPath);
		await mem.saveWorkingMemory({ threadId: 'thread-1', resourceId: 'res-1' }, 'resource content');

		const { createClient } = await import('@libsql/client');
		const db = createClient({ url: `file:${dbPath}` });
		const result = await db.execute('SELECT scope FROM working_memory WHERE key = ?', ['res-1']);
		expect(result.rows[0].scope).toBe('resource');
	});

	it('stores scope=thread when only threadId is provided', async () => {
		const mem = makeMemory(dbPath);
		await mem.saveWorkingMemory({ threadId: 'thread-1' }, 'thread content');

		const { createClient } = await import('@libsql/client');
		const db = createClient({ url: `file:${dbPath}` });
		const result = await db.execute('SELECT scope FROM working_memory WHERE key = ?', ['thread-1']);
		expect(result.rows[0].scope).toBe('thread');
	});

	it('does not mix resource-scoped and thread-scoped entries with the same key value', async () => {
		const mem = makeMemory(dbPath);
		const sharedKey = 'same-id';
		await mem.saveWorkingMemory({ threadId: 'thread-1', resourceId: sharedKey }, 'resource data');
		await mem.saveWorkingMemory({ threadId: sharedKey }, 'thread data');

		expect(await mem.getWorkingMemory({ threadId: 'thread-1', resourceId: sharedKey })).toBe(
			'resource data',
		);
		expect(await mem.getWorkingMemory({ threadId: sharedKey })).toBe('thread data');
	});
});

// ---------------------------------------------------------------------------
// Observational memory schema
// ---------------------------------------------------------------------------

describe('SqliteMemory — observation schema', () => {
	let dbPath: string;

	beforeEach(() => {
		dbPath = makeTempDb();
	});

	afterEach(() => {
		try {
			fs.unlinkSync(dbPath);
		} catch {
			/* ignore */
		}
	});

	it('creates the three observation tables and their indexes on first use', async () => {
		const mem = makeMemory(dbPath);
		await mem.saveThread({ id: 't-init', resourceId: 'u-init' });

		const { createClient } = await import('@libsql/client');
		const db = createClient({ url: `file:${dbPath}` });

		const tables = await db.execute(
			"SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
		);
		const tableNames = tables.rows.map((r) => r.name as string);
		expect(tableNames).toEqual(
			expect.arrayContaining(['observations', 'observation_cursors', 'observation_locks']),
		);

		const indexes = await db.execute(
			"SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'observations'",
		);
		const indexNames = indexes.rows.map((r) => r.name as string);
		expect(indexNames).toEqual(
			expect.arrayContaining([
				expect.stringMatching(/observations_scope_seq/),
				expect.stringMatching(/observations_scope_kind_created/),
			]),
		);
	});

	it('namespaces observation tables and indexes', async () => {
		const mem = makeMemory(dbPath, 'tenant_a');
		await mem.saveThread({ id: 't-init', resourceId: 'u-init' });

		const { createClient } = await import('@libsql/client');
		const db = createClient({ url: `file:${dbPath}` });

		const tables = await db.execute(
			"SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'tenant_a_%'",
		);
		const tableNames = tables.rows.map((r) => r.name as string).sort();
		expect(tableNames).toEqual(
			expect.arrayContaining([
				'tenant_a_observation_cursors',
				'tenant_a_observation_locks',
				'tenant_a_observations',
			]),
		);
	});
});

// ---------------------------------------------------------------------------
// Observational memory data methods
// ---------------------------------------------------------------------------

function makeObs(overrides: Partial<NewObservation> = {}): NewObservation {
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

describe('SqliteMemory — observations', () => {
	let dbPath: string;

	beforeEach(() => {
		dbPath = makeTempDb();
	});

	afterEach(() => {
		try {
			fs.unlinkSync(dbPath);
		} catch {
			/* ignore */
		}
	});

	it('appends rows with assigned id and per-scope monotonic seq', async () => {
		const mem = makeMemory(dbPath);
		const persisted = await mem.appendObservations([makeObs(), makeObs(), makeObs()]);

		expect(persisted).toHaveLength(3);
		expect(persisted.map((r) => r.seq)).toEqual([1, 2, 3]);
		expect(new Set(persisted.map((r) => r.id)).size).toBe(3);
	});

	it('seq is per-scope, not global', async () => {
		const mem = makeMemory(dbPath);
		const a = await mem.appendObservations([makeObs({ scopeId: 'A' })]);
		const b = await mem.appendObservations([makeObs({ scopeId: 'B' })]);
		expect(a[0].seq).toBe(1);
		expect(b[0].seq).toBe(1);
	});

	it('getObservations returns rows in seq ascending', async () => {
		const mem = makeMemory(dbPath);
		await mem.appendObservations([
			makeObs({ payload: 'first' }),
			makeObs({ payload: 'second' }),
			makeObs({ payload: 'third' }),
		]);
		const rows = await mem.getObservations({ scopeKind: 'thread', scopeId: 't-1' });
		expect(rows.map((r) => r.payload)).toEqual(['first', 'second', 'third']);
	});

	it('filters by sinceSeq, kindIs, onlyUncompacted, schemaVersionAtMost, limit', async () => {
		const mem = makeMemory(dbPath);
		const [r1, r2, r3, r4] = await mem.appendObservations([
			makeObs({ kind: 'observation', payload: 'one' }),
			makeObs({ kind: 'summary', payload: 'mid' }),
			makeObs({ kind: 'observation', payload: 'two', schemaVersion: 99 }),
			makeObs({ kind: 'observation', payload: 'three' }),
		]);

		expect(
			(
				await mem.getObservations({
					scopeKind: 'thread',
					scopeId: 't-1',
					sinceSeq: r1.seq,
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
		const mem = makeMemory(dbPath);
		const [r1] = await mem.appendObservations([makeObs()]);

		const at = new Date();
		await mem.markObservationsCompacted([r1.id, 'unknown-id'], at);
		await mem.markObservationsCompacted([r1.id], at);

		const [reread] = await mem.getObservations({ scopeKind: 'thread', scopeId: 't-1' });
		expect(reread.compactedAt?.getTime()).toBe(at.getTime());
	});

	it('persists observations across new SqliteMemory instance on same file', async () => {
		const first = makeMemory(dbPath);
		await first.appendObservations([makeObs({ payload: 'survive' })]);

		const second = makeMemory(dbPath);
		const rows = await second.getObservations({ scopeKind: 'thread', scopeId: 't-1' });
		expect(rows.map((r) => r.payload)).toEqual(['survive']);
	});

	it('isolates observations between namespaces', async () => {
		const a = makeMemory(dbPath, 'tenant_a');
		const b = makeMemory(dbPath, 'tenant_b');

		await a.appendObservations([makeObs({ payload: 'a-only' })]);
		await b.appendObservations([makeObs({ payload: 'b-only' })]);

		const aRows = await a.getObservations({ scopeKind: 'thread', scopeId: 't-1' });
		const bRows = await b.getObservations({ scopeKind: 'thread', scopeId: 't-1' });
		expect(aRows.map((r) => r.payload)).toEqual(['a-only']);
		expect(bRows.map((r) => r.payload)).toEqual(['b-only']);
	});
});

// ---------------------------------------------------------------------------
// Observation cursors
// ---------------------------------------------------------------------------

describe('SqliteMemory — observation cursors', () => {
	let dbPath: string;

	beforeEach(() => {
		dbPath = makeTempDb();
	});

	afterEach(() => {
		try {
			fs.unlinkSync(dbPath);
		} catch {
			/* ignore */
		}
	});

	it('returns null when no cursor has been written', async () => {
		const mem = makeMemory(dbPath);
		expect(await mem.getCursor('thread', 't-1')).toBeNull();
	});

	it('round-trips and overwrites on re-set', async () => {
		const mem = makeMemory(dbPath);
		await mem.setCursor({
			scopeKind: 'thread',
			scopeId: 't-1',
			lastObservedMessageId: 'm-1',
			lastObservedSeq: 5,
			updatedAt: new Date('2026-05-01T12:00:00Z'),
		});
		const first = await mem.getCursor('thread', 't-1');
		expect(first?.lastObservedSeq).toBe(5);
		expect(first?.lastObservedMessageId).toBe('m-1');

		await mem.setCursor({
			scopeKind: 'thread',
			scopeId: 't-1',
			lastObservedMessageId: 'm-9',
			lastObservedSeq: 9,
			updatedAt: new Date(),
		});
		const second = await mem.getCursor('thread', 't-1');
		expect(second?.lastObservedSeq).toBe(9);
		expect(second?.lastObservedMessageId).toBe('m-9');
	});

	it('isolates cursors by scope', async () => {
		const mem = makeMemory(dbPath);
		await mem.setCursor({
			scopeKind: 'thread',
			scopeId: 'A',
			lastObservedMessageId: 'm',
			lastObservedSeq: 1,
			updatedAt: new Date(),
		});
		expect(await mem.getCursor('thread', 'B')).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Observation locks
// ---------------------------------------------------------------------------

describe('SqliteMemory — observation locks', () => {
	let dbPath: string;

	beforeEach(() => {
		dbPath = makeTempDb();
	});

	afterEach(() => {
		try {
			fs.unlinkSync(dbPath);
		} catch {
			/* ignore */
		}
	});

	it('grants the lock when free and refuses a different holder while held', async () => {
		const mem = makeMemory(dbPath);
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
		const mem = makeMemory(dbPath);
		const a = await mem.acquireObservationLock('thread', 't-1', { ttlMs: 1, holderId: 'A' });
		expect(a).not.toBeNull();

		await new Promise((resolve) => setTimeout(resolve, 25));

		const b = await mem.acquireObservationLock('thread', 't-1', {
			ttlMs: 60_000,
			holderId: 'B',
		});
		expect(b).not.toBeNull();
		expect(b?.holderId).toBe('B');
	});

	it('lets the same holder re-acquire (refresh) an active lock', async () => {
		const mem = makeMemory(dbPath);
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
		const mem = makeMemory(dbPath);
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
		const mem = makeMemory(dbPath);
		const stale = await mem.acquireObservationLock('thread', 't-1', { ttlMs: 1, holderId: 'A' });
		await new Promise((resolve) => setTimeout(resolve, 25));
		const fresh = await mem.acquireObservationLock('thread', 't-1', {
			ttlMs: 60_000,
			holderId: 'B',
		});
		expect(fresh).not.toBeNull();

		await mem.releaseObservationLock(stale!);

		const cClaim = await mem.acquireObservationLock('thread', 't-1', {
			ttlMs: 60_000,
			holderId: 'C',
		});
		expect(cClaim).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Restart survival
// ---------------------------------------------------------------------------

describe('SqliteMemory — restart survival', () => {
	let dbPath: string;

	beforeEach(() => {
		dbPath = makeTempDb();
	});

	afterEach(() => {
		try {
			fs.unlinkSync(dbPath);
		} catch {
			/* ignore */
		}
	});

	it('data survives a new SqliteMemory instance on same file', async () => {
		const mem1 = makeMemory(dbPath);
		await mem1.saveThread({ id: 't-surv', resourceId: 'user-1', title: 'persistent' });
		await mem1.saveMessages({ threadId: 't-surv', messages: [makeMsg('user', 'hello from past')] });
		await mem1.saveWorkingMemory({ threadId: 't-surv', resourceId: 'user-1' }, 'wm-data');

		// Create a brand new instance pointing at the same file
		const mem2 = makeMemory(dbPath);

		const thread = await mem2.getThread('t-surv');
		expect(thread).not.toBeNull();
		expect(thread!.title).toBe('persistent');

		const msgs = await mem2.getMessages('t-surv');
		expect(msgs).toHaveLength(1);
		expect(textOf(msgs[0])).toBe('hello from past');

		const wm = await mem2.getWorkingMemory({ threadId: 't-surv', resourceId: 'user-1' });
		expect(wm).toBe('wm-data');
	});
});

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

describe('SqliteMemory — queryEmbeddings', () => {
	let dbPath: string;
	let mem: SqliteMemory;

	beforeEach(() => {
		dbPath = makeTempDb();
		mem = makeMemory(dbPath);
	});

	afterEach(() => {
		try {
			fs.unlinkSync(dbPath);
		} catch {
			/* ignore */
		}
	});

	it('returns empty array when no embeddings stored', async () => {
		const results = await mem.queryEmbeddings({
			threadId: 't1',
			vector: new Array<number>(3).fill(0),
			topK: 5,
		});
		expect(results).toEqual([]);
	});

	it('returns nearest neighbours by cosine similarity', async () => {
		await mem.saveThread({ id: 't1', resourceId: 'u1' });

		await mem.saveEmbeddings({
			threadId: 't1',
			resourceId: 'u1',
			entries: [
				{ id: 'msg-cats', vector: [1.0, 0.0, 0.0], text: 'About cats', model: 'test' },
				{ id: 'msg-dogs', vector: [0.0, 1.0, 0.0], text: 'About dogs', model: 'test' },
				{ id: 'msg-kittens', vector: [0.9, 0.1, 0.0], text: 'About kittens', model: 'test' },
			],
		});

		// Query close to [1,0,0] — should return cats first, then kittens
		const results = await mem.queryEmbeddings({
			scope: 'resource',
			resourceId: 'u1',
			vector: [1.0, 0.0, 0.0],
			topK: 2,
		});

		expect(results).toHaveLength(2);
		expect(results[0].id).toBe('msg-cats');
		expect(results[0].score).toBeGreaterThan(0.9);
		expect(results[1].id).toBe('msg-kittens');
	});

	it('filters by threadId with scope=thread', async () => {
		await mem.saveThread({ id: 't1', resourceId: 'u1' });
		await mem.saveThread({ id: 't2', resourceId: 'u1' });

		await mem.saveEmbeddings({
			threadId: 't1',
			entries: [{ id: 'msg-t1', vector: [1.0, 0.0, 0.0], text: 'Thread 1', model: 'test' }],
		});
		await mem.saveEmbeddings({
			threadId: 't2',
			entries: [{ id: 'msg-t2', vector: [1.0, 0.0, 0.0], text: 'Thread 2', model: 'test' }],
		});

		const results = await mem.queryEmbeddings({
			scope: 'thread',
			threadId: 't1',
			vector: [1.0, 0.0, 0.0],
			topK: 10,
		});

		expect(results).toHaveLength(1);
		expect(results[0].id).toBe('msg-t1');
	});

	it('filters by resourceId with scope=resource', async () => {
		await mem.saveThread({ id: 't1', resourceId: 'user-a' });
		await mem.saveThread({ id: 't2', resourceId: 'user-a' });
		await mem.saveThread({ id: 't3', resourceId: 'user-b' });

		await mem.saveEmbeddings({
			threadId: 't1',
			resourceId: 'user-a',
			entries: [{ id: 'msg-1', vector: [1.0, 0.0, 0.0], text: 'User A thread 1', model: 'test' }],
		});
		await mem.saveEmbeddings({
			threadId: 't2',
			resourceId: 'user-a',
			entries: [{ id: 'msg-2', vector: [0.9, 0.1, 0.0], text: 'User A thread 2', model: 'test' }],
		});
		await mem.saveEmbeddings({
			threadId: 't3',
			resourceId: 'user-b',
			entries: [{ id: 'msg-3', vector: [1.0, 0.0, 0.0], text: 'User B thread 3', model: 'test' }],
		});

		const results = await mem.queryEmbeddings({
			scope: 'resource',
			resourceId: 'user-a',
			vector: [1.0, 0.0, 0.0],
			topK: 10,
		});

		expect(results).toHaveLength(2);
		const ids = results.map((r) => r.id);
		expect(ids).toContain('msg-1');
		expect(ids).toContain('msg-2');
		expect(ids).not.toContain('msg-3');
	});

	it('defaults to resource scope — returns all embeddings for a resourceId across threads', async () => {
		await mem.saveThread({ id: 't1', resourceId: 'user-x' });
		await mem.saveThread({ id: 't2', resourceId: 'user-x' });

		await mem.saveEmbeddings({
			threadId: 't1',
			resourceId: 'user-x',
			entries: [{ id: 'msg-a', vector: [1.0, 0.0, 0.0], text: 'Thread 1 msg', model: 'test' }],
		});
		await mem.saveEmbeddings({
			threadId: 't2',
			resourceId: 'user-x',
			entries: [{ id: 'msg-b', vector: [0.9, 0.1, 0.0], text: 'Thread 2 msg', model: 'test' }],
		});

		// No explicit scope — should default to 'resource'
		const results = await mem.queryEmbeddings({
			resourceId: 'user-x',
			vector: [1.0, 0.0, 0.0],
			topK: 10,
		});

		expect(results).toHaveLength(2);
	});

	it('resource scope excludes embeddings from other resources', async () => {
		await mem.saveEmbeddings({
			threadId: 't1',
			resourceId: 'res-1',
			entries: [{ id: 'msg-r1', vector: [1.0, 0.0, 0.0], text: 'Resource 1', model: 'test' }],
		});
		await mem.saveEmbeddings({
			threadId: 't2',
			resourceId: 'res-2',
			entries: [{ id: 'msg-r2', vector: [1.0, 0.0, 0.0], text: 'Resource 2', model: 'test' }],
		});

		const results = await mem.queryEmbeddings({
			scope: 'resource',
			resourceId: 'res-1',
			vector: [1.0, 0.0, 0.0],
			topK: 10,
		});

		expect(results).toHaveLength(1);
		expect(results[0].id).toBe('msg-r1');
	});

	it('thread scope only returns embeddings from the specified thread', async () => {
		await mem.saveEmbeddings({
			threadId: 't1',
			resourceId: 'user-1',
			entries: [
				{ id: 'msg-t1a', vector: [1.0, 0.0, 0.0], text: 'Thread 1 A', model: 'test' },
				{ id: 'msg-t1b', vector: [0.0, 1.0, 0.0], text: 'Thread 1 B', model: 'test' },
			],
		});
		await mem.saveEmbeddings({
			threadId: 't2',
			resourceId: 'user-1',
			entries: [{ id: 'msg-t2', vector: [1.0, 0.0, 0.0], text: 'Thread 2', model: 'test' }],
		});

		const results = await mem.queryEmbeddings({
			scope: 'thread',
			threadId: 't1',
			vector: [1.0, 0.0, 0.0],
			topK: 10,
		});

		expect(results).toHaveLength(2);
		const ids = results.map((r) => r.id);
		expect(ids).toContain('msg-t1a');
		expect(ids).toContain('msg-t1b');
		expect(ids).not.toContain('msg-t2');
	});
});

// ---------------------------------------------------------------------------
// Namespace validation
// ---------------------------------------------------------------------------

describe('SqliteMemory — namespace', () => {
	it('rejects invalid namespace characters', () => {
		expect(() => new SqliteMemory({ url: 'file::memory:', namespace: 'bad-ns!' })).toThrow(
			/invalid_string/,
		);
	});

	it('accepts valid namespace', () => {
		expect(() => new SqliteMemory({ url: 'file::memory:', namespace: 'my_ns_01' })).not.toThrow();
	});
});

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { SqliteMemory } from '../storage/sqlite-memory';
import type { AgentDbMessage, AgentMessage, Message } from '../types/sdk/message';

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
			/Invalid namespace/,
		);
	});

	it('accepts valid namespace', () => {
		expect(() => new SqliteMemory({ url: 'file::memory:', namespace: 'my_ns_01' })).not.toThrow();
	});
});

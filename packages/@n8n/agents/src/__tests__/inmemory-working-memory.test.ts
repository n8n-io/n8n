import { InMemoryMemory } from '../runtime/memory-store';
import type { AgentDbMessage, Message } from '../types/sdk/message';

describe('InMemoryMemory working memory', () => {
	it('returns null for unknown key', async () => {
		const mem = new InMemoryMemory();
		expect(
			await mem.getWorkingMemory({
				threadId: 'thread-x',
				resourceId: 'unknown',
				scope: 'resource',
			}),
		).toBeNull();
	});

	it('saves and retrieves working memory keyed by resourceId', async () => {
		const mem = new InMemoryMemory();
		await mem.saveWorkingMemory(
			{ threadId: 'thread-1', resourceId: 'user-1', scope: 'resource' },
			'# Context\n- Name: Alice',
		);
		expect(
			await mem.getWorkingMemory({ threadId: 'thread-1', resourceId: 'user-1', scope: 'resource' }),
		).toBe('# Context\n- Name: Alice');
	});

	it('overwrites on subsequent save', async () => {
		const mem = new InMemoryMemory();
		await mem.saveWorkingMemory(
			{ threadId: 'thread-1', resourceId: 'user-1', scope: 'resource' },
			'v1',
		);
		await mem.saveWorkingMemory(
			{ threadId: 'thread-1', resourceId: 'user-1', scope: 'resource' },
			'v2',
		);
		expect(
			await mem.getWorkingMemory({ threadId: 'thread-1', resourceId: 'user-1', scope: 'resource' }),
		).toBe('v2');
	});

	it('isolates by resourceId (resource scope)', async () => {
		const mem = new InMemoryMemory();
		await mem.saveWorkingMemory(
			{ threadId: 'thread-a', resourceId: 'user-1', scope: 'resource' },
			'Alice data',
		);
		await mem.saveWorkingMemory(
			{ threadId: 'thread-b', resourceId: 'user-2', scope: 'resource' },
			'Bob data',
		);
		expect(
			await mem.getWorkingMemory({ threadId: 'thread-a', resourceId: 'user-1', scope: 'resource' }),
		).toBe('Alice data');
		expect(
			await mem.getWorkingMemory({ threadId: 'thread-b', resourceId: 'user-2', scope: 'resource' }),
		).toBe('Bob data');
	});

	it('returns null for unknown threadId (thread scope)', async () => {
		const mem = new InMemoryMemory();
		expect(await mem.getWorkingMemory({ threadId: 'unknown', scope: 'thread' })).toBeNull();
	});

	it('saves and retrieves working memory keyed by threadId', async () => {
		const mem = new InMemoryMemory();
		await mem.saveWorkingMemory({ threadId: 'thread-1', scope: 'thread' }, '# Thread Notes');
		expect(await mem.getWorkingMemory({ threadId: 'thread-1', scope: 'thread' })).toBe(
			'# Thread Notes',
		);
	});

	it('isolates by threadId (thread scope)', async () => {
		const mem = new InMemoryMemory();
		await mem.saveWorkingMemory({ threadId: 'thread-1', scope: 'thread' }, 'data for thread 1');
		await mem.saveWorkingMemory({ threadId: 'thread-2', scope: 'thread' }, 'data for thread 2');
		expect(await mem.getWorkingMemory({ threadId: 'thread-1', scope: 'thread' })).toBe(
			'data for thread 1',
		);
		expect(await mem.getWorkingMemory({ threadId: 'thread-2', scope: 'thread' })).toBe(
			'data for thread 2',
		);
	});

	it('isolates entries by scope when threadId and resourceId match', async () => {
		const mem = new InMemoryMemory();
		await mem.saveWorkingMemory({ threadId: 'shared-id', scope: 'thread' }, 'thread memory');
		await mem.saveWorkingMemory(
			{ threadId: 'thread-1', resourceId: 'shared-id', scope: 'resource' },
			'resource memory',
		);

		expect(await mem.getWorkingMemory({ threadId: 'shared-id', scope: 'thread' })).toBe(
			'thread memory',
		);
		expect(
			await mem.getWorkingMemory({
				threadId: 'thread-1',
				resourceId: 'shared-id',
				scope: 'resource',
			}),
		).toBe('resource memory');
	});
});

// ---------------------------------------------------------------------------
// Message persistence — createdAt correctness
// ---------------------------------------------------------------------------

function makeDbMsg(id: string, createdAt: Date, text: string): AgentDbMessage {
	return { id, createdAt, role: 'user', content: [{ type: 'text', text }] };
}

describe('InMemoryMemory — message createdAt', () => {
	it('before filter uses each message createdAt, not a shared batch timestamp', async () => {
		const mem = new InMemoryMemory();

		// Use dates clearly in the past so the batch wall-clock time (≈ now)
		// never accidentally falls inside the range we're filtering.
		const t1 = new Date('2020-01-01T00:00:01.000Z');
		const t2 = new Date('2020-01-01T00:00:02.000Z');
		const t3 = new Date('2020-01-01T00:00:03.000Z');

		await mem.saveMessages({
			threadId: 't1',
			messages: [
				makeDbMsg('m1', t1, 'first'),
				makeDbMsg('m2', t2, 'second'),
				makeDbMsg('m3', t3, 'third'),
			],
		});

		// before: t3 should return only the two earlier messages
		const result = await mem.getMessages('t1', { before: t3 });

		// Pre-fix: saveMessages stores StoredMessage.createdAt = new Date() (wall clock,
		// much later than t3), so the before filter excludes all messages → length 0.
		// Post-fix: each StoredMessage.createdAt = dbMsg.createdAt, so t1 and t2 pass.
		expect(result).toHaveLength(2);
		expect(result[0].id).toBe('m1');
		expect(result[1].id).toBe('m2');
	});

	it('getMessages returns createdAt from the stored record (consistent with before filter)', async () => {
		const mem = new InMemoryMemory();

		const t1 = new Date('2020-06-01T10:00:00.000Z');
		const t2 = new Date('2020-06-01T10:00:01.000Z');

		await mem.saveMessages({
			threadId: 't1',
			messages: [makeDbMsg('a', t1, 'alpha'), makeDbMsg('b', t2, 'beta')],
		});

		const loaded = await mem.getMessages('t1');

		// Pre-fix: getMessages returns s.message whose createdAt is from toDbMessage
		// (correct), but StoredMessage.createdAt is 'now' — the two are inconsistent.
		// Post-fix: both use the same authoritative value, so this is always consistent.
		expect(loaded[0].createdAt).toBeInstanceOf(Date);
		expect(loaded[0].createdAt.getTime()).toBe(t1.getTime());
		expect(loaded[1].createdAt).toBeInstanceOf(Date);
		expect(loaded[1].createdAt.getTime()).toBe(t2.getTime());
	});
});

// ---------------------------------------------------------------------------
// Upsert contract
// ---------------------------------------------------------------------------

describe('InMemoryMemory — saveMessages upsert by id', () => {
	it('upserts by id (no duplicate rows after a re-save)', async () => {
		const mem = new InMemoryMemory();
		const t1 = new Date('2020-01-01T00:00:01.000Z');

		await mem.saveMessages({
			threadId: 't1',
			messages: [makeDbMsg('msg-1', t1, 'original')],
		});

		const updated = { ...makeDbMsg('msg-1', t1, 'updated content') };
		await mem.saveMessages({ threadId: 't1', messages: [updated] });

		const result = await mem.getMessages('t1');
		expect(result).toHaveLength(1);
		expect(((result[0] as Message).content[0] as { type: string; text: string }).text).toBe(
			'updated content',
		);
	});

	it('preserves insertion order on upsert', async () => {
		const mem = new InMemoryMemory();
		const t1 = new Date('2020-01-01T00:00:01.000Z');
		const t2 = new Date('2020-01-01T00:00:02.000Z');
		const t3 = new Date('2020-01-01T00:00:03.000Z');

		await mem.saveMessages({
			threadId: 't1',
			messages: [
				makeDbMsg('m1', t1, 'first'),
				makeDbMsg('m2', t2, 'second'),
				makeDbMsg('m3', t3, 'third'),
			],
		});

		// Update m2 in place
		await mem.saveMessages({
			threadId: 't1',
			messages: [makeDbMsg('m2', t2, 'second-updated')],
		});

		const result = await mem.getMessages('t1');
		expect(result).toHaveLength(3);
		// Original order preserved
		expect(result[0].id).toBe('m1');
		expect(result[1].id).toBe('m2');
		expect(result[2].id).toBe('m3');
		// Updated content
		expect(((result[1] as Message).content[0] as { text: string }).text).toBe('second-updated');
	});
});

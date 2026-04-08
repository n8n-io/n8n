import { InMemoryMemory } from '../runtime/memory-store';
import type { AgentDbMessage } from '../types/sdk/message';

describe('InMemoryMemory working memory', () => {
	it('returns null for unknown key', async () => {
		const mem = new InMemoryMemory();
		expect(await mem.getWorkingMemory({ threadId: 'thread-x', resourceId: 'unknown' })).toBeNull();
	});

	it('saves and retrieves working memory keyed by resourceId', async () => {
		const mem = new InMemoryMemory();
		await mem.saveWorkingMemory(
			{ threadId: 'thread-1', resourceId: 'user-1' },
			'# Context\n- Name: Alice',
		);
		expect(await mem.getWorkingMemory({ threadId: 'thread-1', resourceId: 'user-1' })).toBe(
			'# Context\n- Name: Alice',
		);
	});

	it('overwrites on subsequent save', async () => {
		const mem = new InMemoryMemory();
		await mem.saveWorkingMemory({ threadId: 'thread-1', resourceId: 'user-1' }, 'v1');
		await mem.saveWorkingMemory({ threadId: 'thread-1', resourceId: 'user-1' }, 'v2');
		expect(await mem.getWorkingMemory({ threadId: 'thread-1', resourceId: 'user-1' })).toBe('v2');
	});

	it('isolates by resourceId (resource scope)', async () => {
		const mem = new InMemoryMemory();
		await mem.saveWorkingMemory({ threadId: 'thread-a', resourceId: 'user-1' }, 'Alice data');
		await mem.saveWorkingMemory({ threadId: 'thread-b', resourceId: 'user-2' }, 'Bob data');
		expect(await mem.getWorkingMemory({ threadId: 'thread-a', resourceId: 'user-1' })).toBe(
			'Alice data',
		);
		expect(await mem.getWorkingMemory({ threadId: 'thread-b', resourceId: 'user-2' })).toBe(
			'Bob data',
		);
	});

	it('returns null for unknown threadId (thread scope)', async () => {
		const mem = new InMemoryMemory();
		expect(await mem.getWorkingMemory({ threadId: 'unknown' })).toBeNull();
	});

	it('saves and retrieves working memory keyed by threadId', async () => {
		const mem = new InMemoryMemory();
		await mem.saveWorkingMemory({ threadId: 'thread-1' }, '# Thread Notes');
		expect(await mem.getWorkingMemory({ threadId: 'thread-1' })).toBe('# Thread Notes');
	});

	it('isolates by threadId (thread scope)', async () => {
		const mem = new InMemoryMemory();
		await mem.saveWorkingMemory({ threadId: 'thread-1' }, 'data for thread 1');
		await mem.saveWorkingMemory({ threadId: 'thread-2' }, 'data for thread 2');
		expect(await mem.getWorkingMemory({ threadId: 'thread-1' })).toBe('data for thread 1');
		expect(await mem.getWorkingMemory({ threadId: 'thread-2' })).toBe('data for thread 2');
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

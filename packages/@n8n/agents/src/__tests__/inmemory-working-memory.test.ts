import { InMemoryMemory } from '../runtime/memory-store';

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

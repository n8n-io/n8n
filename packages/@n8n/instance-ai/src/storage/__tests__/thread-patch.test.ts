import type { Mock } from 'vitest';

import {
	getThread,
	patchThread,
	type PatchableThreadMemory,
	type ThreadRecord,
} from '../thread-patch';

const baseThread: ThreadRecord = {
	id: 'thread-1',
	title: 'Original Title',
	metadata: { key: 'value' },
	resourceId: 'res-1',
	createdAt: new Date(),
	updatedAt: new Date(),
};

type TestMemory = PatchableThreadMemory & {
	getThread: Mock;
	saveThread: Mock;
};

function makeMemory(overrides: Partial<TestMemory> = {}): TestMemory {
	return {
		...overrides,
		getThread: overrides.getThread ?? vi.fn().mockResolvedValue({ ...baseThread }),
		saveThread:
			overrides.saveThread ?? vi.fn().mockImplementation((thread: ThreadRecord) => thread),
	};
}

describe('getThread', () => {
	it('uses native getThread when available', async () => {
		const memory = makeMemory({
			getThread: vi.fn().mockResolvedValue({ ...baseThread, title: 'Native' }),
		});

		const result = await getThread(memory, 'thread-1');

		expect(memory.getThread).toHaveBeenCalledWith('thread-1');
		expect(result?.title).toBe('Native');
	});

	it('throws when native getThread is absent', async () => {
		await expect(getThread({}, 'thread-1')).rejects.toThrow(
			'Memory does not support reading threads',
		);
	});
});

describe('patchThread', () => {
	describe('when memory has patchThread method', () => {
		it('calls memory.patchThread directly', async () => {
			const patchFn = vi.fn().mockResolvedValue({ ...baseThread, title: 'Patched' });
			const memory = makeMemory({ patchThread: patchFn });
			const update = vi.fn().mockReturnValue({ title: 'Patched' });

			const result = await patchThread(memory, { threadId: 'thread-1', update });

			expect(patchFn).toHaveBeenCalledWith({ threadId: 'thread-1', update });
			expect(result?.title).toBe('Patched');
		});
	});

	describe('native getThread + saveThread fallback', () => {
		it('reads thread, calls update, then saves', async () => {
			const memory = makeMemory({
				getThread: vi.fn().mockResolvedValue({ ...baseThread }),
				saveThread: vi.fn(),
			});
			const update = vi.fn().mockReturnValue({ title: 'Updated Title' });

			const result = await patchThread(memory, { threadId: 'thread-1', update });

			expect(memory.getThread).toHaveBeenCalledWith('thread-1');
			expect(update).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'thread-1', title: 'Original Title' }),
			);
			expect(memory.saveThread).toHaveBeenCalledWith(
				expect.objectContaining({
					id: 'thread-1',
					title: 'Updated Title',
					metadata: { key: 'value' },
				}),
			);
			expect(result?.title).toBe('Updated Title');
		});

		it('returns unchanged thread when update returns null', async () => {
			const memory = makeMemory();
			const update = vi.fn().mockReturnValue(null);

			const result = await patchThread(memory, { threadId: 'thread-1', update });

			expect(memory.saveThread).not.toHaveBeenCalled();
			expect(result?.id).toBe('thread-1');
		});

		it('returns null when thread does not exist', async () => {
			const memory = makeMemory({
				getThread: vi.fn().mockResolvedValue(null),
			});
			const update = vi.fn();

			const result = await patchThread(memory, { threadId: 'unknown', update });

			expect(result).toBeNull();
			expect(update).not.toHaveBeenCalled();
		});

		it('uses threadId as title fallback when thread has no title', async () => {
			const memory = makeMemory({
				getThread: vi.fn().mockResolvedValue({
					...baseThread,
					title: undefined,
				}),
			});
			const update = vi.fn().mockReturnValue({ metadata: { newKey: 'newVal' } });

			await patchThread(memory, { threadId: 'thread-1', update });

			expect(memory.saveThread).toHaveBeenCalledWith(
				expect.objectContaining({ title: 'thread-1' }),
			);
		});

		it('applies metadata from patch when provided', async () => {
			const memory = makeMemory();
			const update = vi.fn().mockReturnValue({ metadata: { newKey: 'newVal' } });

			await patchThread(memory, { threadId: 'thread-1', update });

			expect(memory.saveThread).toHaveBeenCalledWith(
				expect.objectContaining({ metadata: { newKey: 'newVal' } }),
			);
		});

		it('passes a defensive copy of metadata to update function', async () => {
			const memory = makeMemory();
			const update = vi.fn().mockImplementation((thread: ThreadRecord) => {
				thread.metadata = { ...(thread.metadata ?? {}), mutated: true };
				return { title: 'Updated' };
			});

			await patchThread(memory, { threadId: 'thread-1', update });

			expect(update).toHaveBeenCalled();
			expect(memory.saveThread).toHaveBeenCalledWith(
				expect.objectContaining({ metadata: { key: 'value' } }),
			);
		});
	});
});

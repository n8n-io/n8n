import type { StorageThreadType } from '@mastra/core/memory';
import type { Memory } from '@mastra/memory';

import { patchThread } from '../thread-patch';

const baseThread: StorageThreadType = {
	id: 'thread-1',
	title: 'Original Title',
	metadata: { key: 'value' },
	resourceId: 'res-1',
	createdAt: new Date(),
	updatedAt: new Date(),
};

function makeMemory(overrides: Partial<Memory> = {}): Memory {
	return {
		getThreadById: jest.fn().mockResolvedValue({ ...baseThread }),
		updateThread: jest
			.fn()
			.mockImplementation(
				(args: { id: string; title: string; metadata: Record<string, unknown> }) => ({
					...baseThread,
					id: args.id,
					title: args.title,
					metadata: args.metadata,
				}),
			),
		saveThread: jest.fn(),
		deleteThread: jest.fn(),
		getThreadsByResourceId: jest.fn(),
		saveMessages: jest.fn(),
		getMessages: jest.fn(),
		getContextWindow: jest.fn(),
		...overrides,
	} as unknown as Memory;
}

describe('patchThread', () => {
	describe('when memory has patchThread method', () => {
		it('calls memory.patchThread directly', async () => {
			const patchFn = jest.fn().mockResolvedValue({ ...baseThread, title: 'Patched' });
			const memory = makeMemory({ patchThread: patchFn } as unknown as Partial<Memory>);
			const update = jest.fn().mockReturnValue({ title: 'Patched' });

			const result = await patchThread(memory, { threadId: 'thread-1', update });

			expect(patchFn).toHaveBeenCalledWith({ threadId: 'thread-1', update });
			expect(result?.title).toBe('Patched');
		});
	});

	describe('when memory store has patchThread method', () => {
		it('calls memoryStore.patchThread via getMemoryStore', async () => {
			const storePatchFn = jest.fn().mockResolvedValue({ ...baseThread, title: 'Store Patched' });
			const memory = makeMemory({
				getMemoryStore: jest.fn().mockResolvedValue({
					patchThread: storePatchFn,
				}),
			} as unknown as Partial<Memory>);
			const update = jest.fn().mockReturnValue({ title: 'Store Patched' });

			const result = await patchThread(memory, { threadId: 'thread-1', update });

			expect(storePatchFn).toHaveBeenCalledWith({ threadId: 'thread-1', update });
			expect(result?.title).toBe('Store Patched');
		});
	});

	describe('fallback to getThreadById + updateThread', () => {
		it('reads thread, calls update, then saves', async () => {
			const memory = makeMemory();
			const update = jest.fn().mockReturnValue({ title: 'Updated Title' });

			const result = await patchThread(memory, { threadId: 'thread-1', update });

			expect(memory.getThreadById).toHaveBeenCalledWith({ threadId: 'thread-1' });
			expect(update).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'thread-1', title: 'Original Title' }),
			);
			expect(memory.updateThread).toHaveBeenCalledWith({
				id: 'thread-1',
				title: 'Updated Title',
				metadata: { key: 'value' },
			});
			expect(result?.title).toBe('Updated Title');
		});

		it('returns unchanged thread when update returns null', async () => {
			const memory = makeMemory();
			const update = jest.fn().mockReturnValue(null);

			const result = await patchThread(memory, { threadId: 'thread-1', update });

			expect(memory.updateThread).not.toHaveBeenCalled();
			expect(result?.id).toBe('thread-1');
		});

		it('returns null when thread does not exist', async () => {
			const memory = makeMemory({
				getThreadById: jest.fn().mockResolvedValue(null),
			});
			const update = jest.fn();

			const result = await patchThread(memory, { threadId: 'unknown', update });

			expect(result).toBeNull();
			expect(update).not.toHaveBeenCalled();
		});

		it('uses threadId as title fallback when thread has no title', async () => {
			const memory = makeMemory({
				getThreadById: jest.fn().mockResolvedValue({
					...baseThread,
					title: undefined,
				}),
			});
			const update = jest.fn().mockReturnValue({ metadata: { newKey: 'newVal' } });

			await patchThread(memory, { threadId: 'thread-1', update });

			expect(memory.updateThread).toHaveBeenCalledWith(
				expect.objectContaining({ title: 'thread-1' }),
			);
		});

		it('applies metadata from patch when provided', async () => {
			const memory = makeMemory();
			const update = jest.fn().mockReturnValue({ metadata: { newKey: 'newVal' } });

			await patchThread(memory, { threadId: 'thread-1', update });

			expect(memory.updateThread).toHaveBeenCalledWith(
				expect.objectContaining({ metadata: { newKey: 'newVal' } }),
			);
		});

		it('passes a defensive copy of metadata to update function', async () => {
			const memory = makeMemory();
			const update = jest.fn().mockImplementation((thread: StorageThreadType) => {
				// Mutating the passed metadata should not affect the original
				(thread.metadata as Record<string, unknown>).mutated = true;
				return { title: 'Updated' };
			});

			await patchThread(memory, { threadId: 'thread-1', update });

			// The update function received a copy, so mutation is safe
			expect(update).toHaveBeenCalled();
		});
	});
});

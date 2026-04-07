import type { Memory } from '@mastra/memory';

jest.mock('../thread-patch', () => ({
	patchThread: jest.fn(),
}));

import type { IterationEntry } from '../iteration-log';
import { MastraIterationLogStorage } from '../mastra-iteration-log-storage';
import { patchThread } from '../thread-patch';

const mockedPatchThread = jest.mocked(patchThread);

function makeMemory(): Memory {
	return {
		getThreadById: jest.fn(),
	} as unknown as Memory;
}

function makeEntry(overrides: Partial<IterationEntry> = {}): IterationEntry {
	return {
		attempt: 1,
		action: 'build',
		result: 'success',
		...overrides,
	};
}

describe('MastraIterationLogStorage', () => {
	let memory: Memory;
	let storage: MastraIterationLogStorage;

	beforeEach(() => {
		jest.clearAllMocks();
		memory = makeMemory();
		storage = new MastraIterationLogStorage(memory);
	});

	describe('append', () => {
		it('appends entry to thread metadata via patchThread', async () => {
			mockedPatchThread.mockImplementation((_mem, { update }) => {
				const result = update({
					id: 'thread-1',
					title: 'Test',
					metadata: {},
					resourceId: 'res-1',
					createdAt: new Date(),
					updatedAt: new Date(),
				});
				expect(result?.metadata?.instanceAiIterationLog).toEqual({
					'task-key': [makeEntry()],
				});
				return { id: 'thread-1' } as never;
			});

			await storage.append('thread-1', 'task-key', makeEntry());
			expect(mockedPatchThread).toHaveBeenCalled();
		});

		it('appends to existing entries for the same task key', async () => {
			const existingEntry = makeEntry({ attempt: 1 });
			const newEntry = makeEntry({ attempt: 2 });

			mockedPatchThread.mockImplementation((_mem, { update }) => {
				const result = update({
					id: 'thread-1',
					title: 'Test',
					metadata: {
						instanceAiIterationLog: { 'task-key': [existingEntry] },
					},
					resourceId: 'res-1',
					createdAt: new Date(),
					updatedAt: new Date(),
				});
				expect(result?.metadata?.instanceAiIterationLog).toEqual({
					'task-key': [existingEntry, newEntry],
				});
				return { id: 'thread-1' } as never;
			});

			await storage.append('thread-1', 'task-key', newEntry);
		});

		it('throws when thread not found', async () => {
			mockedPatchThread.mockResolvedValue(null);

			await expect(storage.append('unknown', 'task-key', makeEntry())).rejects.toThrow(
				'Thread unknown not found',
			);
		});
	});

	describe('getForTask', () => {
		it('returns entries for a specific task key', async () => {
			const entry = makeEntry();
			jest.mocked(memory.getThreadById).mockResolvedValue({
				id: 'thread-1',
				title: 'Test',
				metadata: {
					instanceAiIterationLog: { 'task-key': [entry] },
				},
				resourceId: 'res-1',
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			const result = await storage.getForTask('thread-1', 'task-key');
			expect(result).toEqual([entry]);
		});

		it('returns empty array when thread has no log', async () => {
			jest.mocked(memory.getThreadById).mockResolvedValue({
				id: 'thread-1',
				title: 'Test',
				metadata: {},
				resourceId: 'res-1',
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			const result = await storage.getForTask('thread-1', 'task-key');
			expect(result).toEqual([]);
		});

		it('returns empty array when thread not found', async () => {
			jest.mocked(memory.getThreadById).mockResolvedValue(null);

			const result = await storage.getForTask('unknown', 'task-key');
			expect(result).toEqual([]);
		});

		it('returns empty array when task key does not exist', async () => {
			jest.mocked(memory.getThreadById).mockResolvedValue({
				id: 'thread-1',
				title: 'Test',
				metadata: {
					instanceAiIterationLog: { 'other-key': [makeEntry()] },
				},
				resourceId: 'res-1',
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			const result = await storage.getForTask('thread-1', 'task-key');
			expect(result).toEqual([]);
		});
	});

	describe('clear', () => {
		it('removes the log metadata key via patchThread', async () => {
			mockedPatchThread.mockImplementation((_mem, { update }) => {
				const result = update({
					id: 'thread-1',
					title: 'Test',
					metadata: {
						instanceAiIterationLog: { 'task-key': [makeEntry()] },
						otherKey: 'preserved',
					},
					resourceId: 'res-1',
					createdAt: new Date(),
					updatedAt: new Date(),
				});
				expect(result?.metadata).toEqual({ otherKey: 'preserved' });
				expect(result?.metadata).not.toHaveProperty('instanceAiIterationLog');
				return { id: 'thread-1' } as never;
			});

			await storage.clear('thread-1');
			expect(mockedPatchThread).toHaveBeenCalled();
		});
	});
});

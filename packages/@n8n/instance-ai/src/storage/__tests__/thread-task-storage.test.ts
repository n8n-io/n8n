import type { TaskList } from '@n8n/api-types';
import type { Mock } from 'vitest';

import type { PatchableThreadMemory } from '../thread-patch';
import type * as ThreadPatch from '../thread-patch';
import { patchThread } from '../thread-patch';
import { ThreadTaskStorage } from '../thread-task-storage';

vi.mock('../thread-patch', async () => {
	const actual = await vi.importActual<typeof ThreadPatch>('../thread-patch');

	return {
		...actual,
		patchThread: vi.fn(),
	};
});

const mockedPatchThread = vi.mocked(patchThread);
type TestMemory = PatchableThreadMemory & { getThread: Mock };

function makeMemory(): TestMemory {
	return {
		getThread: vi.fn(),
	};
}

const sampleTaskList: TaskList = {
	tasks: [
		{
			id: 'task-1',
			description: 'Build workflow',
			status: 'todo',
		},
	],
};

describe('ThreadTaskStorage', () => {
	let memory: TestMemory;
	let storage: ThreadTaskStorage;

	beforeEach(() => {
		vi.clearAllMocks();
		memory = makeMemory();
		storage = new ThreadTaskStorage(memory);
	});

	describe('get', () => {
		it('returns task list from thread metadata', async () => {
			vi.mocked(memory.getThread).mockResolvedValue({
				id: 'thread-1',
				title: 'Test',
				metadata: { instanceAiTasks: sampleTaskList },
				resourceId: 'res-1',
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			const result = await storage.get('thread-1');
			expect(result).toEqual(sampleTaskList);
		});

		it('returns null when no tasks in metadata', async () => {
			vi.mocked(memory.getThread).mockResolvedValue({
				id: 'thread-1',
				title: 'Test',
				metadata: {},
				resourceId: 'res-1',
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			expect(await storage.get('thread-1')).toBeNull();
		});

		it('returns null when thread not found', async () => {
			vi.mocked(memory.getThread).mockResolvedValue(null);

			expect(await storage.get('unknown')).toBeNull();
		});

		it('returns null when metadata fails Zod validation', async () => {
			vi.mocked(memory.getThread).mockResolvedValue({
				id: 'thread-1',
				title: 'Test',
				metadata: { instanceAiTasks: 'invalid-data' },
				resourceId: 'res-1',
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			expect(await storage.get('thread-1')).toBeNull();
		});
	});

	describe('save', () => {
		it('saves task list to thread metadata via patchThread', async () => {
			mockedPatchThread.mockImplementation((_mem, { update }) => {
				const result = update({
					id: 'thread-1',
					title: 'Test',
					metadata: { existingKey: 'value' },
					resourceId: 'res-1',
					createdAt: new Date(),
					updatedAt: new Date(),
				});
				expect(result?.metadata).toEqual({
					existingKey: 'value',
					instanceAiTasks: sampleTaskList,
				});
				return { id: 'thread-1' } as never;
			});

			await storage.save('thread-1', sampleTaskList);
			expect(mockedPatchThread).toHaveBeenCalled();
		});

		it('throws when thread not found', async () => {
			mockedPatchThread.mockResolvedValue(null);

			await expect(storage.save('unknown', sampleTaskList)).rejects.toThrow(
				'Thread unknown not found',
			);
		});
	});
});

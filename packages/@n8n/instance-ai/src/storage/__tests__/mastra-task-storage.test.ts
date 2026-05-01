import type { Memory } from '@mastra/memory';
import type { TaskList } from '@n8n/api-types';

jest.mock('../thread-patch', () => ({
	patchThread: jest.fn(),
}));

import { MastraTaskStorage } from '../mastra-task-storage';
import { patchThread } from '../thread-patch';

const mockedPatchThread = jest.mocked(patchThread);

function makeMemory(): Memory {
	return {
		getThreadById: jest.fn(),
	} as unknown as Memory;
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

describe('MastraTaskStorage', () => {
	let memory: Memory;
	let storage: MastraTaskStorage;

	beforeEach(() => {
		jest.clearAllMocks();
		memory = makeMemory();
		storage = new MastraTaskStorage(memory);
	});

	describe('get', () => {
		it('returns task list from thread metadata', async () => {
			jest.mocked(memory.getThreadById).mockResolvedValue({
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
			jest.mocked(memory.getThreadById).mockResolvedValue({
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
			jest.mocked(memory.getThreadById).mockResolvedValue(null);

			expect(await storage.get('unknown')).toBeNull();
		});

		it('returns null when metadata fails Zod validation', async () => {
			jest.mocked(memory.getThreadById).mockResolvedValue({
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

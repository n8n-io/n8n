import type { InstanceAiAgentNode } from '@n8n/api-types';

import { InstanceAiMemoryService } from '../instance-ai-memory.service';

const mockListMessages = jest.fn();
const mockGetThread = jest.fn();
const mockSaveThread = jest.fn();
const mockDeleteThread = jest.fn();
const mockDeleteThreadsByResourceIdPrefix = jest.fn();
const mockListThreads = jest.fn();
const mockAgentMemory = {
	listMessages: mockListMessages,
	getThread: mockGetThread,
	saveThread: mockSaveThread,
	deleteThread: mockDeleteThread,
	deleteThreadsByResourceIdPrefix: mockDeleteThreadsByResourceIdPrefix,
	listThreads: mockListThreads,
};

// Mock GlobalConfig
const mockDbSnapshotStorage = { getAll: jest.fn().mockResolvedValue([]) };

function createService(options: { threadTtlDays?: number } = {}): InstanceAiMemoryService {
	const mockConfig = {
		instanceAi: {
			embedderModel: '',
			lastMessages: 40,
			semanticRecallTopK: 3,
			threadTtlDays: options.threadTtlDays ?? 0,
		},
		database: {
			type: 'postgresdb',
			postgresdb: {
				user: 'test',
				password: 'test',
				host: 'localhost',
				port: 5432,
				database: 'test',
			},
		},
	};
	const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
	return new InstanceAiMemoryService(
		mockLogger as never,
		mockConfig as never,
		mockAgentMemory as never,
		mockDbSnapshotStorage as never,
	);
}

function makeTree(overrides?: Partial<InstanceAiAgentNode>): InstanceAiAgentNode {
	return {
		agentId: 'agent-001',
		role: 'orchestrator',
		status: 'completed',
		textContent: 'Done!',
		reasoning: '',
		toolCalls: [],
		children: [],
		timeline: [{ type: 'text', content: 'Done!' }],
		...overrides,
	};
}

function makeThread(id: string, updatedAt: string) {
	return {
		id,
		title: id,
		resourceId: 'user-1',
		metadata: {},
		createdAt: new Date('2026-01-01T00:00:00.000Z'),
		updatedAt: new Date(updatedAt),
	};
}

describe('InstanceAiMemoryService.getRichMessages', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockDbSnapshotStorage.getAll.mockResolvedValue([]);
		mockListMessages.mockResolvedValue({ messages: [] });
	});

	it('should return parsed rich messages with agent trees from snapshots', async () => {
		const tree = makeTree();
		mockListMessages.mockResolvedValue({
			messages: [
				{
					id: 'msg-u',
					role: 'user',
					content: 'Hello',
					createdAt: new Date('2026-01-01T00:00:00.000Z'),
				},
				{
					id: 'msg-a',
					role: 'assistant',
					content: [{ type: 'text', text: 'Done!' }],
					createdAt: new Date('2026-01-01T00:00:01.000Z'),
				},
			],
		});
		mockDbSnapshotStorage.getAll.mockResolvedValue([
			{
				tree,
				runId: 'run_abc',
				createdAt: new Date('2026-01-01T00:00:01.000Z'),
				updatedAt: new Date('2026-01-01T00:00:01.000Z'),
			},
		]);

		const service = createService();
		const result = await service.getRichMessages('user-1', 'thread-1');

		expect(result.messages).toHaveLength(2);
		expect(result.messages[0].role).toBe('user');
		expect(result.messages[0].content).toBe('Hello');
		expect(result.messages[1].role).toBe('assistant');
		expect(result.messages[1].agentTree).toStrictEqual(tree);
		expect(result.messages[1].runId).toBe('run_abc');
	});

	it('should return parsed messages with flat tree when no snapshots exist', async () => {
		mockListMessages.mockResolvedValue({
			messages: [
				{
					id: 'msg-u',
					role: 'user',
					content: 'Hi',
					createdAt: new Date('2026-01-01T00:00:00.000Z'),
				},
				{
					id: 'msg-a',
					role: 'assistant',
					content: [
						{ type: 'text', text: 'Here are your workflows' },
						{
							type: 'tool-result',
							toolCallId: 'tc-1',
							toolName: 'list-workflows',
							input: {},
							result: { workflows: [] },
						},
					],
					createdAt: new Date('2026-01-01T00:00:01.000Z'),
				},
			],
		});
		mockGetThread.mockResolvedValue({
			id: 'thread-1',
			title: 'Test',
			metadata: {},
		});

		const service = createService();
		const result = await service.getRichMessages('user-1', 'thread-1');

		expect(result.messages).toHaveLength(2);
		const assistant = result.messages[1];
		expect(assistant.agentTree).toBeDefined();
		expect(assistant.agentTree?.toolCalls).toHaveLength(1);
		expect(assistant.agentTree?.toolCalls[0].toolName).toBe('list-workflows');
		expect(assistant.agentTree?.toolCalls[0].isLoading).toBe(false);
	});

	it('should handle empty message list', async () => {
		mockListMessages.mockResolvedValue({ messages: [] });
		mockGetThread.mockResolvedValue({
			id: 'thread-1',
			title: 'Test',
			metadata: {},
		});

		const service = createService();
		const result = await service.getRichMessages('user-1', 'thread-1');

		expect(result.messages).toEqual([]);
	});
});

describe('InstanceAiMemoryService.ensureThread', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('creates a thread when it does not exist yet', async () => {
		mockGetThread.mockResolvedValueOnce(null);
		mockSaveThread.mockResolvedValueOnce({
			id: 'thread-new',
			title: '',
			resourceId: 'user-1',
			metadata: undefined,
			createdAt: new Date('2026-01-01T00:00:00.000Z'),
			updatedAt: new Date('2026-01-01T00:00:00.000Z'),
		});

		const service = createService();
		const result = await service.ensureThread('user-1', 'thread-new');

		expect(mockSaveThread).toHaveBeenCalledWith({
			id: 'thread-new',
			resourceId: 'user-1',
			title: '',
		});
		expect(result.created).toBe(true);
		expect(result.thread.id).toBe('thread-new');
		expect(result.thread.resourceId).toBe('user-1');
	});

	it('returns the existing thread without rewriting it', async () => {
		mockGetThread.mockResolvedValueOnce({
			id: 'thread-existing',
			title: 'Existing',
			resourceId: 'user-1',
			metadata: { foo: 'bar' },
			createdAt: new Date('2026-01-01T00:00:00.000Z'),
			updatedAt: new Date('2026-01-02T00:00:00.000Z'),
		});

		const service = createService();
		const result = await service.ensureThread('user-1', 'thread-existing');

		expect(mockSaveThread).not.toHaveBeenCalled();
		expect(result.created).toBe(false);
		expect(result.thread.title).toBe('Existing');
	});
});

describe('InstanceAiMemoryService.deleteThread', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('deletes hidden sub-agent threads before deleting the parent thread', async () => {
		const service = createService();

		await service.deleteThread('00000000-0000-4000-8000-000000000001');

		expect(mockDeleteThreadsByResourceIdPrefix).toHaveBeenCalledWith(
			'instance-ai-subagent:00000000-0000-4000-8000-000000000001:',
		);
		expect(mockDeleteThread).toHaveBeenCalledWith('00000000-0000-4000-8000-000000000001');
		expect(mockDeleteThreadsByResourceIdPrefix.mock.invocationCallOrder[0]).toBeLessThan(
			mockDeleteThread.mock.invocationCallOrder[0],
		);
	});
});

describe('InstanceAiMemoryService.cleanupExpiredThreads', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('queries oldest threads first so fresh threads do not hide expired ones', async () => {
		const dateNow = jest
			.spyOn(Date, 'now')
			.mockReturnValue(new Date('2026-05-15T00:00:00.000Z').getTime());
		const expiredThread = makeThread('expired-thread', '2026-05-01T00:00:00.000Z');
		const freshThread = makeThread('fresh-thread', '2026-05-14T00:00:00.000Z');
		let expiredDeleted = false;

		mockListThreads.mockImplementation(
			async (args: { orderBy?: { direction?: 'ASC' | 'DESC' } }) => {
				if (args.orderBy?.direction === 'ASC') {
					return expiredDeleted
						? { threads: [freshThread], total: 1, page: 0, hasMore: false }
						: { threads: [expiredThread], total: 2, page: 0, hasMore: true };
				}

				return {
					threads: [freshThread],
					total: 2,
					page: 0,
					hasMore: true,
				};
			},
		);
		mockDeleteThread.mockImplementation(async (threadId: string) => {
			if (threadId === expiredThread.id) expiredDeleted = true;
		});

		const service = createService({ threadTtlDays: 7 });
		const deletedCount = await service.cleanupExpiredThreads();

		expect(deletedCount).toBe(1);
		expect(mockListThreads).toHaveBeenCalledWith({
			perPage: 100,
			page: 0,
			orderBy: { field: 'updatedAt', direction: 'ASC' },
		});
		expect(mockDeleteThread).toHaveBeenCalledWith(expiredThread.id);
		expect(mockDeleteThread).not.toHaveBeenCalledWith(freshThread.id);

		dateNow.mockRestore();
	});
});

import type { InstanceAiAgentNode } from '@n8n/api-types';

import { InstanceAiMemoryService } from '../instance-ai-memory.service';

// Mock createMemory to return a controllable memory instance
const mockRecall = jest.fn();
const mockGetThreadById = jest.fn();
const mockSaveThread = jest.fn();
const mockMemory = {
	recall: mockRecall,
	getThreadById: mockGetThreadById,
	saveThread: mockSaveThread,
};

jest.mock('@n8n/instance-ai', () => ({
	createMemory: () => mockMemory,
}));

// Mock GlobalConfig
const mockDbSnapshotStorage = { getAll: jest.fn().mockResolvedValue([]) };

function createService(): InstanceAiMemoryService {
	const mockConfig = {
		instanceAi: {
			embedderModel: '',
			lastMessages: 40,
			semanticRecallTopK: 3,
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
	const mockCompositeStore = {} as never;
	return new InstanceAiMemoryService(
		mockLogger as never,
		mockConfig as never,
		mockCompositeStore,
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

describe('InstanceAiMemoryService.getRichMessages', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockDbSnapshotStorage.getAll.mockResolvedValue([]);
	});

	it('should return parsed rich messages with agent trees from snapshots', async () => {
		const tree = makeTree();
		mockRecall.mockResolvedValue({
			messages: [
				{
					id: 'msg-u',
					role: 'user',
					content: 'Hello',
					createdAt: new Date('2026-01-01'),
				},
				{
					id: 'msg-a',
					role: 'assistant',
					content: { format: 2, content: 'Done!' },
					createdAt: new Date('2026-01-01T00:00:01'),
				},
			],
		});
		mockDbSnapshotStorage.getAll.mockResolvedValue([{ tree, runId: 'run_abc' }]);

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
		mockRecall.mockResolvedValue({
			messages: [
				{
					id: 'msg-u',
					role: 'user',
					content: 'Hi',
					createdAt: new Date('2026-01-01'),
				},
				{
					id: 'msg-a',
					role: 'assistant',
					content: {
						format: 2,
						content: 'Here are your workflows',
						toolInvocations: [
							{
								state: 'result',
								toolCallId: 'tc-1',
								toolName: 'list-workflows',
								args: {},
								result: { workflows: [] },
							},
						],
					},
					createdAt: new Date('2026-01-01T00:00:01'),
				},
			],
		});
		mockGetThreadById.mockResolvedValue({
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
		mockRecall.mockResolvedValue({ messages: [] });
		mockGetThreadById.mockResolvedValue({
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
		mockGetThreadById.mockResolvedValueOnce(null);
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
			thread: expect.objectContaining({
				id: 'thread-new',
				resourceId: 'user-1',
				title: '',
			}),
		});
		expect(result.created).toBe(true);
		expect(result.thread.id).toBe('thread-new');
		expect(result.thread.resourceId).toBe('user-1');
	});

	it('returns the existing thread without rewriting it', async () => {
		mockGetThreadById.mockResolvedValueOnce({
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

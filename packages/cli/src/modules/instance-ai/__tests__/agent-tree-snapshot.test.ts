import type { InstanceAiAgentNode } from '@n8n/api-types';

import { AgentTreeSnapshotStorage } from '../agent-tree-snapshot';

function makeTree(overrides?: Partial<InstanceAiAgentNode>): InstanceAiAgentNode {
	return {
		agentId: 'agent-001',
		role: 'orchestrator',
		status: 'completed',
		textContent: 'Hello',
		reasoning: '',
		toolCalls: [],
		children: [],
		timeline: [],
		...overrides,
	};
}

function createMockMemory(threadMetadata: Record<string, unknown> = {}) {
	const storedMetadata: { current: Record<string, unknown> } = { current: { ...threadMetadata } };
	return {
		memory: {
			getThreadById: jest.fn().mockImplementation(async () => ({
				id: 'thread-1',
				title: 'Test Thread',
				resourceId: 'user-1',
				metadata: storedMetadata.current,
				createdAt: new Date(),
				updatedAt: new Date(),
			})),
			updateThread: jest.fn().mockImplementation(async ({ metadata }) => {
				storedMetadata.current = metadata;
			}),
		} as unknown as ConstructorParameters<typeof AgentTreeSnapshotStorage>[0],
		storedMetadata,
	};
}

describe('AgentTreeSnapshotStorage', () => {
	describe('save', () => {
		it('should append a snapshot to thread metadata', async () => {
			const { memory } = createMockMemory();
			const storage = new AgentTreeSnapshotStorage(memory);
			const tree = makeTree();

			await storage.save('thread-1', tree, 'run_1');

			expect(memory.updateThread).toHaveBeenCalledWith(
				expect.objectContaining({
					id: 'thread-1',
					metadata: expect.objectContaining({
						instanceAiRunSnapshots: [{ tree, runId: 'run_1' }],
					}),
				}),
			);
		});

		it('should append to existing snapshots', async () => {
			const existingTree = makeTree({ textContent: 'First' });
			const { memory } = createMockMemory({
				instanceAiRunSnapshots: [{ tree: existingTree, runId: 'run_1' }],
			});
			const storage = new AgentTreeSnapshotStorage(memory);
			const newTree = makeTree({ textContent: 'Second' });

			await storage.save('thread-1', newTree, 'run_2');

			const savedMetadata = (memory.updateThread as jest.Mock).mock.calls[0][0].metadata;
			expect(savedMetadata.instanceAiRunSnapshots).toHaveLength(2);
			expect(savedMetadata.instanceAiRunSnapshots[0].runId).toBe('run_1');
			expect(savedMetadata.instanceAiRunSnapshots[1].runId).toBe('run_2');
		});

		it('should do nothing when thread does not exist', async () => {
			const memory = {
				getThreadById: jest.fn().mockResolvedValue(null),
				updateThread: jest.fn(),
			} as unknown as ConstructorParameters<typeof AgentTreeSnapshotStorage>[0];
			const storage = new AgentTreeSnapshotStorage(memory);

			await storage.save('nonexistent', makeTree(), 'run_1');

			expect(memory.updateThread).not.toHaveBeenCalled();
		});
	});

	describe('updateLast', () => {
		it('should replace the snapshot with matching runId', async () => {
			const { memory } = createMockMemory({
				instanceAiRunSnapshots: [{ tree: makeTree({ textContent: 'Old' }), runId: 'run_1' }],
			});
			const storage = new AgentTreeSnapshotStorage(memory);
			const updatedTree = makeTree({ textContent: 'Updated' });

			await storage.updateLast('thread-1', updatedTree, 'run_1');

			const savedMetadata = (memory.updateThread as jest.Mock).mock.calls[0][0].metadata;
			expect(savedMetadata.instanceAiRunSnapshots).toHaveLength(1);
			expect(savedMetadata.instanceAiRunSnapshots[0].tree.textContent).toBe('Updated');
		});

		it('should append if runId is not found (fallback)', async () => {
			const { memory } = createMockMemory({
				instanceAiRunSnapshots: [{ tree: makeTree(), runId: 'run_1' }],
			});
			const storage = new AgentTreeSnapshotStorage(memory);

			await storage.updateLast('thread-1', makeTree(), 'run_unknown');

			const savedMetadata = (memory.updateThread as jest.Mock).mock.calls[0][0].metadata;
			expect(savedMetadata.instanceAiRunSnapshots).toHaveLength(2);
			expect(savedMetadata.instanceAiRunSnapshots[1].runId).toBe('run_unknown');
		});
	});

	describe('getAll', () => {
		it('should return snapshots from thread metadata', async () => {
			const tree = makeTree();
			const { memory } = createMockMemory({
				instanceAiRunSnapshots: [{ tree, runId: 'run_1' }],
			});
			const storage = new AgentTreeSnapshotStorage(memory);

			const result = await storage.getAll('thread-1');

			expect(result).toHaveLength(1);
			expect(result[0].runId).toBe('run_1');
			expect(result[0].tree.agentId).toBe('agent-001');
		});

		it('should return empty array when no snapshots exist', async () => {
			const { memory } = createMockMemory({});
			const storage = new AgentTreeSnapshotStorage(memory);

			const result = await storage.getAll('thread-1');

			expect(result).toEqual([]);
		});

		it('should return empty array for nonexistent thread', async () => {
			const memory = {
				getThreadById: jest.fn().mockResolvedValue(null),
				updateThread: jest.fn(),
			} as unknown as ConstructorParameters<typeof AgentTreeSnapshotStorage>[0];
			const storage = new AgentTreeSnapshotStorage(memory);

			const result = await storage.getAll('nonexistent');

			expect(result).toEqual([]);
		});

		it('should return empty array when metadata contains invalid data', async () => {
			const { memory } = createMockMemory({
				instanceAiRunSnapshots: 'not-an-array',
			});
			const storage = new AgentTreeSnapshotStorage(memory);

			const result = await storage.getAll('thread-1');

			expect(result).toEqual([]);
		});
	});
});

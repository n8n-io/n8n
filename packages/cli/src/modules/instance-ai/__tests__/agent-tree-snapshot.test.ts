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

function createSnapshotRepo() {
	const snapshots: Array<{
		id: string;
		threadId: string;
		runId: string;
		messageGroupId: string | null;
		tree: InstanceAiAgentNode;
		runIds: string[] | null;
		createdAt: Date;
	}> = [];

	const repo = {
		create: jest.fn().mockImplementation((input) => ({
			...input,
			createdAt: input.createdAt ?? new Date(),
		})),
		save: jest.fn().mockImplementation(async (entity) => {
			const existingIndex = snapshots.findIndex((snapshot) => snapshot.id === entity.id);
			if (existingIndex >= 0) {
				snapshots[existingIndex] = { ...snapshots[existingIndex], ...entity };
				return snapshots[existingIndex];
			}

			snapshots.push(entity);
			return entity;
		}),
		find: jest.fn().mockImplementation(async ({ where, order }) => {
			const filtered = snapshots.filter((snapshot) => snapshot.threadId === where.threadId);
			const sorted = [...filtered].sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
			if (order?.createdAt === 'DESC') {
				sorted.reverse();
			}
			return sorted;
		}),
	};

	return {
		repo: repo as never,
		snapshots,
	};
}

describe('AgentTreeSnapshotStorage', () => {
	it('saves and restores snapshots in chronological order', async () => {
		const { repo } = createSnapshotRepo();
		const storage = new AgentTreeSnapshotStorage(repo);

		await storage.save('thread-1', makeTree({ textContent: 'First' }), 'run_1');
		await storage.save('thread-1', makeTree({ textContent: 'Second' }), 'run_2');

		const result = await storage.getAll('thread-1');

		expect(result).toHaveLength(2);
		expect(result[0].runId).toBe('run_1');
		expect(result[1].runId).toBe('run_2');
		expect(result[1].tree.textContent).toBe('Second');
	});

	it('updates the newest snapshot for a message group', async () => {
		const { repo } = createSnapshotRepo();
		const storage = new AgentTreeSnapshotStorage(repo);

		await storage.save('thread-1', makeTree({ textContent: 'First' }), 'run_1', 'mg_1', ['run_1']);
		await storage.save('thread-1', makeTree({ textContent: 'Second' }), 'run_2', 'mg_1', [
			'run_1',
			'run_2',
		]);

		await storage.updateLast(
			'thread-1',
			makeTree({ textContent: 'Updated newest' }),
			'run_3',
			'mg_1',
			['run_1', 'run_2', 'run_3'],
		);

		const result = await storage.getAll('thread-1');

		expect(result).toHaveLength(2);
		expect(result[0].tree.textContent).toBe('First');
		expect(result[1].runId).toBe('run_3');
		expect(result[1].messageGroupId).toBe('mg_1');
		expect(result[1].runIds).toEqual(['run_1', 'run_2', 'run_3']);
		expect(result[1].tree.textContent).toBe('Updated newest');
	});

	it('appends when updateLast cannot find a matching snapshot', async () => {
		const { repo } = createSnapshotRepo();
		const storage = new AgentTreeSnapshotStorage(repo);

		await storage.save('thread-1', makeTree(), 'run_1');
		await storage.updateLast('thread-1', makeTree({ textContent: 'Later' }), 'run_2');

		const result = await storage.getAll('thread-1');

		expect(result).toHaveLength(2);
		expect(result[1].runId).toBe('run_2');
		expect(result[1].tree.textContent).toBe('Later');
	});
});

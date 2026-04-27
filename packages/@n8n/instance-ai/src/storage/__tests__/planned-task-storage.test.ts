import type { Memory } from '@mastra/memory';

import type { PlannedTaskGraph } from '../../types';
import { PlannedTaskStorage } from '../planned-task-storage';

jest.mock('../thread-patch', () => ({
	patchThread: jest.fn(
		(
			_memory: Memory,
			opts: {
				threadId: string;
				update: (thread: { metadata?: Record<string, unknown> }) => {
					metadata: Record<string, unknown>;
				};
			},
		) => {
			const currentMetadata = metadataByThread.get(opts.threadId) ?? {};
			const next = opts.update({ metadata: currentMetadata });
			metadataByThread.set(opts.threadId, next.metadata);
		},
	),
}));

const metadataByThread = new Map<string, Record<string, unknown>>();

function makeMemory(): Memory {
	return {
		getThreadById: jest.fn(({ threadId }: { threadId: string }) => ({
			id: threadId,
			title: 'Test',
			metadata: metadataByThread.get(threadId),
			resourceId: 'res-1',
			createdAt: new Date(),
			updatedAt: new Date(),
		})),
	} as unknown as Memory;
}

function baseGraph(): PlannedTaskGraph {
	return {
		planRunId: 'run-1',
		status: 'active',
		tasks: [
			{
				id: 'task-1',
				title: 'Build',
				kind: 'build-workflow',
				spec: 'spec',
				deps: [],
				status: 'running',
			},
		],
	};
}

describe('PlannedTaskStorage', () => {
	beforeEach(() => {
		metadataByThread.clear();
	});

	it('round-trips a graph through save -> get', async () => {
		const storage = new PlannedTaskStorage(makeMemory());
		const graph = baseGraph();

		await storage.save('thread-1', graph);
		const loaded = await storage.get('thread-1');

		expect(loaded?.tasks[0].id).toBe('task-1');
	});
});

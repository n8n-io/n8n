import type { Memory } from '@mastra/memory';

jest.mock('../thread-patch', () => ({
	patchThread: jest.fn(),
}));

import type { PlannedTaskGraph } from '../../types';
import { PlannedTaskStorage } from '../planned-task-storage';
import { patchThread } from '../thread-patch';

const mockedPatchThread = jest.mocked(patchThread);

function makeMemory(): Memory {
	return {
		getThreadById: jest.fn(),
	} as unknown as Memory;
}

function makeGraph(overrides: Partial<PlannedTaskGraph> = {}): PlannedTaskGraph {
	return {
		planRunId: 'run-1',
		status: 'active',
		tasks: [
			{
				id: 'build-1',
				title: 'Build workflow',
				kind: 'build-workflow',
				spec: 'Build it',
				deps: [],
				status: 'planned',
			},
			{
				id: 'verify-1',
				title: "Verify 'build-1' workflow runs successfully",
				kind: 'checkpoint',
				spec: 'Call verify-built-workflow with the build outcome.',
				deps: ['build-1'],
				status: 'planned',
			},
		],
		...overrides,
	};
}

describe('PlannedTaskStorage', () => {
	let memory: Memory;
	let storage: PlannedTaskStorage;

	beforeEach(() => {
		jest.clearAllMocks();
		memory = makeMemory();
		storage = new PlannedTaskStorage(memory);
	});

	describe('get() kind parsing', () => {
		it('round-trips a graph containing a checkpoint task', async () => {
			const graph = makeGraph();
			(memory.getThreadById as jest.Mock).mockResolvedValue({
				metadata: { instanceAiPlannedTasks: graph },
			});

			const loaded = await storage.get('thread-1');

			expect(loaded).not.toBeNull();
			expect(loaded?.tasks.map((t) => t.kind)).toEqual(['build-workflow', 'checkpoint']);
			const checkpoint = loaded?.tasks.find((t) => t.id === 'verify-1');
			expect(checkpoint?.kind).toBe('checkpoint');
			expect(checkpoint?.deps).toEqual(['build-1']);
		});

		it('returns null when the stored graph has an unknown kind', async () => {
			(memory.getThreadById as jest.Mock).mockResolvedValue({
				metadata: {
					instanceAiPlannedTasks: {
						...makeGraph(),
						tasks: [
							{
								id: 'x',
								title: 'x',
								kind: 'not-a-kind',
								spec: '',
								deps: [],
								status: 'planned',
							},
						],
					},
				},
			});

			const loaded = await storage.get('thread-1');
			expect(loaded).toBeNull();
		});
	});

	describe('update() kind parsing', () => {
		it('persists updates that include checkpoint kind', async () => {
			const graph = makeGraph();
			mockedPatchThread.mockImplementation(async (_mem, opts) => {
				await Promise.resolve();
				opts.update({
					metadata: { instanceAiPlannedTasks: graph },
				} as unknown as Parameters<typeof opts.update>[0]);
				return null;
			});

			const result = await storage.update('thread-1', (g) => ({
				...g,
				tasks: g.tasks.map((t) => (t.id === 'verify-1' ? { ...t, status: 'running' as const } : t)),
			}));

			expect(result).not.toBeNull();
			const checkpoint = result?.tasks.find((t) => t.id === 'verify-1');
			expect(checkpoint?.status).toBe('running');
			expect(checkpoint?.kind).toBe('checkpoint');
		});
	});
});

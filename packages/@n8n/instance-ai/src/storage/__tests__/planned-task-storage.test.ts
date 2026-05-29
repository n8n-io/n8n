import type { PlannedTaskGraph } from '../../types';
import { PlannedTaskStorage } from '../planned-task-storage';
import { patchThread, type PatchableThreadMemory } from '../thread-patch';
import type * as ThreadPatch from '../thread-patch';

jest.mock('../thread-patch', () => {
	const actual =
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		jest.requireActual<typeof ThreadPatch>('../thread-patch');

	return {
		...actual,
		patchThread: jest.fn(),
	};
});

const mockedPatchThread = jest.mocked(patchThread);
type TestMemory = PatchableThreadMemory & { getThread: jest.Mock };

function makeMemory(): TestMemory {
	return {
		getThread: jest.fn(),
	};
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
	let memory: TestMemory;
	let storage: PlannedTaskStorage;

	beforeEach(() => {
		jest.clearAllMocks();
		memory = makeMemory();
		storage = new PlannedTaskStorage(memory);
	});

	describe('get() kind parsing', () => {
		it('round-trips a graph containing a checkpoint task', async () => {
			const graph = makeGraph();
			memory.getThread.mockResolvedValue({
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
			memory.getThread.mockResolvedValue({
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

		it('loads legacy manage-data-tables graphs as failed tasks that can replan', async () => {
			memory.getThread.mockResolvedValue({
				metadata: {
					instanceAiPlannedTasks: {
						...makeGraph(),
						tasks: [
							{
								id: 'tables-1',
								title: 'Manage data tables',
								kind: 'manage-data-tables',
								spec: 'Import rows',
								deps: [],
								status: 'planned',
							},
						],
					},
				},
			});

			const loaded = await storage.get('thread-1');
			expect(loaded).not.toBeNull();
			expect(loaded?.tasks).toEqual([
				expect.objectContaining({
					id: 'tables-1',
					kind: 'delegate',
					status: 'failed',
					error: 'This data-table task was created by an older planner and needs replanning.',
				}),
			]);
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

		it('persists a normalized graph when updating legacy manage-data-tables tasks', async () => {
			const graph = {
				...makeGraph(),
				tasks: [
					{
						id: 'tables-1',
						title: 'Manage data tables',
						kind: 'manage-data-tables',
						spec: 'Import rows',
						deps: [],
						status: 'planned',
					},
				],
			};
			mockedPatchThread.mockImplementation(async (_mem, opts) => {
				await Promise.resolve();
				const patch = opts.update({
					metadata: { instanceAiPlannedTasks: graph },
				} as unknown as Parameters<typeof opts.update>[0]);

				expect(patch?.metadata?.instanceAiPlannedTasks).toEqual(
					expect.objectContaining({
						tasks: [
							expect.objectContaining({
								id: 'tables-1',
								kind: 'delegate',
								status: 'failed',
							}),
						],
					}),
				);
				return null;
			});

			const result = await storage.update('thread-1', (g) => g);

			expect(result?.tasks[0]).toEqual(
				expect.objectContaining({
					kind: 'delegate',
					status: 'failed',
				}),
			);
		});
	});
});

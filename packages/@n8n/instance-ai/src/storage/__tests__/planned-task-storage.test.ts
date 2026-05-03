import type { Memory } from '@mastra/memory';

jest.mock('../thread-patch', () => ({
	patchThread: jest.fn(),
}));

import { DELEGATE_DEFAULT_INSTRUCTIONS } from '../../agent/handoff';
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
				deps: [],
				status: 'planned',
				handoff: {
					taskKey: 'build-1',
					kind: 'build-workflow',
					input: {
						goal: 'Build it',
						workItemId: 'wi_build-1',
						sandboxMode: true,
					},
				},
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

		it('normalizes legacy flat task records into typed handoffs', async () => {
			(memory.getThreadById as jest.Mock).mockResolvedValue({
				metadata: {
					instanceAiPlannedTasks: {
						planRunId: 'run-legacy',
						status: 'active',
						tasks: [
							{
								id: 'build-legacy',
								title: 'Build workflow',
								kind: 'build-workflow',
								spec: 'Build a Slack notifier',
								workflowId: 'wf-existing',
								deps: [],
								status: 'planned',
							},
							{
								id: 'research-legacy',
								title: 'Research Slack scopes',
								kind: 'research',
								spec: 'Focus on OAuth scopes',
								deps: [],
								status: 'planned',
							},
							{
								id: 'delegate-legacy',
								title: 'Check node schema',
								kind: 'delegate',
								spec: 'Inspect the Slack node schema',
								tools: ['nodes'],
								deps: [],
								status: 'planned',
							},
						],
					},
				},
			});

			const loaded = await storage.get('thread-1');
			expect(loaded).not.toBeNull();
			if (!loaded) throw new Error('Expected legacy graph to normalize');

			const build = loaded.tasks.find((task) => task.id === 'build-legacy');
			expect(build?.kind).toBe('build-workflow');
			if (build?.kind !== 'build-workflow') throw new Error('Expected normalized build task');
			expect(build.handoff).toEqual({
				taskKey: 'build-legacy',
				kind: 'build-workflow',
				input: {
					goal: 'Build a Slack notifier',
					workflowId: 'wf-existing',
					workItemId: 'wi_build-legacy',
					sandboxMode: true,
				},
			});

			const research = loaded.tasks.find((task) => task.id === 'research-legacy');
			expect(research?.kind).toBe('research');
			if (research?.kind !== 'research') throw new Error('Expected normalized research task');
			expect(research.handoff).toEqual({
				taskKey: 'research-legacy',
				kind: 'research',
				input: { goal: 'Research Slack scopes', constraints: 'Focus on OAuth scopes' },
			});

			const delegate = loaded.tasks.find((task) => task.id === 'delegate-legacy');
			expect(delegate?.kind).toBe('delegate');
			if (delegate?.kind !== 'delegate') throw new Error('Expected normalized delegate task');
			expect(delegate.handoff).toEqual({
				taskKey: 'delegate-legacy',
				kind: 'delegate',
				input: {
					role: 'Check node schema',
					instructions: DELEGATE_DEFAULT_INSTRUCTIONS,
					goal: 'Inspect the Slack node schema',
					toolNames: ['nodes'],
				},
			});
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

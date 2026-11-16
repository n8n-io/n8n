import { ref } from 'vue';

import * as api from '../self-healing.api';
import { useSubWorkflowScope } from './useSubWorkflowScope';

vi.mock('../self-healing.api');

let graph: Record<string, string[]>;

function useScope() {
	return useSubWorkflowScope({
		selectedIds: ref(['root']),
		projectWorkflowNames: ref(
			new Map([
				['root', 'Root'],
				['child', 'Child'],
				['old', 'Old'],
				['added', 'Added'],
			]),
		),
		includeSubWorkflows: ref(true),
	});
}

function subWorkflowIds(scope: ReturnType<typeof useScope>) {
	return scope.coverage.value.get('root')?.subWorkflows.map(({ id }) => id);
}

beforeEach(() => {
	vi.resetAllMocks();
	graph = { root: ['child'], child: ['old'], old: [], added: [] };
	vi.mocked(api.fetchWorkflowDependencies).mockImplementation(async (_context, ids) =>
		Object.fromEntries(
			ids.map((id) => [
				id,
				{
					inaccessibleCount: 0,
					dependencies: (graph[id] ?? []).map((calledId) => ({
						type: 'workflowCall' as const,
						id: calledId,
						name: calledId,
					})),
				},
			]),
		),
	);
});

it('retries a failed sub-workflow lookup when the workflow loads again', async () => {
	const scope = useScope();
	vi.mocked(api.fetchWorkflowDependencies)
		.mockImplementationOnce(async () => ({
			root: {
				inaccessibleCount: 0,
				dependencies: [{ type: 'workflowCall', id: 'child', name: 'child' }],
			},
		}))
		.mockRejectedValueOnce(new Error('Offline'));

	await scope.load(['root']);
	expect(subWorkflowIds(scope)).toEqual(['child']);

	await scope.load(['root']);
	expect(api.fetchWorkflowDependencies).toHaveBeenNthCalledWith(3, expect.anything(), ['child']);
	expect(subWorkflowIds(scope)).toEqual(['child', 'old']);
});

it('refreshes the cached sub-workflows below the selected workflows', async () => {
	const scope = useScope();
	await scope.load(['root']);
	expect(subWorkflowIds(scope)).toEqual(['child', 'old']);

	graph.child = ['added'];
	await scope.load(['root'], { refresh: true });

	expect(subWorkflowIds(scope)).toEqual(['child', 'added']);
});

it('does not request cached workflows again without a refresh', async () => {
	const scope = useScope();
	await scope.load(['root']);
	vi.mocked(api.fetchWorkflowDependencies).mockClear();

	await scope.load(['root']);

	expect(api.fetchWorkflowDependencies).not.toHaveBeenCalled();
});

it('stops at a cycle of sub-workflows', async () => {
	graph.old = ['root'];
	const scope = useScope();

	await scope.load(['root'], { refresh: true });

	expect(api.fetchWorkflowDependencies).toHaveBeenCalledTimes(3);
	expect(subWorkflowIds(scope)).toEqual(['child', 'old']);
});

it('keeps a refresh when an older response arrives later', async () => {
	const scope = useScope();
	let resolveOlder: (value: Awaited<ReturnType<typeof api.fetchWorkflowDependencies>>) => void;
	vi.mocked(api.fetchWorkflowDependencies).mockImplementationOnce(
		async () => await new Promise((resolve) => (resolveOlder = resolve)),
	);

	const older = scope.load(['root']);
	graph.root = ['added'];
	await scope.load(['root'], { refresh: true });
	resolveOlder!({
		root: {
			inaccessibleCount: 0,
			dependencies: [{ type: 'workflowCall', id: 'child', name: 'child' }],
		},
	});
	await older;

	expect(subWorkflowIds(scope)).toEqual(['added']);
});

import { createPinia, setActivePinia } from 'pinia';
import type { DependencyTypeCounts } from '@n8n/api-types';

import * as workflowDependenciesApi from '@/app/api/workflow-dependencies';
import { useDependencies } from '@/app/composables/useDependencies';

vi.mock('@/app/api/workflow-dependencies', () => ({
	getResourceDependencyCounts: vi.fn(),
	getResourceDependencies: vi.fn(),
}));

const getResourceDependencyCountsMock = vi.mocked(
	workflowDependenciesApi.getResourceDependencyCounts,
);
const getResourceDependenciesMock = vi.mocked(workflowDependenciesApi.getResourceDependencies);

const countsFor = (ids: string[]): Record<string, DependencyTypeCounts> =>
	Object.fromEntries(
		ids.map((id) => [
			id,
			{
				agentUsage: 0,
				credentialId: 0,
				dataTableId: 0,
				errorWorkflow: 0,
				errorWorkflowParent: 0,
				workflowCall: 0,
				workflowParent: 1,
			},
		]),
	);

describe('useDependencies', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
		useDependencies().clearCache();
	});

	describe('fetchDependencyCounts', () => {
		it('does not send a request for an empty id list', async () => {
			await useDependencies().fetchDependencyCounts([], 'credential');

			expect(getResourceDependencyCountsMock).not.toHaveBeenCalled();
		});

		it('splits requests into batches of 100 ids and merges the results', async () => {
			const ids = Array.from({ length: 250 }, (_, i) => `cred-${i}`);
			getResourceDependencyCountsMock.mockImplementation(async (_context, resourceIds) =>
				countsFor(resourceIds),
			);

			const dependencies = useDependencies();
			await dependencies.fetchDependencyCounts(ids, 'credential');

			expect(getResourceDependencyCountsMock).toHaveBeenCalledTimes(3);
			const batchSizes = getResourceDependencyCountsMock.mock.calls.map(
				([, resourceIds]) => resourceIds.length,
			);
			expect(batchSizes).toEqual([100, 100, 50]);
			expect(dependencies.hasDependencies('cred-0', 'credential')).toBe(true);
			expect(dependencies.hasDependencies('cred-249', 'credential')).toBe(true);
		});

		it('clears a stale entry when the response omits the resource', async () => {
			getResourceDependencyCountsMock.mockResolvedValueOnce(countsFor(['cred-1']));
			const dependencies = useDependencies();
			await dependencies.fetchDependencyCounts(['cred-1'], 'credential');
			expect(dependencies.hasDependencies('cred-1', 'credential')).toBe(true);

			// The backend omits resources without dependency rows
			getResourceDependencyCountsMock.mockResolvedValueOnce({});
			await dependencies.fetchDependencyCounts(['cred-1'], 'credential');

			expect(dependencies.hasDependencies('cred-1', 'credential')).toBe(false);
		});

		it('keeps results from successful batches when another batch fails', async () => {
			const ids = Array.from({ length: 150 }, (_, i) => `cred-${i}`);
			getResourceDependencyCountsMock
				.mockRejectedValueOnce(new Error('request failed'))
				.mockImplementation(async (_context, resourceIds) => countsFor(resourceIds));

			const dependencies = useDependencies();
			await dependencies.fetchDependencyCounts(ids, 'credential');

			expect(dependencies.hasDependencies('cred-0', 'credential')).toBe(false);
			expect(dependencies.hasDependencies('cred-149', 'credential')).toBe(true);
		});
	});

	describe('fetchDependencies', () => {
		it('splits requests into batches of 100 ids and merges the results', async () => {
			const ids = Array.from({ length: 101 }, (_, i) => `wf-${i}`);
			getResourceDependenciesMock.mockImplementation(async (_context, resourceIds) =>
				Object.fromEntries(
					resourceIds.map((id) => [id, { dependencies: [], inaccessibleCount: 1 }]),
				),
			);

			const dependencies = useDependencies();
			await dependencies.fetchDependencies(ids, 'workflow');

			expect(getResourceDependenciesMock).toHaveBeenCalledTimes(2);
			expect(dependencies.getDependencies('wf-0', 'workflow')).toEqual({
				dependencies: [],
				inaccessibleCount: 1,
			});
			expect(dependencies.getDependencies('wf-100', 'workflow')).toEqual({
				dependencies: [],
				inaccessibleCount: 1,
			});
		});

		it('clears a stale entry when the response omits the resource', async () => {
			getResourceDependenciesMock.mockResolvedValueOnce({
				'wf-1': {
					dependencies: [{ type: 'workflowParent', id: 'wf-2', name: 'Parent' }],
					inaccessibleCount: 0,
				},
			});
			const dependencies = useDependencies();
			await dependencies.fetchDependencies(['wf-1'], 'workflow');
			expect(dependencies.getDependencies('wf-1', 'workflow')?.dependencies).toHaveLength(1);

			// The backend omits resources without dependency rows
			getResourceDependenciesMock.mockResolvedValueOnce({});
			await dependencies.fetchDependencies(['wf-1'], 'workflow');

			expect(dependencies.getDependencies('wf-1', 'workflow')).toEqual({
				dependencies: [],
				inaccessibleCount: 0,
			});
		});

		it('ignores an out-of-order older response', async () => {
			let resolveFirst!: (value: Awaited<ReturnType<typeof getResourceDependenciesMock>>) => void;
			getResourceDependenciesMock
				.mockImplementationOnce(
					async () => await new Promise((resolve) => (resolveFirst = resolve)),
				)
				.mockResolvedValueOnce({
					'wf-1': {
						dependencies: [{ type: 'workflowParent', id: 'wf-2', name: 'New' }],
						inaccessibleCount: 0,
					},
				});

			const dependencies = useDependencies();
			const firstRequest = dependencies.fetchDependencies(['wf-1'], 'workflow');
			await dependencies.fetchDependencies(['wf-1'], 'workflow');
			expect(dependencies.getDependencies('wf-1', 'workflow')?.dependencies[0]?.name).toBe('New');

			// The older response omits the id; it must not clear the newer result
			resolveFirst({});
			await firstRequest;

			expect(dependencies.getDependencies('wf-1', 'workflow')?.dependencies[0]?.name).toBe('New');
		});

		it('keeps entries of different resource types with the same id separate', async () => {
			getResourceDependenciesMock.mockResolvedValueOnce({
				'5': {
					dependencies: [{ type: 'workflowParent', id: 'wf-2', name: 'Parent' }],
					inaccessibleCount: 0,
				},
			});
			const dependencies = useDependencies();
			await dependencies.fetchDependencies(['5'], 'workflow');

			// A legacy instance can hold a credential with the same numeric id
			getResourceDependenciesMock.mockResolvedValueOnce({});
			await dependencies.fetchDependencies(['5'], 'credential');

			expect(dependencies.getDependencies('5', 'workflow')?.dependencies).toHaveLength(1);
			expect(dependencies.getDependencies('5', 'credential')).toEqual({
				dependencies: [],
				inaccessibleCount: 0,
			});
		});

		it('keeps a cached entry when the request fails', async () => {
			getResourceDependenciesMock.mockResolvedValueOnce({
				'wf-1': {
					dependencies: [{ type: 'workflowParent', id: 'wf-2', name: 'Parent' }],
					inaccessibleCount: 0,
				},
			});
			const dependencies = useDependencies();
			await dependencies.fetchDependencies(['wf-1'], 'workflow');

			getResourceDependenciesMock.mockRejectedValueOnce(new Error('request failed'));
			await dependencies.fetchDependencies(['wf-1'], 'workflow');

			expect(dependencies.getDependencies('wf-1', 'workflow')?.dependencies).toHaveLength(1);
		});
	});
});

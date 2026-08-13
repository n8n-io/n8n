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
			expect(dependencies.hasDependencies('cred-0')).toBe(true);
			expect(dependencies.hasDependencies('cred-249')).toBe(true);
		});

		it('keeps results from successful batches when another batch fails', async () => {
			const ids = Array.from({ length: 150 }, (_, i) => `cred-${i}`);
			getResourceDependencyCountsMock
				.mockRejectedValueOnce(new Error('request failed'))
				.mockImplementation(async (_context, resourceIds) => countsFor(resourceIds));

			const dependencies = useDependencies();
			await dependencies.fetchDependencyCounts(ids, 'credential');

			expect(dependencies.hasDependencies('cred-0')).toBe(false);
			expect(dependencies.hasDependencies('cred-149')).toBe(true);
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
			expect(dependencies.getDependencies('wf-0')).toEqual({
				dependencies: [],
				inaccessibleCount: 1,
			});
			expect(dependencies.getDependencies('wf-100')).toEqual({
				dependencies: [],
				inaccessibleCount: 1,
			});
		});
	});
});

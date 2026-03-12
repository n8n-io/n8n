import type { DependencyTypeCounts, ResolvedDependency } from '@n8n/api-types';
import { ref } from 'vue';

import * as workflowsApi from '@/app/api/workflows';
import { useRootStore } from '@n8n/stores/useRootStore';

export type { DependencyTypeCounts, ResolvedDependency };

type ResourceType = 'workflow' | 'credentialId' | 'dataTableId';

const dependenciesMap = ref<Record<string, ResolvedDependency[]>>({});
const countsMap = ref<Record<string, DependencyTypeCounts>>({});

export function useDependencies() {
	const rootStore = useRootStore();

	/** Fetch lightweight counts for workflow cards (no name resolution). */
	async function fetchDependencyCounts(workflowIds: string[]): Promise<void> {
		if (workflowIds.length === 0) return;

		try {
			const result = await workflowsApi.getWorkflowDependencyCounts(
				rootStore.restApiContext,
				workflowIds,
			);
			for (const [id, counts] of Object.entries(result)) {
				countsMap.value[id] = counts;
			}
		} catch {
			// Counts are supplementary — silently ignore errors
		}
	}

	/** Fetch full resolved dependencies for any resource type. */
	async function fetchDependencies(
		resourceIds: string[],
		resourceType: ResourceType,
	): Promise<void> {
		if (resourceIds.length === 0) return;

		try {
			const result = await workflowsApi.getResourceDependencies(
				rootStore.restApiContext,
				resourceIds,
				resourceType,
			);
			for (const [id, deps] of Object.entries(result)) {
				dependenciesMap.value[id] = deps;
			}
		} catch {
			// Dependencies are supplementary — silently ignore errors
		}
	}

	function getDependencies(resourceId: string): ResolvedDependency[] | undefined {
		return dependenciesMap.value[resourceId];
	}

	function getDependencyCounts(workflowId: string): DependencyTypeCounts | undefined {
		return countsMap.value[workflowId];
	}

	function getTotalCount(workflowId: string): number {
		const counts = countsMap.value[workflowId];
		if (!counts) return 0;
		return Object.values(counts).reduce((sum, n) => sum + n, 0);
	}

	function hasDependencies(resourceId: string): boolean {
		// Check full deps first, then counts
		const deps = dependenciesMap.value[resourceId];
		if (deps !== undefined) return deps.length > 0;
		return getTotalCount(resourceId) > 0;
	}

	function clearCache(): void {
		dependenciesMap.value = {};
		countsMap.value = {};
	}

	return {
		fetchDependencyCounts,
		fetchDependencies,
		getDependencies,
		getDependencyCounts,
		getTotalCount,
		hasDependencies,
		clearCache,
	};
}

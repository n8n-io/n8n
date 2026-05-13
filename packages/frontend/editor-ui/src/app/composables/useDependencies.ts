import type {
	DependencyResourceType,
	DependencyTypeCounts,
	ResolvedDependenciesResult,
} from '@n8n/api-types';
import { ref } from 'vue';

import * as workflowDependenciesApi from '@/app/api/workflow-dependencies';
import { useRootStore } from '@n8n/stores/useRootStore';

const dependenciesMap = ref<Record<string, ResolvedDependenciesResult>>({});
const countsMap = ref<Record<string, DependencyTypeCounts>>({});

export function useDependencies() {
	const rootStore = useRootStore();

	/** Fetch lightweight dependency counts for resource cards (no name resolution). */
	async function fetchDependencyCounts(
		resourceIds: string[],
		resourceType: DependencyResourceType,
	): Promise<void> {
		if (resourceIds.length === 0) return;

		try {
			const result = await workflowDependenciesApi.getResourceDependencyCounts(
				rootStore.restApiContext,
				resourceIds,
				resourceType,
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
		resourceType: DependencyResourceType,
	): Promise<void> {
		if (resourceIds.length === 0) return;

		try {
			const result = await workflowDependenciesApi.getResourceDependencies(
				rootStore.restApiContext,
				resourceIds,
				resourceType,
			);
			for (const [id, entry] of Object.entries(result)) {
				dependenciesMap.value[id] = entry;
			}
		} catch {
			// Dependencies are supplementary — silently ignore errors
		}
	}

	function getDependencies(resourceId: string): ResolvedDependenciesResult | undefined {
		return dependenciesMap.value[resourceId];
	}

	function getDependencyCounts(resourceId: string): DependencyTypeCounts | undefined {
		return countsMap.value[resourceId];
	}

	function getTotalCount(resourceId: string): number {
		const counts = countsMap.value[resourceId];
		if (!counts) return 0;
		return Object.values(counts).reduce((sum, n) => sum + n, 0);
	}

	function hasDependencies(resourceId: string): boolean {
		// Check full deps first, then counts
		const entry = dependenciesMap.value[resourceId];
		if (entry !== undefined) return entry.dependencies.length > 0 || entry.inaccessibleCount > 0;
		return getTotalCount(resourceId) > 0;
	}

	function clearCache(): void {
		dependenciesMap.value = {};
		countsMap.value = {};
	}

	async function downloadDependencyGraph(): Promise<void> {
		const dot = await workflowDependenciesApi.getDependencyGraphDot(rootStore.restApiContext);
		const blob = new Blob([dot], { type: 'text/vnd.graphviz;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = 'workflow-dependencies.dot';
		link.style.display = 'none';
		document.body.appendChild(link);
		try {
			link.click();
		} finally {
			if (document.body.contains(link)) document.body.removeChild(link);
			URL.revokeObjectURL(url);
		}
	}

	return {
		fetchDependencyCounts,
		fetchDependencies,
		getDependencies,
		getDependencyCounts,
		getTotalCount,
		hasDependencies,
		clearCache,
		downloadDependencyGraph,
	};
}

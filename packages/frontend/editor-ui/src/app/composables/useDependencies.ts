import type { DependencyTypeCounts, ResolvedDependency, WorkflowDependent } from '@n8n/api-types';
import { ref } from 'vue';

import * as workflowsApi from '@/app/api/workflows';
import { useRootStore } from '@n8n/stores/useRootStore';

export type { DependencyTypeCounts, ResolvedDependency, WorkflowDependent };

// Workflow forward-dependency caches
const dependenciesMap = ref<Record<string, ResolvedDependency[]>>({});
const countsMap = ref<Record<string, DependencyTypeCounts>>({});

// Reverse-dependency cache (which workflows use a credential / data table)
const dependentsMap = ref<Record<string, WorkflowDependent[]>>({});

export function useDependencies() {
	const rootStore = useRootStore();

	// ── Workflow forward dependencies ──────────────────────────────────

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

	/** Fetch full resolved dependencies (names, project IDs). */
	async function fetchDependencies(workflowIds: string[]): Promise<void> {
		if (workflowIds.length === 0) return;

		try {
			const result = await workflowsApi.getWorkflowDependencies(
				rootStore.restApiContext,
				workflowIds,
			);
			for (const [id, deps] of Object.entries(result)) {
				dependenciesMap.value[id] = deps;
			}
		} catch {
			// Dependencies are supplementary — silently ignore errors
		}
	}

	function getDependencies(workflowId: string): ResolvedDependency[] | undefined {
		return dependenciesMap.value[workflowId];
	}

	function getDependencyCounts(workflowId: string): DependencyTypeCounts | undefined {
		return countsMap.value[workflowId];
	}

	function getTotalCount(workflowId: string): number {
		const counts = countsMap.value[workflowId];
		if (!counts) return 0;
		return Object.values(counts).reduce((sum, n) => sum + n, 0);
	}

	function hasDependencies(workflowId: string): boolean {
		// Check full deps first, then counts
		const deps = dependenciesMap.value[workflowId];
		if (deps !== undefined) return deps.length > 0;
		return getTotalCount(workflowId) > 0;
	}

	// ── Reverse dependencies (credentials / data tables → workflows) ──

	/** Fetch which workflows depend on the given credentials or data tables. */
	async function fetchDependents(
		resourceIds: string[],
		resourceType: 'credentialId' | 'dataTableId',
	): Promise<void> {
		if (resourceIds.length === 0) return;

		try {
			const result = await workflowsApi.getResourceDependents(
				rootStore.restApiContext,
				resourceIds,
				resourceType,
			);
			for (const [id, deps] of Object.entries(result)) {
				dependentsMap.value[id] = deps;
			}
		} catch {
			// Dependents are supplementary — silently ignore errors
		}
	}

	function getDependents(resourceId: string): WorkflowDependent[] | undefined {
		return dependentsMap.value[resourceId];
	}

	function hasDependents(resourceId: string): boolean {
		const deps = dependentsMap.value[resourceId];
		return deps !== undefined && deps.length > 0;
	}

	// ── Cache management ──────────────────────────────────────────────

	function clearCache(): void {
		dependenciesMap.value = {};
		countsMap.value = {};
		dependentsMap.value = {};
	}

	return {
		fetchDependencyCounts,
		fetchDependencies,
		getDependencies,
		getDependencyCounts,
		getTotalCount,
		hasDependencies,
		fetchDependents,
		getDependents,
		hasDependents,
		clearCache,
	};
}

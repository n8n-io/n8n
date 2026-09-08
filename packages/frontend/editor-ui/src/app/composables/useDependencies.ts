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

// The backend omits resources without dependency rows (and inaccessible ones)
// from its responses, so a missing id means "empty", not "unknown".
const emptyCounts = (): DependencyTypeCounts => ({
	agentUsage: 0,
	credentialId: 0,
	dataTableId: 0,
	errorWorkflow: 0,
	errorWorkflowParent: 0,
	workflowCall: 0,
	workflowParent: 0,
});

// The backend rejects requests with more than 100 resource ids
// (see GetResourceDependencyCountsDto), so batch larger id lists.
const BATCH_SIZE = 100;

function toBatches(resourceIds: string[]): string[][] {
	const batches: string[][] = [];
	for (let i = 0; i < resourceIds.length; i += BATCH_SIZE) {
		batches.push(resourceIds.slice(i, i + BATCH_SIZE));
	}
	return batches;
}

// Overlapping refetches can resolve out of order. Track the newest request per
// resource id, so only that request may write its result to the cache.
let requestCounter = 0;
const countsRequestGeneration: Record<string, number> = {};
const detailsRequestGeneration: Record<string, number> = {};

function claimGeneration(generations: Record<string, number>, ids: string[]): number {
	const generation = ++requestCounter;
	for (const id of ids) generations[id] = generation;
	return generation;
}

export function useDependencies() {
	const rootStore = useRootStore();

	/** Fetch lightweight dependency counts for resource cards (no name resolution). */
	async function fetchDependencyCounts(
		resourceIds: string[],
		resourceType: DependencyResourceType,
	): Promise<void> {
		await Promise.all(
			toBatches(resourceIds).map(async (batch) => {
				const generation = claimGeneration(countsRequestGeneration, batch);
				try {
					const result = await workflowDependenciesApi.getResourceDependencyCounts(
						rootStore.restApiContext,
						batch,
						resourceType,
					);
					// Write every requested id so a stale cache entry clears when the
					// resource no longer appears in the response
					for (const id of batch) {
						if (countsRequestGeneration[id] !== generation) continue; // a newer request owns this id
						countsMap.value[id] = result[id] ?? emptyCounts();
					}
				} catch {
					// Counts are supplementary — silently ignore errors
				}
			}),
		);
	}

	/** Fetch full resolved dependencies for any resource type. */
	async function fetchDependencies(
		resourceIds: string[],
		resourceType: DependencyResourceType,
	): Promise<void> {
		await Promise.all(
			toBatches(resourceIds).map(async (batch) => {
				const generation = claimGeneration(detailsRequestGeneration, batch);
				try {
					const result = await workflowDependenciesApi.getResourceDependencies(
						rootStore.restApiContext,
						batch,
						resourceType,
					);
					// Write every requested id so a stale cache entry clears when the
					// resource no longer appears in the response
					for (const id of batch) {
						if (detailsRequestGeneration[id] !== generation) continue; // a newer request owns this id
						dependenciesMap.value[id] = result[id] ?? { dependencies: [], inaccessibleCount: 0 };
					}
				} catch {
					// Dependencies are supplementary — silently ignore errors
				}
			}),
		);
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

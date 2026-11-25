import { Nf as init_reactivity_esm_bundler, Vf as ref } from "./vendor-Hx42-oQF.js";
import { Fw as makeRestApiRequest, bC as useRootStore } from "./app-D5flEmb-.js";
//#region src/app/api/workflow-dependencies.ts
async function getResourceDependencyCounts(context, resourceIds, resourceType) {
	return await makeRestApiRequest(context, "POST", "/workflow-dependencies/counts", {
		resourceIds,
		resourceType
	});
}
async function getResourceDependencies(context, resourceIds, resourceType) {
	return await makeRestApiRequest(context, "POST", "/workflow-dependencies/details", {
		resourceIds,
		resourceType
	});
}
async function getFolderDependencies(context, projectId, folderId) {
	return await makeRestApiRequest(context, "GET", `/workflow-dependencies/projects/${projectId}/folders/${folderId}`);
}
//#endregion
//#region src/app/composables/useDependencies.ts
init_reactivity_esm_bundler();
var dependenciesMap = ref({});
var countsMap = ref({});
var countsWrittenGeneration = ref({});
var detailsWrittenGeneration = ref({});
var emptyCounts = () => ({
	agentUsage: 0,
	credentialId: 0,
	dataTableId: 0,
	errorWorkflow: 0,
	errorWorkflowParent: 0,
	workflowCall: 0,
	workflowParent: 0
});
var BATCH_SIZE = 100;
function toBatches(resourceIds) {
	const batches = [];
	for (let i = 0; i < resourceIds.length; i += BATCH_SIZE) batches.push(resourceIds.slice(i, i + BATCH_SIZE));
	return batches;
}
var cacheKey = (resourceType, resourceId) => `${resourceType}:${resourceId}`;
var requestCounter = 0;
var countsRequestGeneration = {};
var detailsRequestGeneration = {};
function claimGeneration(generations, keys) {
	const generation = ++requestCounter;
	for (const key of keys) generations[key] = generation;
	return generation;
}
function useDependencies() {
	const rootStore = useRootStore();
	/** Fetch lightweight dependency counts for resource cards (no name resolution). */
	async function fetchDependencyCounts(resourceIds, resourceType) {
		await Promise.all(toBatches(resourceIds).map(async (batch) => {
			const generation = claimGeneration(countsRequestGeneration, batch.map((id) => cacheKey(resourceType, id)));
			try {
				const result = await getResourceDependencyCounts(rootStore.restApiContext, batch, resourceType);
				for (const id of batch) {
					const key = cacheKey(resourceType, id);
					if (countsRequestGeneration[key] !== generation) continue;
					countsMap.value[key] = result[id] ?? emptyCounts();
					countsWrittenGeneration.value[key] = generation;
				}
			} catch {}
		}));
	}
	/** Fetch full resolved dependencies for any resource type. */
	async function fetchDependencies(resourceIds, resourceType) {
		await Promise.all(toBatches(resourceIds).map(async (batch) => {
			const generation = claimGeneration(detailsRequestGeneration, batch.map((id) => cacheKey(resourceType, id)));
			try {
				const result = await getResourceDependencies(rootStore.restApiContext, batch, resourceType);
				for (const id of batch) {
					const key = cacheKey(resourceType, id);
					if (detailsRequestGeneration[key] !== generation) continue;
					dependenciesMap.value[key] = result[id] ?? {
						dependencies: [],
						inaccessibleCount: 0
					};
					detailsWrittenGeneration.value[key] = generation;
				}
			} catch {}
		}));
	}
	/**
	* Resolved dependencies for every workflow inside a folder. Not cached, because the folder's
	* contents change independently of the folder id.
	*/
	async function fetchFolderDependencies(projectId, folderId) {
		try {
			return await getFolderDependencies(rootStore.restApiContext, projectId, folderId);
		} catch {
			return [];
		}
	}
	function getDependencies(resourceId, resourceType) {
		return dependenciesMap.value[cacheKey(resourceType, resourceId)];
	}
	function getDependencyCounts(resourceId, resourceType) {
		return countsMap.value[cacheKey(resourceType, resourceId)];
	}
	function getTotalCount(resourceId, resourceType) {
		const counts = countsMap.value[cacheKey(resourceType, resourceId)];
		if (!counts) return 0;
		return Object.values(counts).reduce((sum, n) => sum + n, 0);
	}
	/** Number of dependencies, from whichever of the cached details and counts is newer. */
	function getDependencyCount(resourceId, resourceType) {
		const key = cacheKey(resourceType, resourceId);
		const details = dependenciesMap.value[key];
		const detailsGeneration = detailsWrittenGeneration.value[key] ?? 0;
		const countsGeneration = countsWrittenGeneration.value[key] ?? 0;
		if (details !== void 0 && detailsGeneration >= countsGeneration) return details.dependencies.length + details.inaccessibleCount;
		return getTotalCount(resourceId, resourceType);
	}
	function hasDependencies(resourceId, resourceType) {
		return getDependencyCount(resourceId, resourceType) > 0;
	}
	function clearCache() {
		dependenciesMap.value = {};
		countsMap.value = {};
		countsWrittenGeneration.value = {};
		detailsWrittenGeneration.value = {};
	}
	return {
		fetchDependencyCounts,
		fetchDependencies,
		fetchFolderDependencies,
		getDependencies,
		getDependencyCounts,
		getTotalCount,
		getDependencyCount,
		hasDependencies,
		clearCache
	};
}
//#endregion
export { useDependencies as t };

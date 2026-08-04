import { useRootStore } from '@n8n/stores/useRootStore';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import {
	fetchCatalogRunsApi,
	fetchCatalogWorkflowsApi,
	runCatalogWorkflowApi,
} from '@/features/catalog/catalog.api';
import type { CatalogEntry, CatalogRun } from '@/features/catalog/catalog.types';
import { CATALOG_STORE } from '@/features/catalog/constants';

export const useCatalogStore = defineStore(CATALOG_STORE, () => {
	const rootStore = useRootStore();

	const workflows = ref<CatalogEntry[]>([]);
	const truncated = ref(false);
	const runs = ref<CatalogRun[]>([]);

	const isEmpty = computed(() => workflows.value.length === 0);

	const fetchWorkflows = async () => {
		const listing = await fetchCatalogWorkflowsApi(rootStore.restApiContext);
		workflows.value = listing.workflows;
		truncated.value = listing.truncated;
	};

	const fetchRuns = async () => {
		const listing = await fetchCatalogRunsApi(rootStore.restApiContext);
		runs.value = listing.runs;
	};

	const run = async (workflowId: string, inputs: Record<string, unknown>) => {
		const result = await runCatalogWorkflowApi(rootStore.restApiContext, workflowId, inputs);
		// Refresh so the run the person just started is in their history.
		await fetchRuns();
		return result;
	};

	return { workflows, truncated, runs, isEmpty, fetchWorkflows, fetchRuns, run };
});

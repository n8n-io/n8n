import { useRootStore } from '@n8n/stores/useRootStore';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import {
	createCatalogSubscriptionApi,
	deleteCatalogSubscriptionApi,
	fetchCatalogRunsApi,
	fetchCatalogSubscriptionsApi,
	fetchCatalogWorkflowsApi,
	runCatalogWorkflowApi,
	updateCatalogSubscriptionApi,
} from '@/features/catalog/catalog.api';
import type {
	CatalogEntry,
	CatalogRun,
	CatalogSubscription,
	CatalogSubscriptionInput,
} from '@/features/catalog/catalog.types';
import { CATALOG_STORE } from '@/features/catalog/constants';

export const useCatalogStore = defineStore(CATALOG_STORE, () => {
	const rootStore = useRootStore();

	const workflows = ref<CatalogEntry[]>([]);
	const truncated = ref(false);
	const runs = ref<CatalogRun[]>([]);
	const subscriptions = ref<CatalogSubscription[]>([]);

	const isEmpty = computed(() => workflows.value.length === 0);

	/** A workflow's own schedules, so a card can say whether it already has one. */
	const subscriptionsByWorkflow = computed(() =>
		subscriptions.value.reduce<Record<string, CatalogSubscription[]>>((byWorkflow, entry) => {
			(byWorkflow[entry.workflowId] ??= []).push(entry);
			return byWorkflow;
		}, {}),
	);

	const fetchWorkflows = async () => {
		const listing = await fetchCatalogWorkflowsApi(rootStore.restApiContext);
		workflows.value = listing.workflows;
		truncated.value = listing.truncated;
	};

	const fetchRuns = async () => {
		const listing = await fetchCatalogRunsApi(rootStore.restApiContext);
		runs.value = listing.runs;
	};

	const fetchSubscriptions = async () => {
		subscriptions.value = await fetchCatalogSubscriptionsApi(rootStore.restApiContext);
	};

	const run = async (workflowId: string, inputs: Record<string, unknown>) => {
		const result = await runCatalogWorkflowApi(rootStore.restApiContext, workflowId, inputs);
		// Refresh so the run the person just started is in their history.
		await fetchRuns();
		return result;
	};

	const subscribe = async (workflowId: string, input: CatalogSubscriptionInput) => {
		const created = await createCatalogSubscriptionApi(rootStore.restApiContext, workflowId, input);
		subscriptions.value = [...subscriptions.value, created];
		return created;
	};

	const updateSubscription = async (subscriptionId: string, input: CatalogSubscriptionInput) => {
		const updated = await updateCatalogSubscriptionApi(
			rootStore.restApiContext,
			subscriptionId,
			input,
		);
		subscriptions.value = subscriptions.value.map((entry) =>
			entry.id === subscriptionId ? updated : entry,
		);
		return updated;
	};

	const unsubscribe = async (subscriptionId: string) => {
		await deleteCatalogSubscriptionApi(rootStore.restApiContext, subscriptionId);
		subscriptions.value = subscriptions.value.filter((entry) => entry.id !== subscriptionId);
	};

	return {
		workflows,
		truncated,
		runs,
		subscriptions,
		subscriptionsByWorkflow,
		isEmpty,
		fetchWorkflows,
		fetchRuns,
		fetchSubscriptions,
		run,
		subscribe,
		updateSubscription,
		unsubscribe,
	};
});

import type {
	CreateWorkflowCheckDto,
	UpdateWorkflowCheckDto,
	WorkflowCheckDto,
	WorkflowCheckTypeDto,
} from '@n8n/api-types';
import { STORES } from '@n8n/stores';
import { useRootStore } from '@n8n/stores/useRootStore';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import {
	createWorkflowCheck,
	deleteWorkflowCheck,
	listWorkflowCheckTypes,
	listWorkflowChecks,
	updateWorkflowCheck,
} from '@/features/workflows/authoringChecks/authoringChecks.api';

export const useWorkflowAuthoringChecksStore = defineStore(STORES.WORKFLOW_AUTHORING_CHECKS, () => {
	const rootStore = useRootStore();

	const instances = ref<WorkflowCheckDto[]>([]);
	const types = ref<WorkflowCheckTypeDto[]>([]);
	const isLoading = ref(false);
	const hasFetched = ref(false);
	const hasFetchedTypes = ref(false);
	const inflight = ref<Promise<void> | null>(null);

	const hasWorkflowChecksEnabled = computed(() => instances.value.some((i) => i.enabled));

	async function fetchInstances() {
		isLoading.value = true;
		try {
			const response = await listWorkflowChecks(rootStore.restApiContext);
			instances.value = response.checks;
			hasFetched.value = true;
		} finally {
			isLoading.value = false;
		}
	}

	async function ensureInstancesLoaded() {
		if (hasFetched.value) return;
		if (!inflight.value) {
			inflight.value = fetchInstances().finally(() => {
				inflight.value = null;
			});
		}
		try {
			await inflight.value;
		} catch {
			// Best-effort: let callers proceed with their default path
		}
	}

	async function fetchTypes() {
		const response = await listWorkflowCheckTypes(rootStore.restApiContext);
		types.value = response.types;
		hasFetchedTypes.value = true;
	}

	async function ensureTypesLoaded() {
		if (hasFetchedTypes.value) return;
		await fetchTypes();
	}

	async function createInstance(payload: CreateWorkflowCheckDto) {
		const created = await createWorkflowCheck(rootStore.restApiContext, payload);
		instances.value = [...instances.value, created];
		return created;
	}

	async function updateInstance(id: string, patch: UpdateWorkflowCheckDto) {
		const updated = await updateWorkflowCheck(rootStore.restApiContext, id, patch);
		const index = instances.value.findIndex((i) => i.id === id);
		if (index !== -1) {
			instances.value.splice(index, 1, updated);
		}
		return updated;
	}

	async function deleteInstance(id: string) {
		await deleteWorkflowCheck(rootStore.restApiContext, id);
		instances.value = instances.value.filter((i) => i.id !== id);
	}

	return {
		instances,
		types,
		isLoading,
		hasWorkflowChecksEnabled,
		fetchInstances,
		ensureInstancesLoaded,
		fetchTypes,
		ensureTypesLoaded,
		createInstance,
		updateInstance,
		deleteInstance,
	};
});

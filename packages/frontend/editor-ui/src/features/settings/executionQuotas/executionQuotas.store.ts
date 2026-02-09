import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import {
	getExecutionQuotas,
	getExecutionQuotaDashboard,
	createExecutionQuota,
	updateExecutionQuota,
	deleteExecutionQuota,
	type ExecutionQuotaConfigResponse,
	type ExecutionQuotaDashboardItem,
	type CreateExecutionQuotaPayload,
	type UpdateExecutionQuotaPayload,
} from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';

export const useExecutionQuotasStore = defineStore('executionQuotas', () => {
	const rootStore = useRootStore();

	const quotas = ref<ExecutionQuotaConfigResponse[]>([]);
	const dashboard = ref<ExecutionQuotaDashboardItem[]>([]);
	const loading = ref(false);

	const isLoading = computed(() => loading.value);
	const quotaCount = computed(() => quotas.value.length);

	async function fetchQuotas(projectId?: string) {
		loading.value = true;
		try {
			quotas.value = await getExecutionQuotas(rootStore.restApiContext, { projectId });
		} finally {
			loading.value = false;
		}
	}

	async function fetchDashboard() {
		loading.value = true;
		try {
			dashboard.value = await getExecutionQuotaDashboard(rootStore.restApiContext);
		} finally {
			loading.value = false;
		}
	}

	async function addQuota(payload: CreateExecutionQuotaPayload) {
		const created = await createExecutionQuota(rootStore.restApiContext, payload);
		quotas.value.push(created);
		return created;
	}

	async function editQuota(id: number, payload: UpdateExecutionQuotaPayload) {
		const updated = await updateExecutionQuota(rootStore.restApiContext, id, payload);
		const index = quotas.value.findIndex((q) => q.id === id);
		if (index !== -1) {
			quotas.value[index] = updated;
		}
		return updated;
	}

	async function removeQuota(id: number) {
		await deleteExecutionQuota(rootStore.restApiContext, id);
		quotas.value = quotas.value.filter((q) => q.id !== id);
	}

	return {
		quotas,
		dashboard,
		isLoading,
		quotaCount,
		fetchQuotas,
		fetchDashboard,
		addQuota,
		editQuota,
		removeQuota,
	};
});

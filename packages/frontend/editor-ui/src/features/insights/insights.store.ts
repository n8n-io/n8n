import { computed } from 'vue';
import { defineStore } from 'pinia';
import { useAsyncState } from '@vueuse/core';
import type { ListInsightsWorkflowQueryDto } from '@n8n/api-types';
import * as insightsApi from '@/features/insights/insights.api';
import { useRootStore } from '@/stores/root.store';
import { useUsersStore } from '@/stores/users.store';
import { transformInsightsSummary } from '@/features/insights/insights.utils';
import { getResourcePermissions } from '@/permissions';

export const useInsightsStore = defineStore('insights', () => {
	const rootStore = useRootStore();
	const usersStore = useUsersStore();

	const globalInsightsPermissions = computed(
		() => getResourcePermissions(usersStore.currentUser?.globalScopes).insights,
	);

	const summary = useAsyncState(
		async () => {
			const raw = await insightsApi.fetchInsightsSummary(rootStore.restApiContext);
			return transformInsightsSummary(raw);
		},
		[],
		{ immediate: false },
	);

	const charts = useAsyncState(
		async () => {
			return await insightsApi.fetchInsightsByTime(rootStore.restApiContext);
		},
		[],
		{ immediate: false },
	);

	const table = useAsyncState(
		async (filter?: ListInsightsWorkflowQueryDto) => {
			return await insightsApi.fetchInsightsByWorkflow(rootStore.restApiContext, filter);
		},
		{
			count: 0,
			data: [],
		},
		{ immediate: false },
	);

	return {
		summary,
		charts,
		table,
		globalInsightsPermissions,
	};
});

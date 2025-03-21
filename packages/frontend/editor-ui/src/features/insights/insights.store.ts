import { computed } from 'vue';
import { defineStore } from 'pinia';
import { useAsyncState } from '@vueuse/core';
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
			if (!globalInsightsPermissions.value.list) {
				return [];
			}

			const raw = await insightsApi.fetchInsightsSummary(rootStore.restApiContext);
			return transformInsightsSummary(raw);
		},
		[],
		{ immediate: false },
	);

	return {
		summary,
		globalInsightsPermissions,
	};
});

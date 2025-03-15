import { defineStore } from 'pinia';
import { useAsyncState } from '@vueuse/core';
import * as insightsApi from '@/features/insights/insights.api';
import { useRootStore } from '@/stores/root.store';
import { transformInsightsSummary } from '@/features/insights/insights.utils';

export const useInsightsStore = defineStore('insights', () => {
	const rootStore = useRootStore();

	const summary = useAsyncState(async () => {
		const raw = await insightsApi.fetchInsightsSummary(rootStore.restApiContext);
		return transformInsightsSummary(raw);
	}, []);

	return {
		summary,
	};
});

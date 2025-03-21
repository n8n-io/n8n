import { computed, reactive } from 'vue';
import { useAsyncState } from '@vueuse/core';
import { useRoute } from 'vue-router';
import { VIEWS } from '@/constants';
import { useInsightsStore } from '@/features/insights/insights.store';

export const useInsights = () => {
	const route = useRoute();
	const insightsStore = useInsightsStore();

	const { state: summaries } = useAsyncState(insightsStore.fetchSummary, [], {
		immediate: true,
	});

	const tabs = computed(() =>
		summaries.value.map((summary) => ({
			...summary,
			to: { name: VIEWS.INSIGHTS, params: { insightType: summary.id }, query: route.query },
		})),
	);

	return reactive({
		summaries,
		tabs,
	});
};

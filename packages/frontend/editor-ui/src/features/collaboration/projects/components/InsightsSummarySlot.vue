<script setup lang="ts">
import { InsightsSummary, useInsightsStore } from '@n8n/frontend-module-insights';
import { onMounted } from 'vue';

const insightsStore = useInsightsStore();

onMounted(() => {
	if (insightsStore.isSummaryEnabled) void insightsStore.weeklySummary.execute();
});
</script>

<template>
	<InsightsSummary
		v-if="insightsStore.isSummaryEnabled"
		:loading="insightsStore.weeklySummary.isLoading"
		:summary="insightsStore.weeklySummary.state"
		time-range="week"
	/>
</template>

<script setup lang="ts">
import { N8nTabs } from '@n8n/design-system';
import type { TabOptions } from '@n8n/design-system';
import { VIEWS } from '@n8n/frontend-constants/views';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';
import { useRoute } from 'vue-router';

import { useInsightsStore } from '../insights.store';
import { INSIGHTS_ASSISTANT_VIEW } from '../insights.views';

const i18n = useI18n();
const route = useRoute();
const insightsStore = useInsightsStore();

const options = computed<Array<TabOptions<string>>>(() => [
	{
		label: i18n.baseText('insights.tabs.workflows'),
		value: VIEWS.INSIGHTS,
		to: { name: VIEWS.INSIGHTS },
	},
	{
		label: i18n.baseText('insights.tabs.assistant'),
		value: INSIGHTS_ASSISTANT_VIEW,
		to: { name: INSIGHTS_ASSISTANT_VIEW },
	},
]);

const selected = computed(() =>
	route.name === INSIGHTS_ASSISTANT_VIEW ? INSIGHTS_ASSISTANT_VIEW : VIEWS.INSIGHTS,
);
</script>

<template>
	<N8nTabs
		v-if="insightsStore.isAssistantUsageEnabled"
		:model-value="selected"
		:options="options"
		data-test-id="insights-tabs"
	/>
</template>

<script setup lang="ts">
import { N8nHeading, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import { useInsightsStore } from '../insights.store';
import InsightsTabs from './InsightsTabs.vue';

const i18n = useI18n();
const insightsStore = useInsightsStore();

// Mention the Assistant only to users who see its tab.
const subtitle = computed(() =>
	i18n.baseText(
		insightsStore.isAssistantUsageEnabled
			? 'insights.dashboard.subtitleWithAssistant'
			: 'insights.dashboard.subtitle',
	),
);
</script>

<template>
	<div :class="$style.header">
		<div :class="$style.titles">
			<N8nHeading bold tag="h2" size="xlarge" :class="$style.title">
				{{ i18n.baseText('insights.dashboard.title') }}
			</N8nHeading>
			<N8nText color="text-light" data-test-id="insights-subtitle">{{ subtitle }}</N8nText>
		</div>
		<InsightsTabs />
	</div>
</template>

<style lang="scss" module>
// The same spacing as the header of the project pages.
.header {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.titles {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	min-height: var(--spacing--3xl);
}

.title {
	display: flex;
	align-items: center;
	min-height: var(--height--md);
}
</style>

<script setup lang="ts">
import { N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

defineProps<{
	metricNames: string[];
}>();

const i18n = useI18n();
</script>

<template>
	<div :class="$style.container" data-test-id="evaluation-improve-message">
		<div :class="$style.header">
			<N8nIcon icon="sparkles" size="small" :class="$style.icon" />
			<N8nText :bold="true" size="small">
				{{ i18n.baseText('evaluation.runDetail.improveWithAI.chatBanner') }}
			</N8nText>
		</div>
		<div v-if="metricNames.length > 0" :class="$style.metrics">
			<N8nText size="small" :class="$style.metricsLabel">
				{{ metricNames.join(', ') }}
			</N8nText>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	background-color: var(--assistant--color--background--user-bubble);
	border-radius: var(--radius--lg);
	padding: var(--spacing--sm);
	margin-top: var(--spacing--sm);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.icon {
	color: var(--color--primary);
}

.metrics {
	padding-left: calc(var(--spacing--3xs) + 16px);
}

.metricsLabel {
	color: var(--color--text--tint-1);
}
</style>

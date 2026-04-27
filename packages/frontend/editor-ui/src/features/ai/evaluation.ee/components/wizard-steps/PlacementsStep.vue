<script setup lang="ts">
import type { EvalMetric } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { N8nIcon, N8nText } from '@n8n/design-system';

defineProps<{
	metrics: EvalMetric[];
}>();

const i18n = useI18n();
</script>

<template>
	<div :class="$style.step">
		<N8nText size="large" tag="h3" bold>
			{{ i18n.baseText('evaluation.wizard.metrics.title') }}
		</N8nText>
		<N8nText size="small" color="text-base">
			{{ i18n.baseText('evaluation.wizard.metrics.description') }}
		</N8nText>
		<ul :class="$style.list" data-test-id="eval-wizard-metrics-list">
			<li v-for="(metric, idx) in metrics" :key="idx" :class="$style.row">
				<N8nIcon icon="circle-check" />
				<div :class="$style.body">
					<N8nText size="small" bold>{{ metric.name }}</N8nText>
					<N8nText v-if="metric.description" size="small" color="text-base">
						{{ metric.description }}
					</N8nText>
				</div>
			</li>
		</ul>
	</div>
</template>

<style module lang="scss">
.step {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.list {
	list-style: none;
	padding: 0;
	margin: 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.row {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs);
	border: var(--border);
	border-radius: var(--radius);
}

.body {
	display: flex;
	flex-direction: column;
}
</style>

<script setup lang="ts">
import { computed } from 'vue';
import type { BaseTextKey } from '@n8n/i18n';
import { useI18n } from '@n8n/i18n';
import { N8nIcon, N8nText } from '@n8n/design-system';
import type { MetricCategory } from '../../evaluation.utils';

const props = defineProps<{
	category: MetricCategory;
}>();

const locale = useI18n();

const labelKey = computed<BaseTextKey>(
	() => `evaluation.runDetail.metricCategory.${props.category}` as BaseTextKey,
);
</script>

<template>
	<span :class="$style.badge" data-test-id="metric-category-badge">
		<N8nIcon icon="circle-check" :class="$style.icon" size="xsmall" />
		<N8nText size="small" :class="$style.label">{{ locale.baseText(labelKey) }}</N8nText>
	</span>
</template>

<style module lang="scss">
.badge {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border-radius: var(--border-radius--base);
	background-color: var(--callout--color--background--success);
	line-height: 1;
}

.icon {
	color: var(--icon-color--success);
}

.label {
	color: var(--text-color--success);
	font-weight: var(--font-weight--medium);
}
</style>

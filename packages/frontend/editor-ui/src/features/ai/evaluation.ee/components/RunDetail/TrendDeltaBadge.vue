<script setup lang="ts">
import { computed } from 'vue';
import { N8nIcon, N8nText } from '@n8n/design-system';
import {
	formatMetricDelta,
	getDeltaTone,
	type DeltaTone,
	type MetricValueFormat,
} from '../../evaluation.utils';

// Render normalized score deltas as percentage points. Render raw custom metric
// deltas as numbers.
const props = defineProps<{
	delta: number | undefined;
	format?: MetricValueFormat;
}>();

const tone = computed<DeltaTone>(() => getDeltaTone(props.delta));
const label = computed(() => formatMetricDelta(props.delta, props.format));
const icon = computed(() => (tone.value === 'negative' ? 'trending-down' : 'trending-up'));
</script>

<template>
	<span
		v-if="tone !== 'default'"
		:class="[$style.badge, $style[tone]]"
		data-test-id="trend-delta-badge"
	>
		<N8nIcon :icon="icon" size="large" />
		<N8nText size="small" :class="$style.label">{{ label }}</N8nText>
	</span>
</template>

<style module lang="scss">
.badge {
	display: inline-flex;
	align-items: center;
	align-self: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border-radius: var(--radius--full);
	line-height: 1;
}

.label {
	font-weight: var(--font-weight--medium);
}

.positive {
	background-color: var(--callout--color--background--success);
	color: var(--text-color--success);
}

.negative {
	background-color: var(--callout--color--background--danger);
	color: var(--text-color--danger);
}
</style>

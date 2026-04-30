<script setup lang="ts">
import { computed } from 'vue';
import { N8nText, N8nTooltip } from '@n8n/design-system';
import { formatMetricPercent, getDeltaTone, type DeltaTone } from '../../evaluation.utils';
import TrendDeltaBadge from './TrendDeltaBadge.vue';

const props = defineProps<{
	name: string;
	currentValue: number | boolean | undefined;
	delta: number | undefined;
}>();

const tone = computed<DeltaTone>(() => getDeltaTone(props.delta));
const formattedValue = computed(() => formatMetricPercent(props.currentValue));
</script>

<template>
	<div :class="$style.card" data-test-id="metric-summary-card">
		<N8nTooltip :content="name" placement="top">
			<N8nText size="small" :class="$style.title">{{ name }}</N8nText>
		</N8nTooltip>
		<div :class="$style.valueRow">
			<span :class="[$style.value, $style[`tone-${tone}`]]">{{ formattedValue }}</span>
			<TrendDeltaBadge :delta="delta" />
		</div>
	</div>
</template>

<style module lang="scss">
.card {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: var(--spacing--md);
	border-right: var(--border-width) var(--border-style) var(--color--foreground);
	flex: 1 1 0;
	min-width: 0;

	&:last-child {
		border-right: none;
	}
}

.title {
	color: var(--color--text);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.valueRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	flex-wrap: wrap;
}

.value {
	font-size: var(--font-size--3xl);
	line-height: 1;
	font-weight: var(--font-weight--bold);
}

.tone-default {
	color: var(--color--text);
}

.tone-positive {
	color: var(--text-color--success);
}

.tone-negative {
	color: var(--text-color--danger);
}
</style>

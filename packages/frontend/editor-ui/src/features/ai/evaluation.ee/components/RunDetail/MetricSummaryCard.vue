<script setup lang="ts">
import { computed } from 'vue';
import { N8nText, N8nTooltip } from '@n8n/design-system';
import {
	formatMetricLabel,
	formatMetricPercent,
	getDeltaTone,
	type DeltaTone,
	type MetricCategory,
} from '../../evaluation.utils';
import MetricCategoryBadge from './MetricCategoryBadge.vue';
import TrendDeltaBadge from './TrendDeltaBadge.vue';

const props = defineProps<{
	name: string;
	currentValue: number | boolean | undefined;
	delta: number | undefined;
	category?: MetricCategory;
	sourceNodeName?: string;
}>();

const tone = computed<DeltaTone>(() => getDeltaTone(props.delta));
const formattedValue = computed(() => formatMetricPercent(props.currentValue));
const formattedLabel = computed(() => formatMetricLabel(props.name));
</script>

<template>
	<div :class="$style.card" data-test-id="metric-summary-card">
		<div :class="$style.titleRow">
			<N8nTooltip :content="sourceNodeName ? `${name} · ${sourceNodeName}` : name" placement="top">
				<N8nText size="small" :class="$style.title">{{ formattedLabel }}</N8nText>
			</N8nTooltip>
			<MetricCategoryBadge v-if="category" :category="category" />
		</div>
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
	padding: var(--spacing--md) var(--spacing--lg);
	border-right: var(--border-width) var(--border-style) var(--color--foreground--tint-2);
	flex: 1 1 0;
	min-width: 0;

	&:last-child {
		border-right: none;
	}
}

.titleRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	flex-wrap: wrap;
	min-width: 0;
}

.title {
	color: var(--color--text);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	min-width: 0;
}

.valueRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	flex-wrap: wrap;
}

.value {
	font-size: 56px;
	line-height: 1;
	font-weight: var(--font-weight--regular);
	letter-spacing: -0.02em;
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

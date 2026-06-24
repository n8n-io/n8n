<script setup lang="ts">
import { computed } from 'vue';
import { N8nText, N8nTooltip } from '@n8n/design-system';
import {
	formatMetricLabel,
	formatMetricPercent,
	formatMetricRawScoreSum,
	getDeltaTone,
	type DeltaTone,
	type MetricCategory,
} from '../../evaluation.utils';
import TrendDeltaBadge from './TrendDeltaBadge.vue';

const props = defineProps<{
	name: string;
	currentValue: number | undefined;
	delta: number | undefined;
	category?: MetricCategory;
	sourceNodeName?: string;
	// Per-case raw values; sum form ("13/15") shows on hover only.
	caseValues?: Array<number | undefined>;
}>();

const tone = computed<DeltaTone>(() => getDeltaTone(props.delta));
const formattedValue = computed(() =>
	formatMetricPercent(props.currentValue, { category: props.category }),
);
const formattedLabel = computed(() => formatMetricLabel(props.name));
const formattedSumScore = computed(() =>
	formatMetricRawScoreSum(props.caseValues ?? [], { category: props.category }),
);
const valueTooltip = computed(() =>
	formattedSumScore.value ? `${formattedValue.value} • ${formattedSumScore.value}` : '',
);
</script>

<template>
	<div :class="$style.card" data-test-id="metric-summary-card">
		<div :class="$style.titleRow">
			<N8nTooltip :content="sourceNodeName ? `${name} · ${sourceNodeName}` : name" placement="top">
				<N8nText size="small" :class="$style.title">{{ formattedLabel }}</N8nText>
			</N8nTooltip>
		</div>
		<div :class="$style.valueRow">
			<N8nTooltip v-if="valueTooltip" :content="valueTooltip" placement="top" :show-after="0">
				<span :class="[$style.value, $style[`tone-${tone}`]]">{{ formattedValue }}</span>
			</N8nTooltip>
			<span v-else :class="[$style.value, $style[`tone-${tone}`]]">{{ formattedValue }}</span>
			<TrendDeltaBadge :delta="delta" :category="category" />
		</div>
	</div>
</template>

<style module lang="scss">
.card {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: var(--spacing--md) var(--spacing--lg);
	border-right: var(--border-width) var(--border-style) var(--color--foreground);
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
	align-items: flex-end;
	gap: var(--spacing--sm);
	flex-wrap: wrap;
}

.value {
	font-size: var(--font-size--2xl);
	line-height: 1;
	font-weight: var(--font-weight--bold);
	letter-spacing: var(--letter-spacing--tight);
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

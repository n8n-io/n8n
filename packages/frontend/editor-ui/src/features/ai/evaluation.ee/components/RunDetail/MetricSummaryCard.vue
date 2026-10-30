<script setup lang="ts">
import { computed } from 'vue';
import type { MetricScale } from '@n8n/api-types';
import { N8nText, N8nTooltip } from '@n8n/design-system';
import {
	formatMetricLabel,
	formatMetricRawScoreSum,
	formatMetricValue,
	formatMetricValueExact,
	getDeltaTone,
	isUnscaledCustomMetric,
	type DeltaTone,
	type MetricCategory,
} from '../../evaluation.utils';
import TrendDeltaBadge from './TrendDeltaBadge.vue';

const props = defineProps<{
	name: string;
	currentValue: number | undefined;
	delta: number | undefined;
	deltaScale?: MetricScale;
	category?: MetricCategory;
	scale?: MetricScale;
	sourceNodeName?: string;
	// Per-case raw values; sum form ("13/15") shows on hover only.
	caseValues?: Array<number | undefined>;
}>();

const tone = computed<DeltaTone>(() => getDeltaTone(props.delta));
const formattedValue = computed(() =>
	formatMetricValue(props.currentValue, {
		key: props.name,
		category: props.category,
		scale: props.scale,
	}),
);
const formattedLabel = computed(() => formatMetricLabel(props.name));
const formattedSumScore = computed(() =>
	!isUnscaledCustomMetric({ key: props.name, category: props.category, scale: props.scale })
		? formatMetricRawScoreSum(props.caseValues ?? [], {
				category: props.category,
				scale: props.scale,
			})
		: '',
);
const exactValue = computed(() =>
	formatMetricValueExact(props.currentValue, {
		key: props.name,
		category: props.category,
		scale: props.scale,
	}),
);
// The card caps long decimals, so keep the exact value one hover away.
const valueTooltip = computed(() =>
	formattedSumScore.value
		? `${formattedValue.value} • ${formattedSumScore.value}`
		: exactValue.value,
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
			<TrendDeltaBadge :delta="delta" :name="name" :category="category" :scale="deltaScale" />
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
	/* Sized by its content, never below the old fixed track. `MetricSummaryStrip`
	   scrolls, so a wide value widens the card instead of overflowing it. */
	flex: 1 0 auto;
	min-width: calc(var(--spacing--4xl) + var(--spacing--3xl));

	&:last-child {
		border-right: none;
	}
}

.titleRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	flex-wrap: nowrap;
	/* Takes its width from the card rather than giving width to it, so a long
	   metric name still ellipsizes instead of stretching the card. */
	width: 0;
	min-width: 100%;
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
	flex-wrap: nowrap;
}

.value {
	font-size: var(--font-size--2xl);
	line-height: 1;
	font-weight: var(--font-weight--medium);
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

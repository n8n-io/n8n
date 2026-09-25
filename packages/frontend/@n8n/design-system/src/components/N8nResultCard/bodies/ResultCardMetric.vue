<script lang="ts" setup>
import { computed } from 'vue';

import N8nIcon from '../../N8nIcon';
import type { MetricCardData, ResultCardSkin } from '../ResultCard.types';

const props = defineProps<{ card: MetricCardData; skin: ResultCardSkin }>();

const breakdown = computed(() => {
	const rows = props.card.breakdown ?? [];
	const max = Math.max(...rows.map((row) => row.value), 0) || 1;
	return rows.map((row) => ({
		...row,
		width: `${Math.round((row.share ?? row.value / max) * 100)}%`,
	}));
});

const sparkline = computed(() => {
	const points = props.card.trend ?? [];
	if (points.length < 2) return null;
	const min = Math.min(...points);
	const max = Math.max(...points);
	const range = max - min || 1;
	const width = 120;
	const height = 32;
	return points
		.map((value, index) => {
			const x = (index / (points.length - 1)) * width;
			const y = height - ((value - min) / range) * (height - 2) - 1;
			return `${x.toFixed(1)},${y.toFixed(1)}`;
		})
		.join(' ');
});

const deltaIcon = computed(() =>
	props.card.delta?.direction === 'up'
		? 'arrow-up'
		: props.card.delta?.direction === 'down'
			? 'arrow-down'
			: null,
);
</script>

<template>
	<div :class="$style.metric">
		<div :class="$style.hero">
			<div>
				<p :class="$style.value">
					{{ card.value }}<span v-if="card.unit" :class="$style.unit">{{ card.unit }}</span>
				</p>
				<p :class="$style.label">{{ card.label }}</p>
				<p v-if="card.delta" :class="[$style.delta, $style[`delta-${card.delta.direction}`]]">
					<N8nIcon v-if="deltaIcon" :icon="deltaIcon" size="xsmall" aria-hidden="true" />
					{{ card.delta.value }}<span v-if="card.delta.label"> {{ card.delta.label }}</span>
				</p>
			</div>
			<svg v-if="sparkline" :class="$style.sparkline" viewBox="0 0 120 32" aria-hidden="true">
				<polyline
					:points="sparkline"
					fill="none"
					stroke="var(--result-card--accent)"
					stroke-width="2"
				/>
			</svg>
		</div>
		<ul v-if="breakdown.length" :class="$style.breakdown">
			<li v-for="(row, index) in breakdown" :key="index" :class="$style.breakdownRow">
				<span :class="$style.breakdownLabel">{{ row.label }}</span>
				<span :class="$style.bar"
					><span :class="$style.barFill" :style="{ width: row.width }"></span
				></span>
				<span :class="$style.breakdownValue">{{ row.value }}</span>
			</li>
		</ul>
	</div>
</template>

<style lang="scss" module>
.metric {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.hero {
	display: flex;
	justify-content: space-between;
	align-items: flex-end;
	gap: var(--spacing--sm);
}

.value {
	margin: 0;
	font-size: var(--font-size--2xl);
	font-weight: var(--font-weight--bold);
	line-height: var(--line-height--xs);
	font-variant-numeric: tabular-nums;
	letter-spacing: var(--letter-spacing--tight, -0.01em);
}

.unit {
	margin-left: var(--spacing--5xs);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	color: var(--text-color--subtle);
}

.label {
	margin: var(--spacing--5xs) 0 0;
	color: var(--text-color--subtle);
}

.delta {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--5xs);
	margin: var(--spacing--5xs) 0 0;
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--medium);
	color: var(--text-color--subtler);
}

.delta-up {
	color: var(--text-color--success);
}

.delta-down {
	color: var(--text-color--danger);
}

.sparkline {
	flex: none;
	width: 120px;
	height: 32px;
	overflow: visible;
}

.breakdown {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	margin: 0;
	padding: 0;
	list-style: none;
}

.breakdownRow {
	display: grid;
	grid-template-columns: minmax(0, 7em) 1fr auto;
	align-items: center;
	gap: var(--spacing--2xs);
	font-size: var(--font-size--2xs);
}

.breakdownLabel {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: var(--text-color--subtle);
}

.bar {
	display: block;
	height: 6px;
	border-radius: var(--radius--full);
	background: var(--background--subtle);
	overflow: hidden;
}

.barFill {
	display: block;
	height: 100%;
	border-radius: inherit;
	background: var(--result-card--accent);
}

.breakdownValue {
	font-variant-numeric: tabular-nums;
	color: var(--text-color--subtle);
}
</style>

<script setup lang="ts">
import { N8nText } from '@n8n/design-system';
import type { ChartData, ChartOptions } from 'chart.js';
import { computed } from 'vue';
import { Doughnut } from 'vue-chartjs';

import type { ToolStat } from '../../schema';
import { cssColor, useToolColor } from '../colors';
import { formatMs, formatNumber, formatPercent, formatTokens } from '../format';

export type ToolMode = 'calls' | 'time' | 'tokens';

const props = defineProps<{ stats: ToolStat[]; mode: ToolMode; title: string }>();
const toolColor = useToolColor();

const valueOf = (stat: ToolStat) =>
	props.mode === 'calls' ? stat.calls : props.mode === 'time' ? stat.timeMs : stat.tokens;
const format = (value: number) =>
	props.mode === 'calls'
		? formatNumber(value)
		: props.mode === 'time'
			? formatMs(value)
			: formatTokens(value);

const slices = computed(() =>
	props.stats
		.map((stat) => ({ tool: stat.tool, value: valueOf(stat) }))
		.filter((slice) => slice.value > 0)
		.sort((a, b) => b.value - a.value),
);
const total = computed(() => slices.value.reduce((sum, slice) => sum + slice.value, 0));

const data = computed<ChartData<'doughnut'>>(() => {
	const colors = slices.value.map((slice) => cssColor(toolColor(slice.tool)));
	return {
		labels: slices.value.map((slice) => slice.tool),
		datasets: [
			{
				data: slices.value.map((slice) => slice.value),
				backgroundColor: colors,
				hoverBackgroundColor: colors,
				borderColor: cssColor('--background--surface'),
			},
		],
	};
});

const options = computed<ChartOptions<'doughnut'>>(() => ({
	responsive: true,
	maintainAspectRatio: false,
	animation: false,
	plugins: {
		legend: {
			position: 'right',
			labels: { color: cssColor('--text-color'), boxWidth: 12 },
		},
		tooltip: {
			callbacks: {
				label: (item) =>
					`${item.label}: ${format(slices.value[item.dataIndex]?.value ?? 0)} (${formatPercent(
						(slices.value[item.dataIndex]?.value ?? 0) / (total.value || 1),
					)})`,
			},
		},
	},
}));
</script>

<template>
	<figure :class="$style.figure">
		<figcaption>
			<N8nText size="small" bold>{{ title }}</N8nText>
			<N8nText size="small" color="text-light"> · total {{ format(total) }}</N8nText>
		</figcaption>
		<div v-if="slices.length" :class="$style.chart">
			<Doughnut :data="data" :options="options" :aria-label="`${title} by tool`" />
		</div>
		<N8nText v-else size="small" color="text-light">No data.</N8nText>
	</figure>
</template>

<style module>
.figure {
	margin: 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.chart {
	position: relative;
	height: var(--spacing--5xl);
}
</style>

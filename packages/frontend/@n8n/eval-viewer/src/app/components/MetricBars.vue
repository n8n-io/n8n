<script setup lang="ts">
import { N8nText } from '@n8n/design-system';
import type { ChartData, ChartOptions } from 'chart.js';
import { computed } from 'vue';
import { Bar } from 'vue-chartjs';

import { armColorVar, cssColor } from '../colors';
import type { MetricRow } from '../comparison';

const props = defineProps<{ armNames: string[]; rows: MetricRow[] }>();

const charts = computed(() =>
	props.rows.map((row) => {
		const colors = props.armNames.map((_, arm) => cssColor(armColorVar(arm)));
		const data: ChartData<'bar'> = {
			labels: props.armNames,
			datasets: [
				{
					label: row.label,
					data: row.values.map((value) => (value === null ? 0 : row.isRate ? value * 100 : value)),
					backgroundColor: colors,
					hoverBackgroundColor: colors,
				},
			],
		};
		const options: ChartOptions<'bar'> = {
			indexAxis: 'y',
			responsive: true,
			maintainAspectRatio: false,
			animation: false,
			plugins: {
				legend: { display: false },
				tooltip: { callbacks: { label: (item) => row.texts[item.dataIndex] ?? '' } },
			},
			scales: {
				x: {
					beginAtZero: true,
					max: row.isRate ? 100 : undefined,
					ticks: {
						color: cssColor('--text-color--subtle'),
						// Chart.js names this option `callback`.
						// eslint-disable-next-line id-denylist
						callback(value) {
							return row.isRate ? value : row.format(Number(value));
						},
					},
				},
				y: { ticks: { color: cssColor('--text-color') } },
			},
		};
		return { row, data, options };
	}),
);
</script>

<template>
	<div :class="$style.grid">
		<figure v-for="chart in charts" :key="chart.row.id" :class="$style.figure">
			<figcaption>
				<N8nText size="small" bold>{{ chart.row.label }}</N8nText>
				<N8nText size="xsmall" color="text-light"> · {{ chart.row.texts.join(' vs ') }}</N8nText>
			</figcaption>
			<div :class="$style.chart">
				<Bar :data="chart.data" :options="chart.options" :aria-label="chart.row.label" />
			</div>
		</figure>
	</div>
</template>

<style module>
.grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(var(--spacing--5xl), 1fr));
	gap: var(--spacing--md);
}

.figure {
	margin: 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.chart {
	position: relative;
	height: var(--spacing--4xl);
}
</style>

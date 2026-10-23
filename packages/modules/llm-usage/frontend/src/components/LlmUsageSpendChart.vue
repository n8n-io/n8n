<script setup lang="ts">
import type { LlmUsageDay } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { useCssVar } from '@vueuse/core';
import type { ChartData, ChartOptions } from 'chart.js';
import { computed } from 'vue';
import { Bar } from 'vue-chartjs';

import { formatCount, formatUsd, formatUtcDay } from '../llm-usage.format';

const props = defineProps<{ daily: LlmUsageDay[]; days: number }>();

const i18n = useI18n();
const colorBar = useCssVar('--background--brand', document.body);
const colorText = useCssVar('--text-color--subtler', document.body);
const colorGrid = useCssVar('--border-color--subtle', document.body);

/** One day in milliseconds. */
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Every UTC day of the range, so days without calls show as gaps. The range is the last
 * `days` times 24 hours, so it touches `days + 1` dates: the first and the last are partial.
 */
const series = computed(() => {
	const byDate = new Map(props.daily.map((day) => [day.date, day]));
	const today = Date.now();
	return Array.from({ length: props.days + 1 }, (_, index) => {
		const date = new Date(today - (props.days - index) * DAY_MS).toISOString().slice(0, 10);
		return byDate.get(date) ?? { date, calls: 0, costUsd: 0 };
	});
});

const chartData = computed<ChartData<'bar'>>(() => ({
	labels: series.value.map(({ date }) => formatUtcDay(date)),
	datasets: [
		{
			label: i18n.baseText('settings.llmUsage.chart.title'),
			data: series.value.map(({ costUsd }) => costUsd),
			backgroundColor: colorBar.value,
			// chart.js takes sizes as pixel numbers, so no design token applies here or below.
			borderRadius: 2,
			maxBarThickness: 24,
		},
	],
}));

const chartOptions = computed<ChartOptions<'bar'>>(() => ({
	responsive: true,
	maintainAspectRatio: false,
	animation: false,
	plugins: {
		legend: { display: false },
		tooltip: {
			displayColors: false,
			callbacks: {
				label: (context) => formatUsd(context.parsed.y),
				afterLabel: (context) => {
					const { calls } = series.value[context.dataIndex];
					return i18n.baseText('settings.llmUsage.callCount', {
						adjustToNumber: calls,
						interpolate: { count: formatCount(calls) },
					});
				},
			},
		},
	},
	scales: {
		x: {
			grid: { display: false },
			ticks: { color: colorText.value, maxRotation: 0, autoSkipPadding: 12 },
		},
		y: {
			beginAtZero: true,
			border: { display: false },
			grid: { color: colorGrid.value },
			ticks: {
				color: colorText.value,
				maxTicksLimit: 5,
				format: { style: 'currency', currency: 'USD', maximumFractionDigits: 4 },
			},
		},
	},
}));
</script>

<template>
	<div :class="$style.chart" data-test-id="llm-usage-spend-chart">
		<Bar :data="chartData" :options="chartOptions" />
	</div>
</template>

<style lang="scss" module>
.chart {
	/* A canvas chart needs a fixed height; no size token fits a chart area. */
	height: 14rem;
}
</style>

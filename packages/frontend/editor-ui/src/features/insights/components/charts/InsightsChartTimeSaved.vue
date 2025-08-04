<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import {
	generateLinearGradient,
	generateLineChartOptions,
} from '@/features/insights/chartjs.utils';
import { transformInsightsTimeSaved } from '@/features/insights/insights.utils';

import {
	GRANULARITY_DATE_FORMAT_MASK,
	INSIGHTS_UNIT_MAPPING,
} from '@/features/insights/insights.constants';
import { type ChartData, Filler, type ScriptableContext } from 'chart.js';
import { computed } from 'vue';
import { Line } from 'vue-chartjs';

import type { ChartProps } from './insightChartProps';

const props = defineProps<ChartProps>();
const i18n = useI18n();

const chartOptions = computed(() =>
	generateLineChartOptions({
		plugins: {
			tooltip: {
				callbacks: {
					label: (context) => {
						const label = context.dataset.label ?? '';
						const value = Number(context.parsed.y);
						return `${label} ${transformInsightsTimeSaved(value).toLocaleString('en-US')}${INSIGHTS_UNIT_MAPPING[props.type](value)}`;
					},
				},
			},
		},
		scales: {
			y: {
				ticks: {
					// eslint-disable-next-line id-denylist
					callback(tickValue) {
						return transformInsightsTimeSaved(Number(tickValue));
					},
				},
			},
		},
	}),
);

const chartData = computed<ChartData<'line'>>(() => {
	const labels: string[] = [];
	const data: number[] = [];

	for (const entry of props.data) {
		labels.push(GRANULARITY_DATE_FORMAT_MASK[props.granularity](entry.date));
		data.push(entry.values.timeSaved);
	}

	return {
		labels,
		datasets: [
			{
				label: i18n.baseText('insights.banner.title.timeSaved'),
				data,
				fill: 'origin',
				cubicInterpolationMode: 'monotone' as const,
				backgroundColor: (ctx: ScriptableContext<'line'>) =>
					generateLinearGradient(ctx.chart.ctx, 292),
				borderColor: 'rgba(255, 64, 39, 1)',
			},
		],
	};
});
</script>

<template>
	<Line
		data-test-id="insights-chart-time-saved"
		:data="chartData"
		:options="chartOptions"
		:plugins="[Filler]"
	/>
</template>

<style lang="scss" module></style>

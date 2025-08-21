<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import {
	generateLinearGradient,
	generateLineChartOptions,
} from '@/features/insights/chartjs.utils';
import {
	GRANULARITY_DATE_FORMAT_MASK,
	INSIGHTS_UNIT_MAPPING,
} from '@/features/insights/insights.constants';
import { transformInsightsAverageRunTime } from '@/features/insights/insights.utils';
import { smartDecimal } from '@n8n/utils/number/smartDecimal';
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
						return `${label} ${smartDecimal(context.parsed.y)}${INSIGHTS_UNIT_MAPPING[props.type](context.parsed.y)}`;
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

		const value = transformInsightsAverageRunTime(entry.values.averageRunTime);

		data.push(value);
	}

	return {
		labels,
		datasets: [
			{
				label: i18n.baseText('insights.banner.title.averageRunTime'),
				data,
				cubicInterpolationMode: 'monotone' as const,
				fill: 'origin',
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
		data-test-id="insights-chart-average-runtime"
		:data="chartData"
		:options="chartOptions"
		:plugins="[Filler]"
	/>
</template>

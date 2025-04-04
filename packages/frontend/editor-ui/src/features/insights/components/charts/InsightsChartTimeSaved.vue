<script lang="ts" setup>
import { useI18n } from '@/composables/useI18n';
import {
	generateLinearGradient,
	generateLineChartOptions,
} from '@/features/insights/chartjs.utils';
import { transformInsightsTimeSaved } from '@/features/insights/insights.utils';

import { DATE_FORMAT_MASK, INSIGHTS_UNIT_MAPPING } from '@/features/insights/insights.constants';
import type { InsightsByTime, InsightsSummaryType } from '@n8n/api-types';
import { type ChartData, Filler, type ScriptableContext } from 'chart.js';
import dateformat from 'dateformat';
import { computed } from 'vue';
import { Line } from 'vue-chartjs';

const props = defineProps<{
	data: InsightsByTime[];
	type: InsightsSummaryType;
}>();

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
		labels.push(dateformat(entry.date, DATE_FORMAT_MASK));
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
	<Line :data="chartData" :options="chartOptions" :plugins="[Filler]" />
</template>

<style lang="scss" module></style>

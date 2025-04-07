<script lang="ts" setup>
import { computed } from 'vue';
import { Line } from 'vue-chartjs';
import { type ScriptableContext, type ChartData, Filler } from 'chart.js';
import dateformat from 'dateformat';
import type { InsightsByTime, InsightsSummaryType } from '@n8n/api-types';
import {
	generateLinearGradient,
	generateLineChartOptions,
} from '@/features/insights/chartjs.utils';
import { useI18n } from '@/composables/useI18n';
import { transformInsightsTimeSaved } from '@/features/insights/insights.utils';
import { smartDecimal } from '@n8n/utils/number/smartDecimal';
import { INSIGHTS_UNIT_MAPPING } from '@/features/insights/insights.constants';

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
						return `${label} ${smartDecimal(context.parsed.y)}${INSIGHTS_UNIT_MAPPING[props.type]}`;
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
		labels.push(dateformat(entry.date, 'd. mmm'));
		const timeSaved = transformInsightsTimeSaved(entry.values.timeSaved);
		data.push(timeSaved);
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

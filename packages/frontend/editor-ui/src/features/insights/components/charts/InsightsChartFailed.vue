<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import { generateBarChartOptions } from '@/features/insights/chartjs.utils';
import { GRANULARITY_DATE_FORMAT_MASK } from '@/features/insights/insights.constants';
import { smartDecimal } from '@n8n/utils/number/smartDecimal';
import { useCssVar } from '@vueuse/core';
import type { ChartData } from 'chart.js';
import { computed } from 'vue';
import { Bar } from 'vue-chartjs';

import type { ChartProps } from './insightChartProps';

const props = defineProps<ChartProps>();

const i18n = useI18n();

const colorPrimary = useCssVar('--color-primary', document.body);
const chartOptions = computed(() =>
	generateBarChartOptions({
		plugins: {
			tooltip: {
				callbacks: {
					label: (context) => {
						const label = context.dataset.label ?? '';
						return `${label} ${smartDecimal(context.parsed.y)}`;
					},
				},
			},
		},
	}),
);

const chartData = computed<ChartData<'bar'>>(() => {
	const labels: string[] = [];
	const data: number[] = [];

	for (const entry of props.data) {
		labels.push(GRANULARITY_DATE_FORMAT_MASK[props.granularity](entry.date));
		data.push(entry.values.failed);
	}

	return {
		labels,
		datasets: [
			{
				label: i18n.baseText('insights.chart.failed'),
				data,
				backgroundColor: colorPrimary.value,
			},
		],
	};
});
</script>

<template>
	<Bar data-test-id="insights-chart-failed" :data="chartData" :options="chartOptions" />
</template>

<style lang="scss" module></style>

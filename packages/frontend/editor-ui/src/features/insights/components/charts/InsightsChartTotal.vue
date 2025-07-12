<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import { generateBarChartOptions } from '@/features/insights/chartjs.utils';
import { GRANULARITY_DATE_FORMAT_MASK } from '@/features/insights/insights.constants';
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
				itemSort: (a) => (a.dataset.label === i18n.baseText('insights.chart.succeeded') ? -1 : 1),
			},
		},
	}),
);

const chartData = computed<ChartData<'bar'>>(() => {
	const labels: string[] = [];
	const succeededData: number[] = [];
	const failedData: number[] = [];

	for (const entry of props.data) {
		labels.push(GRANULARITY_DATE_FORMAT_MASK[props.granularity](entry.date));
		succeededData.push(entry.values.succeeded);
		failedData.push(entry.values.failed);
	}

	return {
		labels,
		datasets: [
			{
				label: i18n.baseText('insights.chart.failed'),
				data: failedData,
				backgroundColor: colorPrimary.value,
			},
			{
				label: i18n.baseText('insights.chart.succeeded'),
				data: succeededData,
				backgroundColor: '#3E999F',
			},
		],
	};
});
</script>

<template>
	<Bar data-test-id="insights-chart-total" :data="chartData" :options="chartOptions" />
</template>

<style lang="scss" module></style>
